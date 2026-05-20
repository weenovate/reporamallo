import 'server-only';
import { prisma } from '@/lib/db';
import { getMeili, MEILI_INDEX } from '@/lib/search/client';

export type SearchHit = {
  id: string;
  title: string;
  extract: string;
  entityId: string;
  entityName: string;
  categoryId: string;
  categoryName: string;
  contentDate: string;
  createdAt: string;
  tags: string[];
};

export type SearchArgs = {
  q?: string;
  entityId?: string;
  categoryId?: string;
  from?: string;
  to?: string;
  offset?: number;
  limit?: number;
  sort?: 'newest' | 'relevance';
};

export type SearchResult = {
  hits: SearchHit[];
  total: number;
  source: 'meilisearch' | 'mysql';
};

function buildFilters(args: SearchArgs): string[] {
  const filters: string[] = [];
  if (args.entityId) filters.push(`entityId = "${args.entityId}"`);
  if (args.categoryId) filters.push(`categoryId = "${args.categoryId}"`);
  if (args.from) filters.push(`contentDate >= ${Math.floor(new Date(args.from).getTime() / 1000)}`);
  if (args.to) {
    const end = new Date(args.to);
    end.setHours(23, 59, 59, 999);
    filters.push(`contentDate <= ${Math.floor(end.getTime() / 1000)}`);
  }
  return filters;
}

export async function searchDocuments(args: SearchArgs): Promise<SearchResult> {
  const meili = getMeili();
  if (meili) {
    try {
      const filters = buildFilters(args);
      const r = await meili.index(MEILI_INDEX).search(args.q ?? '', {
        filter: filters.length ? filters.join(' AND ') : undefined,
        offset: args.offset ?? 0,
        limit: args.limit ?? 25,
        sort: args.sort === 'newest' || !args.q ? ['contentDate:desc'] : undefined,
      });
      return {
        hits: (r.hits as any[]).map((h) => ({
          id: h.id,
          title: h.title,
          extract: h.extract,
          entityId: h.entityId,
          entityName: h.entityName,
          categoryId: h.categoryId,
          categoryName: h.categoryName,
          contentDate: new Date(h.contentDate * 1000).toISOString(),
          createdAt: new Date(h.createdAt * 1000).toISOString(),
          tags: h.tags ?? [],
        })),
        total: r.estimatedTotalHits ?? r.hits.length,
        source: 'meilisearch',
      };
    } catch (e) {
      console.warn('[search] meili search fallo, fallback a mysql:', e);
    }
  }

  const where: any = { deletedAt: null };
  if (args.entityId) where.entityId = args.entityId;
  if (args.categoryId) where.categoryId = args.categoryId;
  if (args.from || args.to) {
    where.contentDate = {};
    if (args.from) where.contentDate.gte = new Date(args.from);
    if (args.to) {
      const end = new Date(args.to);
      end.setHours(23, 59, 59, 999);
      where.contentDate.lte = end;
    }
  }
  if (args.q && args.q.trim()) {
    where.OR = [
      { title: { contains: args.q } },
      { extract: { contains: args.q } },
      { contentText: { contains: args.q } },
      { tags: { some: { tag: { name: { contains: args.q } } } } },
    ];
  }

  const [hits, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { contentDate: 'desc' },
      skip: args.offset ?? 0,
      take: args.limit ?? 25,
      include: { entity: true, category: true, tags: { include: { tag: true } } },
    }),
    prisma.document.count({ where }),
  ]);
  return {
    hits: hits.map((d) => ({
      id: d.id,
      title: d.title,
      extract: d.extract,
      entityId: d.entityId,
      entityName: d.entity.name,
      categoryId: d.categoryId,
      categoryName: d.category.name,
      contentDate: d.contentDate.toISOString(),
      createdAt: d.createdAt.toISOString(),
      tags: d.tags.map((t) => t.tag.name),
    })),
    total,
    source: 'mysql',
  };
}

export async function countDocuments(args: SearchArgs): Promise<number> {
  const r = await searchDocuments({ ...args, limit: 0 });
  return r.total;
}
