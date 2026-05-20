import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth/session';
import { prisma } from '@/lib/db';
import { readStored, statStored } from '@/lib/storage/filesystem';
import { Readable } from 'node:stream';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const me = await getSessionUser();
  if (!me) return new NextResponse('Unauthorized', { status: 401 });
  const { id } = await ctx.params;

  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc || doc.deletedAt) return new NextResponse('Not Found', { status: 404 });

  const stat = await statStored(doc.storageKey);
  if (!stat) return new NextResponse('Archivo no disponible', { status: 410 });

  const stream = await readStored(doc.storageKey);
  return new NextResponse(Readable.toWeb(stream) as ReadableStream, {
    headers: {
      'Content-Type': doc.fileMime || 'application/octet-stream',
      'Content-Length': String(stat.size),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
    },
  });
}
