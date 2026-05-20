import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { generateToken, hashToken } from '@/lib/auth/tokens';

export const SESSION_COOKIE = 'reporamallo_session';
const SESSION_TTL_DAYS = 7;
const SESSION_SLIDE_THRESHOLD_DAYS = 1;

export type SessionUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'GESTOR';
};

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export async function createSession(userId: string): Promise<{ raw: string; expiresAt: Date }> {
  const raw = generateToken(32);
  const id = hashToken(raw);
  const expiresAt = daysFromNow(SESSION_TTL_DAYS);
  await prisma.session.create({ data: { id, userId, expiresAt } });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return { raw, expiresAt };
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    const id = hashToken(raw);
    await prisma.session.deleteMany({ where: { id } });
  }
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const id = hashToken(raw);

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id } }).catch(() => undefined);
    return null;
  }
  if (session.user.deletedAt) return null;

  const remainingDays = (session.expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
  if (remainingDays < SESSION_TTL_DAYS - SESSION_SLIDE_THRESHOLD_DAYS) {
    const newExp = daysFromNow(SESSION_TTL_DAYS);
    await prisma.session.update({ where: { id }, data: { expiresAt: newExp } });
    jar.set(SESSION_COOKIE, raw, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: newExp,
    });
  }

  const u = session.user;
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    role: u.role,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new Error('UNAUTHORIZED');
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== 'ADMIN') throw new Error('FORBIDDEN');
  return user;
}
