import { requireUser } from '@/lib/auth/session';

export const metadata = { title: 'Entidades — Repositorio Ramallo' };

export default async function EntidadesPage() {
  await requireUser();
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Entidades</h1>
      <p className="text-sm text-muted-foreground">CRUD de entidades llega en fase 5.</p>
    </div>
  );
}
