'use client';

import Link from 'next/link';
import { KeyRound, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { deleteUser, sendResetLinkForUser } from '@/server/actions/users';

type Row = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'GESTOR';
  createdAt: string;
  createdBy: string | null;
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR');
}

export function UsersTable({ rows }: { rows: Row[] }) {
  const confirm = useConfirm();

  async function onDelete(r: Row) {
    const ok = await confirm({
      title: 'Eliminar usuario',
      description: (
        <p>
          ¿Eliminar a <strong>{r.username}</strong>? Sus sesiones se cerrarán. Podrás restaurarlo desde la papelera.
        </p>
      ),
      confirmLabel: 'Eliminar',
      variant: 'destructive',
    });
    if (!ok) return;
    const res = await deleteUser(r.id);
    if (res.ok) toast.success('Usuario eliminado');
    else toast.error(res.error);
  }

  async function onSendReset(r: Row) {
    const ok = await confirm({
      title: 'Enviar enlace de reset',
      description: (
        <p>
          Se enviará un email a <strong>{r.email}</strong> con un enlace válido por 1 hora.
        </p>
      ),
      confirmLabel: 'Enviar',
    });
    if (!ok) return;
    const res = await sendResetLinkForUser(r.id);
    if (res.ok) toast.success('Enlace de reset enviado');
    else toast.error(res.error);
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Nombre</th>
            <th className="px-3 py-2 font-medium">Apellido</th>
            <th className="px-3 py-2 font-medium">Usuario</th>
            <th className="px-3 py-2 font-medium">Email</th>
            <th className="px-3 py-2 font-medium">Rol</th>
            <th className="px-3 py-2 font-medium">Alta</th>
            <th className="px-3 py-2 font-medium">Creado por</th>
            <th className="px-3 py-2 font-medium text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((u) => (
            <tr key={u.id} className="hover:bg-muted/30">
              <td className="px-3 py-2">{u.firstName}</td>
              <td className="px-3 py-2">{u.lastName}</td>
              <td className="px-3 py-2 font-medium">{u.username}</td>
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    u.role === 'ADMIN'
                      ? 'rounded bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary'
                      : 'rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground'
                  }
                >
                  {u.role}
                </span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap">{fmt(u.createdAt)}</td>
              <td className="px-3 py-2 text-muted-foreground">{u.createdBy ?? '—'}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-1">
                  <Button size="icon" variant="ghost" aria-label="Enviar enlace de reset" onClick={() => onSendReset(u)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button asChild size="icon" variant="ghost" aria-label="Modificar">
                    <Link href={`/usuarios/${u.id}/editar`}>
                      <Pencil className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" aria-label="Eliminar" onClick={() => onDelete(u)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                Sin usuarios.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
