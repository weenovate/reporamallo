import { requireUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { DocumentForm } from '../_components/document-form';

export const metadata = { title: 'Nuevo documento — Repositorio Ramallo' };

export default async function NuevoDocumentoPage() {
  await requireUser();
  const entities = await prisma.entity.findMany({
    where: { deletedAt: null },
    orderBy: { name: 'asc' },
    include: { categories: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo documento</h1>
        <p className="text-sm text-muted-foreground">Subí un PDF y completá los datos.</p>
      </div>
      <DocumentForm mode="create" entities={entities} />
    </div>
  );
}
