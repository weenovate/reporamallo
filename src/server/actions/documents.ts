'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import type { Prisma, PrismaClient } from '@prisma/client';
import { createId } from '@/lib/auth/tokens';
import { prisma } from '@/lib/db';
import { requireUser, requireAdmin } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit/log';
import { extractPdfText } from '@/lib/text/pdf';
import { removeStored, storeBuffer } from '@/lib/storage/filesystem';
import { reindexDocument, removeFromIndex } from '@/lib/search/indexer';
import { buildExtract, extractTags } from '@/lib/nlp/extract';
import { getSettings } from '@/lib/config/settings';

const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10) || 25;

const documentSchema = z.object({
  title: z.string().trim().min(1, 'Título requerido').max(500),
  extract: z.string().trim().max(5000).default(''),
  tags: z.string().max(1000).default(''),
  contentDate: z.string().min(1, 'Fecha del contenido requerida'),
  entityId: z.string().min(1, 'Entidad requerida'),
  categoryId: z.string().min(1, 'Categoría requerida'),
});

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,\n;]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length <= 80),
    ),
  );
}

type TxClient = PrismaClient | Prisma.TransactionClient;

async function syncTags(documentId: string, tags: string[], tx: TxClient = prisma) {
  await tx.documentTag.deleteMany({ where: { documentId } });
  if (tags.length === 0) return;
  for (const name of tags) {
    const tag = await tx.tag.upsert({ where: { name }, update: {}, create: { name } });
    await tx.documentTag.create({ data: { documentId, tagId: tag.id } });
  }
}

export async function createDocument(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const me = await requireUser();
  const parsed = documentSchema.safeParse({
    title: formData.get('title'),
    extract: formData.get('extract') ?? '',
    tags: formData.get('tags') ?? '',
    contentDate: formData.get('contentDate'),
    entityId: formData.get('entityId'),
    categoryId: formData.get('categoryId'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'Archivo requerido' };
  if (file.size > MAX_MB * 1024 * 1024) return { ok: false, error: `Archivo supera ${MAX_MB} MB` };
  if (file.type && !file.type.includes('pdf')) return { ok: false, error: 'Solo se aceptan archivos PDF' };

  // Validar relacion entidad/categoria
  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, entityId: parsed.data.entityId, deletedAt: null },
  });
  if (!category) return { ok: false, error: 'La categoría no pertenece a la entidad seleccionada' };

  const buffer = Buffer.from(await file.arrayBuffer());
  const contentText = await extractPdfText(buffer);
  const settings = await getSettings();
  const autoExtract = parsed.data.extract.trim() || buildExtract(contentText, settings.extractMaxChars);
  const submittedTags = parseTags(parsed.data.tags);
  const finalTags = submittedTags.length > 0 ? submittedTags : extractTags(contentText, settings.tagsDefaultCount);

  const id = createId();
  const stored = await storeBuffer(id, file.name, buffer);

  try {
    const doc = await prisma.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id,
          title: parsed.data.title,
          extract: autoExtract,
          contentText,
          contentDate: new Date(parsed.data.contentDate),
          fileName: file.name,
          fileMime: file.type || 'application/pdf',
          fileSize: stored.fileSize,
          fileChecksum: stored.fileChecksum,
          storageKey: stored.storageKey,
          entityId: parsed.data.entityId,
          categoryId: parsed.data.categoryId,
          uploadedById: me.id,
        },
      });
      await syncTags(created.id, finalTags, tx);
      await recordAudit(
        {
          actorId: me.id,
          action: 'CREATE',
          entityType: 'Document',
          entityId: created.id,
          after: {
            title: created.title,
            entityId: created.entityId,
            categoryId: created.categoryId,
            fileName: created.fileName,
          },
        },
        tx,
      );
      return created;
    });
    await reindexDocument(doc.id);
    revalidatePath('/documentos');
    return { ok: true, data: { id: doc.id } };
  } catch (e) {
    await removeStored(stored.storageKey).catch(() => undefined);
    console.error('[documents] error al crear', e);
    return { ok: false, error: 'Error al guardar el documento' };
  }
}

