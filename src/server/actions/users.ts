'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { generateToken, hashToken } from '@/lib/auth/tokens';
import { recordAudit } from '@/lib/audit/log';
import { passwordResetTemplate, sendEmail } from '@/lib/email/resend';

export type ActionResult = { ok: true } | { ok: false; error: string };

const createSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/, 'Solo letras, números, ., _ y -'),
  email: z.string().email(),
  role: z.nativeEnum(Role),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
});

const updateSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  username: z.string().trim().min(3).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  email: z.string().email(),
  role: z.nativeEnum(Role),
});

export async function createUser(formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = createSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    username: formData.get('username'),
    email: formData.get('email'),
    role: formData.get('role'),
    password: formData.get('password'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  try {
    const passwordHash = await hashPassword(parsed.data.password);
    const user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          firstName: parsed.data.firstName,
          lastName: parsed.data.lastName,
          username: parsed.data.username,
          email: parsed.data.email,
          role: parsed.data.role,
          passwordHash,
          createdById: me.id,
        },
      });
      await recordAudit(
        {
          actorId: me.id,
          action: 'CREATE',
          entityType: 'User',
          entityId: u.id,
          after: { username: u.username, email: u.email, role: u.role },
        },
        tx,
      );
      return u;
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Usuario o email ya en uso' };
    return { ok: false, error: 'Error al crear el usuario' };
  }
}

export async function updateUser(id: string, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = updateSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    username: formData.get('username'),
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const before = await prisma.user.findUnique({ where: { id } });
  if (!before) return { ok: false, error: 'Usuario no encontrado' };
  if (before.id === me.id && parsed.data.role !== before.role) {
    return { ok: false, error: 'No podés cambiar tu propio rol' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: parsed.data });
      await recordAudit(
        {
          actorId: me.id,
          action: 'UPDATE',
          entityType: 'User',
          entityId: id,
          before: {
            username: before.username,
            email: before.email,
            role: before.role,
            firstName: before.firstName,
            lastName: before.lastName,
          },
          after: parsed.data,
        },
        tx,
      );
    });
    revalidatePath('/usuarios');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Usuario o email ya en uso' };
    return { ok: false, error: 'Error al actualizar el usuario' };
  }
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (id === me.id) return { ok: false, error: 'No podés eliminarte a vos mismo' };
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return { ok: false, error: 'Usuario no encontrado' };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { deletedAt: new Date() } });
    await tx.session.deleteMany({ where: { userId: id } });
    await recordAudit(
      { actorId: me.id, action: 'DELETE', entityType: 'User', entityId: id, before: { username: user.username, email: user.email } },
      tx,
    );
  });
  revalidatePath('/usuarios');
  return { ok: true };
}

export async function restoreUser(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.deletedAt) return { ok: false, error: 'No hay nada que restaurar' };
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id }, data: { deletedAt: null } });
    await recordAudit({ actorId: me.id, action: 'RESTORE', entityType: 'User', entityId: id, after: { username: user.username } }, tx);
  });
  revalidatePath('/usuarios');
  revalidatePath('/papelera');
  return { ok: true };
}

export async function sendResetLinkForUser(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || user.deletedAt) return { ok: false, error: 'Usuario no encontrado' };

  const raw = generateToken(32);
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { tokenHash, userId: id, expiresAt } });

  const link = `${process.env.APP_URL ?? ''}/reset-password/${raw}`;
  const tpl = passwordResetTemplate(link, user.firstName);
  const res = await sendEmail({ to: user.email, ...tpl });
  await recordAudit({ actorId: me.id, action: 'RESET_REQUEST', entityType: 'User', entityId: id });
  if (!res.ok && res.reason !== 'not_configured') {
    return { ok: false, error: 'Token creado pero no se pudo enviar el email' };
  }
  return { ok: true };
}
