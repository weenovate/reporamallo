import 'server-only';
import { prisma } from '@/lib/db';
import { ensureMeiliIndex, getMeili, MEILI_INDEX } from '@/lib/search/client';

let indexEnsured = false;
async function ensureOnce() {
  if (indexEnsured) return;
  await ensureMeiliIndex();
  indexEnsured = true;
}

export async function buildDocumentRecord(documentId: string) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: {
      entity: true,
      category: true,
      uploadedBy: true,
      tags: { include: { tag: true } },
    },
  });
  if (!doc || doc.deletedAt) return null;
  return {
    id: doc.id,
    title: doc.title,
    extract: doc.extract,
    contentText: doc.contentText,
    entityId: doc.entityId,
    entityName: doc.entity.name,
    categoryId: doc.categoryId,
    categoryName: doc.category.name,
    tags: doc.tags.map((t) => t.tag.name),
    contentDate: Math.floor(doc.contentDate.getTime() / 1000),
    createdAt: Math.floor(doc.createdAt.getTime() / 1000),
    uploadedBy: `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim(),
  };
}

export async function reindexDocument(documentId: string): Promise<void> {
  const meili = getMeili();
  if (!meili) return;
  await ensureOnce();
  const record = await buildDocumentRecord(documentId);
  if (!record) {
    await removeFromIndex(documentId);
    return;
  }
  try {
    await meili.index(MEILI_INDEX).addDocuments([record], { primaryKey: 'id' });
  } catch (e) {
    console.warn('[search] no se pudo reindexar:', e);
  }
}

export async function removeFromIndex(documentId: string): Promise<void> {
  const meili = getMeili();
  if (!meili) return;
  try {
    await meili.index(MEILI_INDEX).deleteDocument(documentId);
  } catch (e) {
    console.warn('[search] no se pudo eliminar del indice:', e);
  }
}
