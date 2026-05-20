import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { TrashList } from './_components/trash-list';

export const metadata = { title: 'Papelera — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

export default async function PapeleraPage() {
  await requireAdmin();
  const [entities, categories, documents, users] = await Promise.all([
    prisma.entity.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      select: { id: true, name: true, deletedAt: true },
    }),
    prisma.category.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: { entity: { select: { name: true } } },
    }),
    prisma.document.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
      include: { entity: { select: { name: true } }, category: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { deletedAt: { not: null } },
      orderBy: { deletedAt: 'desc' },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Papelera</h1>
        <p className="text-sm text-muted-foreground">
          Elementos eliminados (soft delete). Solo admin puede restaurar.
        </p>
      </div>
      <TrashList
        entities={entities.map((e) => ({ id: e.id, name: e.name, deletedAt: e.deletedAt!.toISOString() }))}
        categories={categories.map((c) => ({
          id: c.id,
          name: c.name,
          entityName: c.entity.name,
          deletedAt: c.deletedAt!.toISOString(),
        }))}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          entityName: d.entity.name,
          categoryName: d.category.name,
          deletedAt: d.deletedAt!.toISOString(),
        }))}
        users={users.map((u) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          deletedAt: u.deletedAt!.toISOString(),
        }))}
      />
    </div>
  );
}
