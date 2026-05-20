'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/session';
import { getSettings, updateSettings } from '@/lib/config/settings';
import { recordAudit } from '@/lib/audit/log';

export type ActionResult = { ok: true } | { ok: false; error: string };

const schema = z.object({
  tagsDefaultCount: z.coerce.number().int().min(1).max(50),
  extractMaxChars: z.coerce.number().int().min(50).max(5000),
  smtpFrom: z.string().min(1).max(200),
  smtpToken: z.string().optional(),
});

export async function saveSettings(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = schema.safeParse({
    tagsDefaultCount: formData.get('tagsDefaultCount'),
    extractMaxChars: formData.get('extractMaxChars'),
    smtpFrom: formData.get('smtpFrom'),
    smtpToken: formData.get('smtpToken'),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.errors[0]?.message ?? 'Datos inválidos' };

  const before = await getSettings();
  await updateSettings({
    tagsDefaultCount: parsed.data.tagsDefaultCount,
    extractMaxChars: parsed.data.extractMaxChars,
    smtpFrom: parsed.data.smtpFrom,
    ...(parsed.data.smtpToken ? { smtpToken: parsed.data.smtpToken } : {}),
  });
  await recordAudit({
    actorId: me.id,
    action: 'UPDATE',
    entityType: 'AppSetting',
    entityId: 'global',
    before: { tagsDefaultCount: before.tagsDefaultCount, extractMaxChars: before.extractMaxChars, smtpFrom: before.smtpFrom },
    after: { tagsDefaultCount: parsed.data.tagsDefaultCount, extractMaxChars: parsed.data.extractMaxChars, smtpFrom: parsed.data.smtpFrom },
  });
  revalidatePath('/configuracion');
  return { ok: true };
}
