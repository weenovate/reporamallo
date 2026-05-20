import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Documentos — Repositorio Ramallo' };

export default async function DocumentosPage() {
  await requireUser();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Documentos</h1>
      <p className="text-sm text-muted-foreground">CRUD de documentos llega en fase 6.</p>
    </div>
  );
}
