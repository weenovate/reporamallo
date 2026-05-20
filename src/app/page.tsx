import Link from 'next/link';
import { LogIn, LayoutGrid, List, ExternalLink } from 'lucide-react';
import { prisma } from '@/lib/db';
import { searchDocuments, countDocuments } from '@/lib/search/search';
import { getSessionUser } from '@/lib/auth/session';
import { Button } from '@/components/ui/button';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { PublicFilters } from './_components/public-filters';
import { Pills } from './_components/public-pills';

export const metadata = { title: 'Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

type SP = {
  q?: string;
  entityId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  view?: 'cards' | 'list';
  page?: string;
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default async function PublicPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await getSessionUser();

  const q = (sp.q ?? '').trim();
  const entityId = sp.entityId;
  const categoryId = sp.categoryId;
  const from = sp.from;
  const to = sp.to;
  const view: 'cards' | 'list' = sp.view === 'list' ? 'list' : 'cards';
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1);
  const perPage = view === 'cards' ? 12 : 25;

  // Cumulative counts para las pills (en orden de aplicacion)
  const filterSequence: Array<{ kind: 'q' | 'entity' | 'category' | 'date'; label: string; removeUrl: string }> = [];

  function urlWithout(field: 'q' | 'entityId' | 'categoryId' | 'date'): string {
    const params = new URLSearchParams();
    if (field !== 'q' && q) params.set('q', q);
    if (field !== 'entityId' && entityId) params.set('entityId', entityId);
    if (field !== 'categoryId' && categoryId) {
      params.set('categoryId', categoryId);
    }
    if (field !== 'date') {
      if (from) params.set('from', from);
      if (to) params.set('to', to);
    }
    // Si borramos la entidad, no tiene sentido mantener la categoria
    if (field === 'entityId') params.delete('categoryId');
    if (view !== 'cards') params.set('view', view);
    return `/${params.toString() ? `?${params.toString()}` : ''}`;
  }

  const [entities, allEntities] = await Promise.all([
    prisma.entity.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' },
      include: { categories: { where: { deletedAt: null }, orderBy: { name: 'asc' } } },
    }),
    Promise.resolve(undefined),
  ]);

  const cumulative: Array<{ q?: string; entityId?: string; categoryId?: string; from?: string; to?: string }> = [];
  const base: typeof cumulative[number] = {};
  if (q) {
    cumulative.push({ ...base, q });
    base.q = q;
    filterSequence.push({ kind: 'q', label: `"${q}"`, removeUrl: urlWithout('q') });
  }
  if (entityId) {
    const e = entities.find((x) => x.id === entityId);
    cumulative.push({ ...base, entityId });
    base.entityId = entityId;
    filterSequence.push({ kind: 'entity', label: `Entidad: ${e?.name ?? entityId}`, removeUrl: urlWithout('entityId') });
  }
  if (categoryId) {
    const cat = entities.flatMap((e) => e.categories).find((c) => c.id === categoryId);
    cumulative.push({ ...base, categoryId });
    base.categoryId = categoryId;
    filterSequence.push({ kind: 'category', label: `Categoría: ${cat?.name ?? categoryId}`, removeUrl: urlWithout('categoryId') });
  }
  if (from || to) {
    cumulative.push({ ...base, from, to });
    base.from = from;
    base.to = to;
    const label = `Fecha: ${from ?? '…'} – ${to ?? '…'}`;
    filterSequence.push({ kind: 'date', label, removeUrl: urlWithout('date') });
  }

  const pillCounts = await Promise.all(cumulative.map((f) => countDocuments(f)));

  const result = await searchDocuments({
    q,
    entityId,
    categoryId,
    from,
    to,
    offset: (page - 1) * perPage,
    limit: perPage,
    sort: q ? 'relevance' : 'newest',
  });
  const totalPages = Math.max(1, Math.ceil(result.total / perPage));

  function viewUrl(nextView: 'cards' | 'list'): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (entityId) params.set('entityId', entityId);
    if (categoryId) params.set('categoryId', categoryId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (nextView !== 'cards') params.set('view', nextView);
    return `/${params.toString() ? `?${params.toString()}` : ''}`;
  }

  function pageUrl(p: number): string {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (entityId) params.set('entityId', entityId);
    if (categoryId) params.set('categoryId', categoryId);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (view !== 'cards') params.set('view', view);
    if (p > 1) params.set('page', String(p));
    return `/${params.toString() ? `?${params.toString()}` : ''}`;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold tracking-tight">
            Repositorio Ramallo
          </Link>
          <div className="flex items-center gap-1">
            <ThemeSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link href={user ? '/documentos' : '/login'}>
                <LogIn className="h-4 w-4" /> {user ? 'Panel' : 'Ingresar'}
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6 flex-1">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Documentación pública</h1>
          <p className="text-muted-foreground">
            Buscá por título o palabras del contenido. Usá comillas para frase exacta.
          </p>
        </div>

        <PublicFilters
          initial={{ q, entityId, categoryId, from, to, view }}
          entities={entities.map((e) => ({ id: e.id, name: e.name, categories: e.categories.map((c) => ({ id: c.id, name: c.name })) }))}
        />

        {filterSequence.length > 0 && (
          <Pills
            items={filterSequence.map((f, i) => ({ label: f.label, count: pillCounts[i], removeUrl: f.removeUrl }))}
          />
        )}

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {result.total} resultado(s) · página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1 rounded-md border p-0.5">
            <Button asChild variant={view === 'cards' ? 'secondary' : 'ghost'} size="sm">
              <Link href={viewUrl('cards')}>
                <LayoutGrid className="h-4 w-4" /> Cards
              </Link>
            </Button>
            <Button asChild variant={view === 'list' ? 'secondary' : 'ghost'} size="sm">
              <Link href={viewUrl('list')}>
                <List className="h-4 w-4" /> Lista
              </Link>
            </Button>
          </div>
        </div>

        {result.hits.length === 0 ? (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            Sin resultados para los filtros aplicados.
          </div>
        ) : view === 'cards' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.hits.map((d) => (
              <article key={d.id} className="flex flex-col rounded-lg border bg-card p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {d.entityName}
                  </span>
                  <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                    {d.categoryName}
                  </span>
                </div>
                <h2 className="font-semibold text-base leading-snug">{d.title}</h2>
                <p className="text-xs text-muted-foreground mb-2">{fmtDate(d.contentDate)}</p>
                <p className="text-sm text-muted-foreground line-clamp-4 flex-1">{d.extract}</p>
                {d.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {d.tags.slice(0, 5).map((t) => (
                      <span key={t} className="rounded bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <Button asChild size="sm" className="mt-4 w-fit">
                  <a href={`/api/documents/${d.id}/view`} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" /> Ver documento
                  </a>
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Entidad</th>
                  <th className="px-3 py-2 font-medium">Categoría</th>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium text-right">Documento</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {result.hits.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium">{d.title}</td>
                    <td className="px-3 py-2">{d.entityName}</td>
                    <td className="px-3 py-2">{d.categoryName}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(d.contentDate)}</td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <a href={`/api/documents/${d.id}/view`} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" /> Abrir
                        </a>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button asChild variant="outline" size="sm" disabled={page <= 1}>
              <Link href={pageUrl(Math.max(1, page - 1))}>Anterior</Link>
            </Button>
            <span className="text-sm text-muted-foreground">
              {page} / {totalPages}
            </span>
            <Button asChild variant="outline" size="sm" disabled={page >= totalPages}>
              <Link href={pageUrl(Math.min(totalPages, page + 1))}>Siguiente</Link>
            </Button>
          </div>
        )}
      </main>

      <footer className="border-t py-6">
        <div className="container text-center text-xs text-muted-foreground">
          Municipalidad de Ramallo · Repositorio documental
        </div>
      </footer>
    </div>
  );
}
