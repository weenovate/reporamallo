'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Eye, Download, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { deleteDocument } from '@/server/actions/documents';

type Row = {
  id: string;
  title: string;
  entityName: string;
  categoryName: string;
  contentDate: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
  updatedBy: string | null;
};

type EntityOpt = { id: string; name: string; categories: { id: string; name: string }[] };

type Props = {
  rows: Row[];
  entities: EntityOpt[];
  initial: { q: string; entityId?: string; categoryId?: string; from?: string; to?: string };
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR');
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });
}

export function DocumentsTable({ rows, entities, initial }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [q, setQ] = React.useState(initial.q);
  const [entityId, setEntityId] = React.useState(initial.entityId ?? '');
  const [categoryId, setCategoryId] = React.useState(initial.categoryId ?? '');
  const [from, setFrom] = React.useState(initial.from ?? '');
  const [to, setTo] = React.useState(initial.to ?? '');
  const confirm = useConfirm();

  React.useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (entityId) params.set('entityId', entityId);
      if (categoryId) params.set('categoryId', categoryId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      router.replace(`/documentos${params.toString() ? `?${params.toString()}` : ''}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, entityId, categoryId, from, to]);

  React.useEffect(() => {
    if (entityId && !entities.find((e) => e.id === entityId)?.categories.find((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [entityId, entities, categoryId]);

  const categories = entities.find((e) => e.id === entityId)?.categories ?? [];

  async function onDelete(id: string, title: string) {
    const ok = await confirm({
      title: 'Eliminar documento',
      description: (
        <p>
          ¿Eliminar <strong>{title}</strong>? Se aplicará un soft delete; un administrador podrá restaurarlo.
        </p>
      ),
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await deleteDocument(id);
    if (res.ok) toast.success('Documento eliminado');
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por título, extracto o contenido…"
            className="pl-9"
          />
        </div>
        <select
          value={entityId}
          onChange={(e) => setEntityId(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas las entidades</option>
          {entities.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          disabled={!entityId}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Entidad</th>
              <th className="px-3 py-2 font-medium">Categoría</th>
              <th className="px-3 py-2 font-medium">Título</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Subido por</th>
              <th className="px-3 py-2 font-medium">Subida</th>
              <th className="px-3 py-2 font-medium">Última modificación</th>
              <th className="px-3 py-2 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                  Sin documentos para los filtros aplicados.
                </td>
              </tr>
            ) : (
              rows.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2">{d.entityName}</td>
                  <td className="px-3 py-2">{d.categoryName}</td>
                  <td className="px-3 py-2 font-medium">{d.title}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.contentDate)}</td>
                  <td className="px-3 py-2">{d.uploadedBy}</td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmtDateTime(d.createdAt)}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {d.updatedBy ? (
                      <span>
                        {fmtDateTime(d.updatedAt)} · {d.updatedBy}
                      </span>
                    ) : (
                      <span className="opacity-60">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <Button asChild size="icon" variant="ghost" aria-label="Visualizar">
                        <a href={`/api/documents/${d.id}/view`} target="_blank" rel="noreferrer">
                          <Eye className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild size="icon" variant="ghost" aria-label="Descargar">
                        <a href={`/api/documents/${d.id}/download`}>
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                      <Button asChild size="icon" variant="ghost" aria-label="Modificar">
                        <Link href={`/documentos/${d.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Eliminar"
                        onClick={() => onDelete(d.id, d.title)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
