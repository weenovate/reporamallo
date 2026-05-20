import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { searchDocuments } from '@/lib/search/search';
import { DocumentsTable } from './_components/documents-table';

export const metadata = { title: 'Documentos — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; entityId?: string; categoryId?: string; from?: string; to?: string }> };

export default async function DocumentosPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();

  const [result, entities] = await Promise.all([
    searchDocuments({
      q,
      entityId: sp.entityId,
      categoryId: sp.categoryId,
      from: sp.from,
      to: sp.to,
      limit: 200,
    }),
    prisma.entity.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { categories: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
    }),
  ]);

  // Para mostrar fecha de subida y ultima modificacion necesitamos datos no indexados
  const meta = await prisma.document.findMany({
    where: { id: { in: result.hits.map((h) => h.id) } },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      uploadedBy: { select: { firstName: true, lastName: true } },
      updatedBy: { select: { firstName: true, lastName: true } },
    },
  });
  const metaById = new Map(meta.map((m) => [m.id, m]));

  const rows = result.hits.map((d) => {
    const m = metaById.get(d.id);
    return {
      id: d.id,
      title: d.title,
      entityName: d.entityName,
      categoryName: d.categoryName,
      contentDate: d.contentDate,
      uploadedBy: m ? `${m.uploadedBy.firstName} ${m.uploadedBy.lastName}` : '—',
      createdAt: m?.createdAt.toISOString() ?? d.createdAt,
      updatedAt: m?.updatedAt.toISOString() ?? d.createdAt,
      updatedBy: m?.updatedBy ? `${m.updatedBy.firstName} ${m.updatedBy.lastName}` : null,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            {result.total} resultado(s) {result.source === 'meilisearch' ? '· búsqueda full-text Meilisearch' : '· búsqueda básica MySQL'}
          </p>
        </div>
        <Button asChild>
          <Link href="/documentos/nuevo">
            <Plus className="h-4 w-4" /> Nuevo documento
          </Link>
        </Button>
      </div>
      <DocumentsTable rows={rows} entities={entities} initial={{ q, entityId: sp.entityId, categoryId: sp.categoryId, from: sp.from, to: sp.to }} />
    </div>
  );
}