export async function updateDocument(id: string, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = documentSchema.safeParse({
    title: formData.get('title'),
    extract: formData.get('extract') ?? '',
    tags: formData.get('tags') ?? '',
    contentDate: formData.get('contentDate'),
    entityId: formData.get('entityId'),
    categoryId: formData.get('categoryId'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const before = await prisma.document.findUnique({
    where: { id },
    include: { tags: { include: { tag: true } } },
  });
  if (!before || before.deletedAt) return { ok: false, error: 'Documento no encontrado' };

  const file = formData.get('file');
  const hasNewFile = file instanceof File && file.size > 0;
  if (hasNewFile && file.size > MAX_MB * 1024 * 1024) return { ok: false, error: `Archivo supera ${MAX_MB} MB` };
  if (hasNewFile && file.type && !file.type.includes('pdf'))
    return { ok: false, error: 'Solo se aceptan archivos PDF' };

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, entityId: parsed.data.entityId, deletedAt: null },
  });
  if (!category) return { ok: false, error: 'La categoría no pertenece a la entidad' };

  let newStorage: Awaited<ReturnType<typeof storeBuffer>> | null = null;
  let newContentText: string | null = null;
  let newFileName: string | null = null;
  let newMime: string | null = null;

  if (hasNewFile) {
    const buffer = Buffer.from(await file.arrayBuffer());
    newContentText = await extractPdfText(buffer);
    newStorage = await storeBuffer(id, file.name, buffer);
    newFileName = file.name;
    newMime = file.type || 'application/pdf';
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.document.update({
        where: { id },
        data: {
          title: parsed.data.title,
          extract: parsed.data.extract,
          contentDate: new Date(parsed.data.contentDate),
          entityId: parsed.data.entityId,
          categoryId: parsed.data.categoryId,
          updatedById: me.id,
          ...(newStorage
            ? {
                fileName: newFileName!,
                fileMime: newMime!,
                fileSize: newStorage.fileSize,
                fileChecksum: newStorage.fileChecksum,
                storageKey: newStorage.storageKey,
                contentText: newContentText!,
              }
            : {}),
        },
      });
      await syncTags(id, parseTags(parsed.data.tags), tx);

      const beforeSnapshot = {
        title: before.title,
        extract: before.extract,
        entityId: before.entityId,
        categoryId: before.categoryId,
        contentDate: before.contentDate.toISOString(),
        fileName: before.fileName,
        tags: before.tags.map((t) => t.tag.name),
      };
      const afterSnapshot = {
        title: parsed.data.title,
        extract: parsed.data.extract,
        entityId: parsed.data.entityId,
        categoryId: parsed.data.categoryId,
        contentDate: parsed.data.contentDate,
        fileName: newFileName ?? before.fileName,
        tags: parseTags(parsed.data.tags),
      };

      await recordAudit(
        {
          actorId: me.id,
          action: 'UPDATE',
          entityType: 'Document',
          entityId: id,
          before: beforeSnapshot,
          after: afterSnapshot,
        },
        tx,
      );
    });

    if (newStorage && before.storageKey !== newStorage.storageKey) {
      await removeStored(before.storageKey).catch(() => undefined);
    }
    await reindexDocument(id);
    revalidatePath('/documentos');
    revalidatePath(`/documentos/${id}/editar`);
    return { ok: true };
  } catch (e) {
    if (newStorage) await removeStored(newStorage.storageKey).catch(() => undefined);
    console.error('[documents] error al actualizar', e);
    return { ok: false, error: 'Error al actualizar el documento' };
  }
}

export async function deleteDocument(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) return { ok: false, error: 'Documento no encontrado' };

  await prisma.$transaction(async (tx) => {
    await tx.document.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordAudit(
      { actorId: me.id, action: 'DELETE', entityType: 'Document', entityId: id, before: { title: doc.title } },
      tx,
    );
  });
  await removeFromIndex(id);
  revalidatePath('/documentos');
  return { ok: true };
}

export async function restoreDocument(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || !doc.deletedAt) return { ok: false, error: 'No hay nada que restaurar' };

  await prisma.$transaction(async (tx) => {
    await tx.document.update({ where: { id }, data: { deletedAt: null } });
    await recordAudit({ actorId: me.id, action: 'RESTORE', entityType: 'Document', entityId: id, after: { title: doc.title } }, tx);
  });
  await reindexDocument(id);
  revalidatePath('/documentos');
  return { ok: true };
}

export async function createAndRedirect(formData: FormData): Promise<void> {
  const res = await createDocument(formData);
  if (!res.ok) throw new Error(res.error);
  redirect('/documentos');
}
