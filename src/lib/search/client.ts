import 'server-only';
import { MeiliSearch } from 'meilisearch';

export const MEILI_INDEX = 'documents';

let client: MeiliSearch | null = null;

export function getMeili(): MeiliSearch | null {
  const host = process.env.MEILISEARCH_HOST;
  if (!host) return null;
  if (!client) {
    client = new MeiliSearch({
      host,
      apiKey: process.env.MEILISEARCH_API_KEY,
    });
  }
  return client;
}

export async function ensureMeiliIndex(): Promise<void> {
  const meili = getMeili();
  if (!meili) return;
  try {
    const index = meili.index(MEILI_INDEX);
    await meili.createIndex(MEILI_INDEX, { primaryKey: 'id' }).catch(() => undefined);
    await index.updateFilterableAttributes(['entityId', 'categoryId', 'contentDate', 'tags']);
    await index.updateSortableAttributes(['contentDate', 'createdAt', 'title']);
    await index.updateSearchableAttributes(['title', 'tags', 'extract', 'contentText']);
    await index.updateStopWords([
      'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas',
      'de', 'del', 'al', 'a', 'y', 'o', 'u', 'que', 'en', 'por',
      'para', 'con', 'sin', 'sobre', 'es', 'son', 'fue', 'ser',
    ]);
  } catch (e) {
    console.warn('[search] ensureMeiliIndex:', e);
  }
}
