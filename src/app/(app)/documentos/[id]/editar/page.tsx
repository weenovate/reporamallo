import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { DocumentForm } from '../../_components/document-form';

export const metadata = { title: 'Editar documento — Repositorio Ramallo' };

export default async function EditarDocumentoPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [doc, entities] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { tags: { include: { tag: true } } },
    }),
    prisma.entity.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { categories: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
    }),
  ]);

  if (!doc || doc.deletedAt) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Editar documento</h1>
        <p className="text-sm text-muted-foreground">Modificá los datos. El archivo se puede reemplazar opcionalmente.</p>
      </div>
      <DocumentForm
        mode="edit"
        entities={entities}
        defaults={{
          id: doc.id,
          title: doc.title,
          extract: doc.extract,
          tags: doc.tags.map((t) => t.tag.name),
          contentDate: doc.contentDate.toISOString().slice(0, 10),
          entityId: doc.entityId,
          categoryId: doc.categoryId,
          fileName: doc.fileName,
        }}
      />
    </div>
  );
}
