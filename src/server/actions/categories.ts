'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireUser, requireAdmin } from '@/lib/auth/session';
import { recordAudit } from '@/lib/audit/log';
import type { ActionResult } from '@/server/actions/entities';

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nombre requerido').max(150),
  entityId: z.string().min(1),
});

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const parsed = categorySchema.safeParse({
    name: formData.get('name'),
    entityId: formData.get('entityId'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const entity = await prisma.entity.findUnique({ where: { id: parsed.data.entityId } });
  if (!entity || entity.deletedAt) return { ok: false, error: 'Entidad inválida' };

  try {
    await prisma.$transaction(async (tx) => {
      const c = await tx.category.create({
        data: { name: parsed.data.name, entityId: parsed.data.entityId },
      });
      await recordAudit(
        { actorId: me.id, action: 'CREATE', entityType: 'Category', entityId: c.id, after: { name: c.name, entityId: c.entityId } },
        tx,
      );
    });
    revalidatePath('/entidades');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Ya existe una categoría con ese nombre en esa entidad' };
    return { ok: false, error: 'Error al crear la categoría' };
  }
}

export async function updateCategory(id: string, formData: FormData): Promise<ActionResult> {
  const me = await requireUser();
  const name = z.string().trim().min(1).max(150).safeParse(formData.get('name'));
  if (!name.success) return { ok: false, error: 'Nombre inválido' };

  const before = await prisma.category.findUnique({ where: { id } });
  if (!before) return { ok: false, error: 'Categoría no encontrada' };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.category.update({ where: { id }, data: { name: name.data } });
      await recordAudit(
        { actorId: me.id, action: 'UPDATE', entityType: 'Category', entityId: id, before: { name: before.name }, after: { name: name.data } },
        tx,
      );
    });
    revalidatePath('/entidades');
    return { ok: true };
  } catch (e: any) {
    if (e?.code === 'P2002') return { ok: false, error: 'Ya existe una categoría con ese nombre en esa entidad' };
    return { ok: false, error: 'Error al actualizar la categoría' };
  }
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const me = await requireUser();
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { documents: { where: { deletedAt: null } } } } },
  });
  if (!cat || cat.deletedAt) return { ok: false, error: 'Categoría no encontrada' };

  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { deletedAt: new Date() } });
    await recordAudit(
      { actorId: me.id, action: 'DELETE', entityType: 'Category', entityId: id, before: { name: cat.name } },
      tx,
    );
  });
  revalidatePath('/entidades');
  return { ok: true };
}

export async function restoreCategory(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat || !cat.deletedAt) return { ok: false, error: 'No hay nada que restaurar' };
  await prisma.$transaction(async (tx) => {
    await tx.category.update({ where: { id }, data: { deletedAt: null } });
    await recordAudit({ actorId: me.id, action: 'RESTORE', entityType: 'Category', entityId: id, after: { name: cat.name } }, tx);
  });
  revalidatePath('/entidades');
  return { ok: true };
}

export async function getCategoryImpact(id: string) {
  const cat = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { documents: { where: { deletedAt: null } } } } },
  });
  if (!cat) return null;
  return { name: cat.name, documentCount: cat._count.documents };
}
