import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { DocumentsTable } from './_components/documents-table';

export const metadata = { title: 'Documentos — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

type Props = { searchParams: Promise<{ q?: string; entityId?: string; categoryId?: string; from?: string; to?: string }> };

export default async function DocumentosPage({ searchParams }: Props) {
  await requireUser();
  const sp = await searchParams;
  const q = (sp.q ?? '').trim();
  const where: any = { deletedAt: null };
  if (sp.entityId) where.entityId = sp.entityId;
  if (sp.categoryId) where.categoryId = sp.categoryId;
  if (sp.from || sp.to) {
    where.contentDate = {};
    if (sp.from) where.contentDate.gte = new Date(sp.from);
    if (sp.to) where.contentDate.lte = new Date(sp.to);
  }
  if (q) {
    where.OR = [
      { title: { contains: q } },
      { extract: { contains: q } },
      { contentText: { contains: q } },
    ];
  }

  const [docs, entities] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        entity: { select: { name: true } },
        category: { select: { name: true } },
        uploadedBy: { select: { firstName: true, lastName: true } },
        updatedBy: { select: { firstName: true, lastName: true } },
      },
      take: 200,
    }),
    prisma.entity.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { categories: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
    }),
  ]);

  const rows = docs.map((d) => ({
    id: d.id,
    title: d.title,
    entityName: d.entity.name,
    categoryName: d.category.name,
    contentDate: d.contentDate.toISOString(),
    uploadedBy: `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    updatedBy: d.updatedBy ? `${d.updatedBy.firstName} ${d.updatedBy.lastName}` : null,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Documentos</h1>
          <p className="text-sm text-muted-foreground">
            Listado de documentos almacenados. Usá los filtros y la búsqueda para acotar resultados.
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
