import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { UsersTable } from './_components/users-table';

export const metadata = { title: 'Usuarios — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

export default async function UsuariosPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    include: { createdBy: { select: { username: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">Administración de usuarios del sistema.</p>
        </div>
        <Button asChild>
          <Link href="/usuarios/nuevo">
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Link>
        </Button>
      </div>
      <UsersTable
        rows={users.map((u) => ({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          createdBy: u.createdBy?.username ?? null,
        }))}
      />
    </div>
  );
}
