import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { EntityManager } from './_components/entity-manager';

export const metadata = { title: 'Entidades — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string }> };

export default async function EntidadesPage({ searchParams }: Props) {
  await requireUser();
  const { q } = await searchParams;
  const search = (q ?? '').trim();

  const entities = await prisma.entity.findMany({
    where: {
      deletedAt: null,
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: { name: 'asc' },
    include: {
      categories: {
        where: { deletedAt: null },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { documents: { where: { deletedAt: null } } } },
        },
      },
      _count: { select: { documents: { where: { deletedAt: null } } } },
    },
  });

  const data = entities.map((e) => ({
    id: e.id,
    name: e.name,
    documentCount: e._count.documents,
    categories: e.categories.map((c) => ({
      id: c.id,
      name: c.name,
      documentCount: c._count.documents,
    })),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Entidades</h1>
          <p className="text-sm text-muted-foreground">
            Administrá las entidades y sus categorías. Las eliminaciones requieren confirmación.
          </p>
        </div>
      </div>
      <EntityManager entities={data} initialSearch={search} />
    </div>
  );
}
