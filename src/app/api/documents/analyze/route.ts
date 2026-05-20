import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { extractPdfText } from '@/lib/text/pdf';
import { buildExtract, extractTags } from '@/lib/nlp/extract';
import { getSettings } from '@/lib/config/settings';

export const runtime = 'nodejs';

const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '25', 10) || 25;

export async function POST(req: NextRequest) {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    return NextResponse.json({ error: `Archivo supera ${MAX_MB} MB` }, { status: 413 });
  }
  if (file.type && !file.type.includes('pdf')) {
    return NextResponse.json({ error: 'Solo se aceptan archivos PDF' }, { status: 415 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const text = await extractPdfText(buffer);
  const settings = await getSettings();
  const extract = buildExtract(text, settings.extractMaxChars);
  const tags = extractTags(text, settings.tagsDefaultCount);

  return NextResponse.json({ extract, tags });
}
