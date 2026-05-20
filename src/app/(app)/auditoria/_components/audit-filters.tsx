'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ENTITY_TYPES = ['User', 'Entity', 'Category', 'Document', 'AppSetting'];
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'LOGIN', 'LOGOUT', 'RESET_REQUEST', 'RESET_COMPLETE'];

type Props = {
  users: { id: string; label: string }[];
  initial: { actor?: string; entityType?: string; action?: string; from?: string; to?: string };
};

export function AuditFilters({ users, initial }: Props) {
  const router = useRouter();
  const [actor, setActor] = React.useState(initial.actor ?? '');
  const [entityType, setEntityType] = React.useState(initial.entityType ?? '');
  const [action, setAction] = React.useState(initial.action ?? '');
  const [from, setFrom] = React.useState(initial.from ?? '');
  const [to, setTo] = React.useState(initial.to ?? '');

  function apply() {
    const params = new URLSearchParams();
    if (actor) params.set('actor', actor);
    if (entityType) params.set('entityType', entityType);
    if (action) params.set('action', action);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    router.push(`/auditoria${params.toString() ? `?${params.toString()}` : ''}`);
  }

  function clear() {
    setActor('');
    setEntityType('');
    setAction('');
    setFrom('');
    setTo('');
    router.push('/auditoria');
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 rounded-lg border bg-card p-4"
    >
      <div className="space-y-1">
        <Label className="text-xs">Usuario</Label>
        <select
          value={actor}
          onChange={(e) => setActor(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tipo</Label>
        <select
          value={entityType}
          onChange={(e) => setEntityType(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todos</option>
          {ENTITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Acción</Label>
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="">Todas</option>
          {ACTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
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
      <div className="flex items-end gap-2">
        <Button type="submit" className="flex-1">Filtrar</Button>
        <Button type="button" variant="outline" onClick={clear}>
          Limpiar
        </Button>
      </div>
    </form>
  );
}
