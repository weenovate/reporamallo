'use client';

import * as React from 'react';
import { RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { restoreEntity } from '@/server/actions/entities';
import { restoreCategory } from '@/server/actions/categories';
import { restoreDocument } from '@/server/actions/documents';
import { restoreUser } from '@/server/actions/users';

type EntityT = { id: string; name: string; deletedAt: string };
type CategoryT = { id: string; name: string; entityName: string; deletedAt: string };
type DocumentT = { id: string; title: string; entityName: string; categoryName: string; deletedAt: string };
type UserT = { id: string; username: string; email: string; deletedAt: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function TrashList({
  entities,
  categories,
  documents,
  users,
}: {
  entities: EntityT[];
  categories: CategoryT[];
  documents: DocumentT[];
  users: UserT[];
}) {
  const [pending, start] = React.useTransition();

  function wrap<T extends (...args: any[]) => Promise<{ ok: boolean; error?: string } | any>>(
    fn: T,
    successMsg: string,
  ) {
    return (...args: Parameters<T>) => {
      start(async () => {
        const res = await fn(...args);
        if (res?.ok) toast.success(successMsg);
        else toast.error(res?.error ?? 'Error');
      });
    };
  }

  const onRestoreEntity = wrap(restoreEntity, 'Entidad restaurada');
  const onRestoreCategory = wrap(restoreCategory, 'Categoría restaurada');
  const onRestoreDocument = wrap(restoreDocument, 'Documento restaurado');
  const onRestoreUser = wrap(restoreUser, 'Usuario restaurado');

  return (
    <div className="space-y-8">
      <Section title="Entidades" empty="No hay entidades eliminadas.">
        {entities.map((e) => (
          <Row
            key={e.id}
            title={e.name}
            sub={`Eliminada ${fmt(e.deletedAt)}`}
            onRestore={() => onRestoreEntity(e.id)}
            pending={pending}
          />
        ))}
      </Section>
      <Section title="Categorías" empty="No hay categorías eliminadas.">
        {categories.map((c) => (
          <Row
            key={c.id}
            title={c.name}
            sub={`${c.entityName} · Eliminada ${fmt(c.deletedAt)}`}
            onRestore={() => onRestoreCategory(c.id)}
            pending={pending}
          />
        ))}
      </Section>
      <Section title="Documentos" empty="No hay documentos eliminados.">
        {documents.map((d) => (
          <Row
            key={d.id}
            title={d.title}
            sub={`${d.entityName} · ${d.categoryName} · Eliminado ${fmt(d.deletedAt)}`}
            onRestore={() => onRestoreDocument(d.id)}
            pending={pending}
          />
        ))}
      </Section>
      <Section title="Usuarios" empty="No hay usuarios eliminados.">
        {users.map((u) => (
          <Row
            key={u.id}
            title={u.username}
            sub={`${u.email} · Eliminado ${fmt(u.deletedAt)}`}
            onRestore={() => onRestoreUser(u.id)}
            pending={pending}
          />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = React.Children.toArray(children);
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <div className="rounded-lg border bg-card divide-y">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground text-center">{empty}</p>
        ) : (
          items
        )}
      </div>
    </section>
  );
}

function Row({
  title,
  sub,
  onRestore,
  pending,
}: {
  title: string;
  sub: string;
  onRestore: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </div>
      <Button size="sm" variant="outline" onClick={onRestore} disabled={pending}>
        <RotateCcw className="h-4 w-4" /> Restaurar
      </Button>
    </div>
  );
}
