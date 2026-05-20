'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Pencil, Trash2, FolderPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { createEntity, updateEntity, deleteEntity, getEntityImpact } from '@/server/actions/entities';
import { createCategory, updateCategory, deleteCategory, getCategoryImpact } from '@/server/actions/categories';

export type EntityView = {
  id: string;
  name: string;
  documentCount: number;
  categories: { id: string; name: string; documentCount: number }[];
};

type Props = {
  entities: EntityView[];
  initialSearch: string;
};

type DialogState =
  | { kind: 'none' }
  | { kind: 'createEntity' }
  | { kind: 'editEntity'; id: string; name: string }
  | { kind: 'createCategory'; entityId?: string }
  | { kind: 'editCategory'; id: string; name: string };

export function EntityManager({ entities, initialSearch }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState(initialSearch);
  const [dialog, setDialog] = React.useState<DialogState>({ kind: 'none' });
  const confirm = useConfirm();

  React.useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set('q', q);
      else params.delete('q');
      router.replace(`/entidades${params.toString() ? `?${params.toString()}` : ''}`);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  async function onDeleteEntity(id: string, name: string) {
    const impact = await getEntityImpact(id);
    if (!impact) {
      toast.error('Entidad no encontrada');
      return;
    }
    const isEmpty = impact.categories.length === 0 && impact.totalDocuments === 0;
    const ok = await confirm({
      title: `Eliminar entidad "${name}"`,
      description: isEmpty ? (
        <>Esta entidad está vacía y se eliminará definitivamente.</>
      ) : (
        <div className="space-y-2 text-sm">
          <p>
            Contiene <strong>{impact.categories.length}</strong> categoría(s) y un total de{' '}
            <strong>{impact.totalDocuments}</strong> documento(s).
          </p>
          {impact.categories.length > 0 && (
            <ul className="list-disc pl-5">
              {impact.categories.map((c) => (
                <li key={c.id}>
                  {c.name} <span className="text-muted-foreground">({c.documentCount})</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground">Se aplicará un soft delete; un administrador podrá restaurarla.</p>
        </div>
      ),
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await deleteEntity(id);
    if (res.ok) toast.success(res.data?.hardDeleted ? 'Entidad eliminada definitivamente' : 'Entidad eliminada');
    else toast.error(res.error);
  }

  async function onDeleteCategory(id: string, name: string) {
    const impact = await getCategoryImpact(id);
    if (!impact) {
      toast.error('Categoría no encontrada');
      return;
    }
    const ok = await confirm({
      title: `Eliminar categoría "${name}"`,
      description: (
        <div className="space-y-2 text-sm">
          <p>
            Contiene <strong>{impact.documentCount}</strong> documento(s).
          </p>
          <p className="text-muted-foreground">Se aplicará un soft delete; un administrador podrá restaurarla.</p>
        </div>
      ),
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await deleteCategory(id);
    if (res.ok) toast.success('Categoría eliminada');
    else toast.error(res.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar entidad…" className="pl-9" />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" /> Crear
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => setDialog({ kind: 'createEntity' })}>
              <FolderPlus className="h-4 w-4" /> Nueva entidad
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setDialog({ kind: 'createCategory' })} disabled={entities.length === 0}>
              <Plus className="h-4 w-4" /> Nueva categoría
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {entities.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay entidades que coincidan con la búsqueda.</p>
      ) : (
        <div className="space-y-3">
          {entities.map((entity) => (
            <div key={entity.id} className="rounded-lg border bg-card">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <div>
                  <h2 className="font-semibold text-lg">{entity.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {entity.categories.length} categoría(s) · {entity.documentCount} documento(s)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDialog({ kind: 'createCategory', entityId: entity.id })}
                  >
                    <Plus className="h-4 w-4" /> Categoría
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Modificar"
                    onClick={() => setDialog({ kind: 'editEntity', id: entity.id, name: entity.name })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar"
                    onClick={() => onDeleteEntity(entity.id, entity.name)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              {entity.categories.length === 0 ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">Sin categorías.</p>
              ) : (
                <ul className="divide-y">
                  {entity.categories.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-4 py-2">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.documentCount} documento(s)</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Modificar"
                          onClick={() => setDialog({ kind: 'editCategory', id: c.id, name: c.name })}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Eliminar"
                          onClick={() => onDeleteCategory(c.id, c.name)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      <EntityFormDialog
        open={dialog.kind === 'createEntity' || dialog.kind === 'editEntity'}
        mode={dialog.kind === 'editEntity' ? 'edit' : 'create'}
        defaultName={dialog.kind === 'editEntity' ? dialog.name : ''}
        onClose={() => setDialog({ kind: 'none' })}
        onSubmit={async (fd) => {
          const res =
            dialog.kind === 'editEntity'
              ? await updateEntity(dialog.id, fd)
              : await createEntity(fd);
          if (res.ok) {
            toast.success(dialog.kind === 'editEntity' ? 'Entidad actualizada' : 'Entidad creada');
            setDialog({ kind: 'none' });
          } else toast.error(res.error);
        }}
      />
      <CategoryFormDialog
        open={dialog.kind === 'createCategory' || dialog.kind === 'editCategory'}
        mode={dialog.kind === 'editCategory' ? 'edit' : 'create'}
        defaultName={dialog.kind === 'editCategory' ? dialog.name : ''}
        defaultEntityId={dialog.kind === 'createCategory' ? dialog.entityId : undefined}
        entities={entities.map((e) => ({ id: e.id, name: e.name }))}
        onClose={() => setDialog({ kind: 'none' })}
        onSubmit={async (fd) => {
          const res =
            dialog.kind === 'editCategory'
              ? await updateCategory(dialog.id, fd)
              : await createCategory(fd);
          if (res.ok) {
            toast.success(dialog.kind === 'editCategory' ? 'Categoría actualizada' : 'Categoría creada');
            setDialog({ kind: 'none' });
          } else toast.error(res.error);
        }}
      />
    </div>
  );
}

function EntityFormDialog({
  open,
  mode,
  defaultName,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  defaultName: string;
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva entidad' : 'Modificar entidad'}</DialogTitle>
          <DialogDescription>Las entidades agrupan categorías y documentos.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(() => onSubmit(fd));
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="entity-name">Nombre</Label>
            <Input id="entity-name" name="name" defaultValue={defaultName} required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormDialog({
  open,
  mode,
  defaultName,
  defaultEntityId,
  entities,
  onClose,
  onSubmit,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  defaultName: string;
  defaultEntityId?: string;
  entities: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (fd: FormData) => Promise<void>;
}) {
  const [pending, start] = React.useTransition();
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Nueva categoría' : 'Modificar categoría'}</DialogTitle>
          <DialogDescription>Las categorías pertenecen a una entidad.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(() => onSubmit(fd));
          }}
          className="space-y-4"
        >
          {mode === 'create' && (
            <div className="space-y-2">
              <Label htmlFor="cat-entity">Entidad</Label>
              <select
                id="cat-entity"
                name="entityId"
                defaultValue={defaultEntityId ?? ''}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="" disabled>
                  Seleccionar…
                </option>
                {entities.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="cat-name">Nombre</Label>
            <Input id="cat-name" name="name" defaultValue={defaultName} required autoFocus />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
