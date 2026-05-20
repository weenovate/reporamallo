import { PrismaClient } from '@prisma/client';
import { MeiliSearch } from 'meilisearch';

const INDEX = 'documents';
const BATCH = 200;

async function main() {
  const host = process.env.MEILISEARCH_HOST;
  if (!host) {
    console.error('MEILISEARCH_HOST no configurado');
    process.exit(1);
  }
  const prisma = new PrismaClient();
  const meili = new MeiliSearch({ host, apiKey: process.env.MEILISEARCH_API_KEY });

  await meili.createIndex(INDEX, { primaryKey: 'id' }).catch(() => undefined);
  const index = meili.index(INDEX);
  await index.updateFilterableAttributes(['entityId', 'categoryId', 'contentDate', 'tags']);
  await index.updateSortableAttributes(['contentDate', 'createdAt', 'title']);
  await index.updateSearchableAttributes(['title', 'tags', 'extract', 'contentText']);

  const total = await prisma.document.count({ where: { deletedAt: null } });
  console.log(`Reindexando ${total} documentos…`);

  let processed = 0;
  let cursor: string | undefined = undefined;
  while (true) {
    const args: any = {
      where: { deletedAt: null },
      orderBy: { id: 'asc' },
      take: BATCH,
      include: {
        entity: true,
        category: true,
        uploadedBy: true,
        tags: { include: { tag: true } },
      },
    };
    if (cursor) {
      args.skip = 1;
      args.cursor = { id: cursor };
    }
    const docs = await prisma.document.findMany(args);
    if (docs.length === 0) break;

    const records = (docs as any[]).map((d: any) => ({
      id: d.id,
      title: d.title,
      extract: d.extract,
      contentText: d.contentText,
      entityId: d.entityId,
      entityName: d.entity.name,
      categoryId: d.categoryId,
      categoryName: d.category.name,
      tags: d.tags.map((t: any) => t.tag.name),
      contentDate: Math.floor(d.contentDate.getTime() / 1000),
      createdAt: Math.floor(d.createdAt.getTime() / 1000),
      uploadedBy: `${d.uploadedBy.firstName} ${d.uploadedBy.lastName}`.trim(),
    }));
    await index.addDocuments(records, { primaryKey: 'id' });
    processed += docs.length;
    cursor = (docs as any[])[docs.length - 1].id;
    console.log(`  ${processed}/${total}`);
    if (docs.length < BATCH) break;
  }
  await prisma.$disconnect();
  console.log('Reindex completo.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
