'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EntityOpt = { id: string; name: string; categories: { id: string; name: string }[] };

type Props = {
  initial: { q: string; entityId?: string; categoryId?: string; from?: string; to?: string; view: 'cards' | 'list' };
  entities: EntityOpt[];
};

export function PublicFilters({ initial, entities }: Props) {
  const router = useRouter();
  const [q, setQ] = React.useState(initial.q);
  const [entityId, setEntityId] = React.useState(initial.entityId ?? '');
  const [categoryId, setCategoryId] = React.useState(initial.categoryId ?? '');
  const [from, setFrom] = React.useState(initial.from ?? '');
  const [to, setTo] = React.useState(initial.to ?? '');

  React.useEffect(() => {
    if (entityId && !entities.find((e) => e.id === entityId)?.categories.find((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [entityId, entities, categoryId]);

  const categories = entities.find((e) => e.id === entityId)?.categories ?? [];

  function apply() {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (entityId) params.set('entityId', entityId);
    if (categoryId) params.set('categoryId', categoryId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (initial.view !== 'cards') params.set('view', initial.view);
    router.push(`/${params.toString() ? `?${params.toString()}` : ''}`);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="rounded-lg border bg-card p-4 space-y-3"
    >
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder='Buscar por título o contenido. Usá "frase entre comillas" para coincidencia exacta'
          className="pl-9"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="space-y-1">
          <Label className="text-xs">Entidad</Label>
          <select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Todas</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Categoría</Label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!entityId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Desde</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Hasta</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full">
            Aplicar filtros
          </Button>
        </div>
      </div>
    </form>
  );
}
