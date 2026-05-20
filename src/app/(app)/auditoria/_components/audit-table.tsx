'use client';

import * as React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

type Row = {
  id: string;
  createdAt: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string;
  before: any;
  after: any;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  UPDATE: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  DELETE: 'bg-destructive/15 text-destructive',
  RESTORE: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  LOGIN: 'bg-muted text-muted-foreground',
  LOGOUT: 'bg-muted text-muted-foreground',
  RESET_REQUEST: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
  RESET_COMPLETE: 'bg-purple-500/15 text-purple-700 dark:text-purple-300',
};

export function AuditTable({ rows }: { rows: Row[] }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="w-8"></th>
            <th className="px-3 py-2 font-medium">Cuándo</th>
            <th className="px-3 py-2 font-medium">Quién</th>
            <th className="px-3 py-2 font-medium">Acción</th>
            <th className="px-3 py-2 font-medium">Sobre</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => {
            const hasDetails = (r.before && Object.keys(r.before).length > 0) || (r.after && Object.keys(r.after).length > 0);
            const isExpanded = expanded.has(r.id);
            return (
              <React.Fragment key={r.id}>
                <tr className="hover:bg-muted/30">
                  <td className="pl-3">
                    {hasDetails && (
                      <button onClick={() => toggle(r.id)} className="text-muted-foreground" aria-label="Detalles">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">{fmt(r.createdAt)}</td>
                  <td className="px-3 py-2">{r.actor}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ACTION_COLORS[r.action] ?? 'bg-muted'}`}>
                      {r.action}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-muted-foreground">{r.entityType}</span>{' '}
                    <code className="text-xs">{r.entityId}</code>
                  </td>
                </tr>
                {hasDetails && isExpanded && (
                  <tr className="bg-muted/20">
                    <td></td>
                    <td colSpan={4} className="px-3 py-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Antes</div>
                          <pre className="rounded border bg-background p-2 text-xs overflow-auto max-h-60">
                            {r.before ? JSON.stringify(r.before, null, 2) : '—'}
                          </pre>
                        </div>
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Después</div>
                          <pre className="rounded border bg-background p-2 text-xs overflow-auto max-h-60">
                            {r.after ? JSON.stringify(r.after, null, 2) : '—'}
                          </pre>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                Sin eventos para los filtros aplicados.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
