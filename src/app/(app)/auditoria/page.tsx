import { requireAdmin } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { AuditFilters } from './_components/audit-filters';
import { AuditTable } from './_components/audit-table';

export const metadata = { title: 'Auditoría — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 50;

type SP = {
  actor?: string;
  entityType?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: string;
};

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;

  const where: any = {};
  if (sp.actor) where.actorId = sp.actor;
  if (sp.entityType) where.entityType = sp.entityType;
  if (sp.action) where.action = sp.action;
  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) where.createdAt.gte = new Date(sp.from);
    if (sp.to) {
      const end = new Date(sp.to);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);

  const [rows, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where: {},
      orderBy: { username: 'asc' },
      select: { id: true, username: true, firstName: true, lastName: true },
    }),
  ]);

  const userMap = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName} (${u.username})`]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const enriched = rows.map((r) => ({
    id: r.id.toString(),
    createdAt: r.createdAt.toISOString(),
    actor: r.actorId ? userMap.get(r.actorId) ?? r.actorId : 'Sistema',
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    before: r.before,
    after: r.after,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          {total} evento(s) · página {page} de {totalPages}
        </p>
      </div>
      <AuditFilters
        users={users.map((u) => ({ id: u.id, label: `${u.firstName} ${u.lastName}` }))}
        initial={{ actor: sp.actor, entityType: sp.entityType, action: sp.action, from: sp.from, to: sp.to }}
      />
      <AuditTable rows={enriched} />
      {totalPages > 1 && (
        <Pagination current={page} total={totalPages} sp={sp} />
      )}
    </div>
  );
}

function Pagination({ current, total, sp }: { current: number; total: number; sp: SP }) {
  function url(p: number) {
    const params = new URLSearchParams();
    if (sp.actor) params.set('actor', sp.actor);
    if (sp.entityType) params.set('entityType', sp.entityType);
    if (sp.action) params.set('action', sp.action);
    if (sp.from) params.set('from', sp.from);
    if (sp.to) params.set('to', sp.to);
    if (p > 1) params.set('page', String(p));
    return `/auditoria${params.toString() ? `?${params.toString()}` : ''}`;
  }
  return (
    <div className="flex items-center justify-center gap-2">
      <a
        href={url(Math.max(1, current - 1))}
        className={`rounded-md border px-3 py-1.5 text-sm ${current <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}
      >
        Anterior
      </a>
      <span className="text-sm text-muted-foreground">
        {current} / {total}
      </span>
      <a
        href={url(Math.min(total, current + 1))}
        className={`rounded-md border px-3 py-1.5 text-sm ${current >= total ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}
      >
        Siguiente
      </a>
    </div>
  );
}
