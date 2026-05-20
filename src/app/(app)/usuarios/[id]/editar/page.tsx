import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { UserForm } from '../../_components/user-form';

export const metadata = { title: 'Editar usuario — Repositorio Ramallo' };

export default async function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar usuario</h1>
        <p className="text-sm text-muted-foreground">Modificá datos y rol. La contraseña se cambia vía reset.</p>
      </div>
      <UserForm
        mode="edit"
        defaults={{
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          email: u.email,
          role: u.role,
        }}
      />
    </div>
  );
}
