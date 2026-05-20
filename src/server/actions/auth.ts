'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession, getSessionUser } from '@/lib/auth/session';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { recordAudit } from '@/lib/audit/log';
import { passwordResetTemplate, sendEmail } from '@/lib/email/resend';

export type ActionResult = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({
  identifier: z.string().min(1, 'Ingresá tu usuario o email'),
  password: z.string().min(1, 'Ingresá tu contraseña'),
});

export async function loginAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = loginSchema.safeParse({
    identifier: formData.get('identifier'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };
  }
  const { identifier, password } = parsed.data;

  const user = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      OR: [{ email: identifier }, { username: identifier }],
    },
  });
  if (!user) return { ok: false, error: 'Credenciales inválidas' };

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) return { ok: false, error: 'Credenciales inválidas' };

  await createSession(user.id);
  await recordAudit({ actorId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id });

  redirect('/documentos');
}

export async function logoutAction(): Promise<void> {
  const current = await getSessionUser();
  if (current) {
    await recordAudit({ actorId: current.id, action: 'LOGOUT', entityType: 'User', entityId: current.id });
  }
  await destroySession();
  redirect('/login');
}

const forgotSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function forgotPasswordAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Email inválido' };
  const { email } = parsed.data;

  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  // No revelar si el email existe o no
  if (!user) return { ok: true };

  const raw = generateToken(32);
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

  await prisma.passwordResetToken.create({
    data: { tokenHash, userId: user.id, expiresAt },
  });

  const link = `${process.env.APP_URL ?? ''}/reset-password/${raw}`;
  const tpl = passwordResetTemplate(link, user.firstName);
  await sendEmail({ to: user.email, ...tpl });
  await recordAudit({ actorId: user.id, action: 'RESET_REQUEST', entityType: 'User', entityId: user.id });

  return { ok: true };
}

const resetSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'No coinciden' });

export async function resetPasswordAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const parsed = resetSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const tokenHash = hashToken(parsed.data.token);
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { ok: false, error: 'El enlace expiró o ya fue usado' };
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.passwordResetToken.update({ where: { tokenHash }, data: { usedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: record.userId } });
    await recordAudit(
      { actorId: record.userId, action: 'RESET_COMPLETE', entityType: 'User', entityId: record.userId },
      tx,
    );
  });

  return { ok: true };
}

const profileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  username: z.string().min(3),
});

export async function updateProfileAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: 'No autenticado' };
  const parsed = profileSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
    username: formData.get('username'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const before = { firstName: me.firstName, lastName: me.lastName, email: me.email, username: me.username };
  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: me.id }, data: parsed.data });
      await recordAudit(
        { actorId: me.id, action: 'UPDATE', entityType: 'User', entityId: me.id, before, after: parsed.data },
        tx,
      );
    });
  } catch (e) {
    return { ok: false, error: 'Email o usuario ya en uso' };
  }
  return { ok: true };
}

const changePasswordSchema = z
  .object({
    current: z.string().min(1),
    next: z.string().min(8, 'Mínimo 8 caracteres'),
    confirm: z.string().min(8),
  })
  .refine((v) => v.next === v.confirm, { path: ['confirm'], message: 'No coinciden' });

export async function changePasswordAction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await getSessionUser();
  if (!me) return { ok: false, error: 'No autenticado' };
  const parsed = changePasswordSchema.safeParse({
    current: formData.get('current'),
    next: formData.get('next'),
    confirm: formData.get('confirm'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const user = await prisma.user.findUnique({ where: { id: me.id } });
  if (!user) return { ok: false, error: 'No autenticado' };
  const ok = await verifyPassword(user.passwordHash, parsed.data.current);
  if (!ok) return { ok: false, error: 'Contraseña actual incorrecta' };

  const passwordHash = await hashPassword(parsed.data.next);
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash } });
  await recordAudit({ actorId: me.id, action: 'UPDATE', entityType: 'User.password', entityId: me.id });
  return { ok: true };
}
