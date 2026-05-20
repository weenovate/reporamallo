import 'server-only';
import { prisma } from '@/lib/db';

export type AppSettings = {
  tagsDefaultCount: number;
  extractMaxChars: number;
  smtpFrom: string;
};

const DEFAULTS: AppSettings = {
  tagsDefaultCount: 8,
  extractMaxChars: 500,
  smtpFrom: 'Repositorio Ramallo <no-reply@example.com>',
};

const KEYS = {
  tagsDefaultCount: 'tags.defaultCount',
  extractMaxChars: 'extract.maxChars',
  smtpFrom: 'smtp.from',
} as const;

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.values(KEYS) } } });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    tagsDefaultCount: parseInt(map.get(KEYS.tagsDefaultCount) ?? '', 10) || DEFAULTS.tagsDefaultCount,
    extractMaxChars: parseInt(map.get(KEYS.extractMaxChars) ?? '', 10) || DEFAULTS.extractMaxChars,
    smtpFrom: map.get(KEYS.smtpFrom) || DEFAULTS.smtpFrom,
  };
}

export async function updateSettings(input: Partial<AppSettings & { smtpToken: string }>): Promise<void> {
  const ops: Array<{ key: string; value: string }> = [];
  if (input.tagsDefaultCount !== undefined) ops.push({ key: KEYS.tagsDefaultCount, value: String(input.tagsDefaultCount) });
  if (input.extractMaxChars !== undefined) ops.push({ key: KEYS.extractMaxChars, value: String(input.extractMaxChars) });
  if (input.smtpFrom !== undefined) ops.push({ key: KEYS.smtpFrom, value: input.smtpFrom });
  if (input.smtpToken !== undefined) ops.push({ key: 'smtp.token', value: input.smtpToken });

  for (const { key, value } of ops) {
    await prisma.appSetting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
}
