'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDocument, updateDocument } from '@/server/actions/documents';

type EntityOpt = { id: string; name: string; categories: { id: string; name: string }[] };

type Defaults = {
  id?: string;
  title?: string;
  extract?: string;
  tags?: string[];
  contentDate?: string;
  entityId?: string;
  categoryId?: string;
  fileName?: string;
};

type Props = {
  mode: 'create' | 'edit';
  defaults?: Defaults;
  entities: EntityOpt[];
};

export function DocumentForm({ mode, defaults, entities }: Props) {
  const router = useRouter();
  const [entityId, setEntityId] = React.useState(defaults?.entityId ?? '');
  const [categoryId, setCategoryId] = React.useState(defaults?.categoryId ?? '');
  const [extract, setExtract] = React.useState(defaults?.extract ?? '');
  const [tags, setTags] = React.useState(defaults?.tags?.join(', ') ?? '');
  const [file, setFile] = React.useState<File | null>(null);
  const [analyzing, setAnalyzing] = React.useState(false);
  const [pending, start] = React.useTransition();

  React.useEffect(() => {
    if (entityId && !entities.find((e) => e.id === entityId)?.categories.find((c) => c.id === categoryId)) {
      setCategoryId('');
    }
  }, [entityId, entities, categoryId]);

  const categories = entities.find((e) => e.id === entityId)?.categories ?? [];

  async function analyze(f: File) {
    setAnalyzing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const res = await fetch('/api/documents/analyze', { method: 'POST', body: fd });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error ?? 'No se pudo analizar el PDF');
      }
      const data: { extract: string; tags: string[] } = await res.json();
      setExtract(data.extract);
      setTags(data.tags.join(', '));
      toast.success('Extracto y tags sugeridos. Editalos si querés.');
    } catch (e: any) {
      toast.error(e?.message ?? 'Error al analizar el PDF');
    } finally {
      setAnalyzing(false);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    if (f) void analyze(f);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res =
            mode === 'create'
              ? await createDocument(fd)
              : await updateDocument(defaults!.id!, fd);
          if (res.ok) {
            toast.success(mode === 'create' ? 'Documento creado' : 'Documento actualizado');
            router.push('/documentos');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
      className="space-y-6"
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="title">Título</Label>
          <Input id="title" name="title" defaultValue={defaults?.title ?? ''} required maxLength={500} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="entityId">Entidad</Label>
          <select
            id="entityId"
            name="entityId"
            required
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="" disabled>Seleccionar…</option>
            {entities.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <select
            id="categoryId"
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!entityId}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
          >
            <option value="" disabled>Seleccionar…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="contentDate">Fecha del contenido</Label>
          <Input id="contentDate" name="contentDate" type="date" defaultValue={defaults?.contentDate ?? ''} required />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file" className="flex items-center gap-2">
            {mode === 'create' ? 'Archivo PDF' : 'Reemplazar archivo (opcional)'}
            {analyzing && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Analizando…
              </span>
            )}
          </Label>
          <Input
            id="file"
            name="file"
            type="file"
            accept="application/pdf"
            required={mode === 'create'}
            onChange={onFileChange}
          />
          {!file && defaults?.fileName && (
            <p className="text-xs text-muted-foreground">Actual: {defaults.fileName}</p>
          )}
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="extract">Extracto</Label>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Auto-sugerido del PDF, editable
            </span>
          </div>
          <textarea
            id="extract"
            name="extract"
            value={extract}
            onChange={(e) => setExtract(e.target.value)}
            rows={4}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="tags">Tags</Label>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Auto-sugeridos del PDF, separados por coma
            </span>
          </div>
          <Input
            id="tags"
            name="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="palabra1, palabra2, frase clave"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/documentos">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending || analyzing}>
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear documento' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
