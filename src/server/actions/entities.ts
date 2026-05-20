'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, requireAdmin } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit/log';

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const nameSchema = z.object({ name: z.string().trim().min(1, 'Nombre requerido').max(150) });

export async function createEntity(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = nameSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Nombre inválido' };

  try {
    const entity = await prisma.$transaction(async (tx) => {
      const e = await tx.entity.create({ data: { name: parsed.data.name } });
      await recordAudit({ actorId: me.id, action: 'CREATE', entityType: 'Entity', entityId: e.id, after: { name: e.name } }, tx);
      return e;
    });
    revalidatePath('/entidades');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Ya existe una entidad con ese nombre' };
    return { ok: false, error: 'Error al crear la entidad' };
  }
}

export async function updateEntity(id: string, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = nameSchema.safeParse({ name: formData.get('name') });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Nombre inválido' };

  const before = await prisma.entity.findUnique({ where: { id } });
  if (!before) return { ok: false, error: 'Entidad no encontrada' };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.entity.update({ where: { id }, data: { name: parsed.data.name } });
      await recordAudit(
        { actorId: me.id, action: 'UPDATE', entityType: 'Entity', entityId: id, before: { name: before.name }, after: { name: parsed.data.name } },
        tx,
      );
    });
    revalidatePath('/entidades');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Ya existe una entidad con ese nombre' };
    return { ok: false, error: 'Error al actualizar la entidad' };
  }
}

export async function deleteEntity(id: string): Promise<ActionResult<{ hardDeleted: boolean }>> {
  const me = await requireUser();
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          categories: { where: { deletedAt: null } },
          documents: { where: { deletedAt: null } },
        },
      },
    },
  });
  if (!entity || entity.deletedAt) return { ok: false, error: 'Entidad no encontrada' };

  const isEmpty = entity._count.categories === 0 && entity._count.documents === 0;
  try {
    await prisma.$transaction(async (tx) => {
      if (isEmpty) {
        await tx.entity.delete({ where: { id } });
      } else {
        await tx.entity.update({ where: { id }, data: { deletedAt: new Date() } });
      }
      await recordAudit(
        {
          actorId: me.id,
          action: 'DELETE',
          entityType: 'Entity',
          entityId: id,
          before: { name: entity.name, hard: isEmpty },
        },
        tx,
      );
    });
    revalidatePath('/entidades');
    return { ok: true, data: { hardDeleted: isEmpty } };
  } catch {
    return { ok: false, error: 'Error al eliminar la entidad' };
  }
}

export async function restoreEntity(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const entity = await prisma.entity.findUnique({ where: { id } });
  if (!entity || !entity.deletedAt) return { ok: false, error: 'No hay nada que restaurar' };
  await prisma.$transaction(async (tx) => {
    await tx.entity.update({ where: { id }, data: { deletedAt: null } });
    await recordAudit({ actorId: me.id, action: 'RESTORE', entityType: 'Entity', entityId: id, after: { name: entity.name } }, tx);
  });
  revalidatePath('/entidades');
  return { ok: true };
}

export async function getEntityImpact(id: string) {
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: {
      categories: {
        where: { deletedAt: null },
        select: {
          id: true,
          name: true,
          _count: { select: { documents: { where: { deletedAt: null } } } },
        },
      },
      _count: { select: { documents: { where: { deletedAt: null } } } },
    },
  });
  if (!entity) return null;
  return {
    name: entity.name,
    totalDocuments: entity._count.documents,
    categories: entity.categories.map((c) => ({ id: c.id, name: c.name, documentCount: c._count.documents })),
  };
}
