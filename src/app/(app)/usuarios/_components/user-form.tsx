'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createUser, updateUser } from '@/server/actions/users';

type Defaults = {
  id?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  role?: 'ADMIN' | 'GESTOR';
};

type Props = { mode: 'create' | 'edit'; defaults?: Defaults };

export function UserForm({ mode, defaults }: Props) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const res = mode === 'create' ? await createUser(fd) : await updateUser(defaults!.id!, fd);
          if (res.ok) {
            toast.success(mode === 'create' ? 'Usuario creado' : 'Usuario actualizado');
            router.push('/usuarios');
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
      className="grid gap-4 md:grid-cols-2 max-w-3xl"
    >
      <div className="space-y-2">
        <Label htmlFor="firstName">Nombre</Label>
        <Input id="firstName" name="firstName" defaultValue={defaults?.firstName ?? ''} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Apellido</Label>
        <Input id="lastName" name="lastName" defaultValue={defaults?.lastName ?? ''} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input id="username" name="username" defaultValue={defaults?.username ?? ''} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={defaults?.email ?? ''} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <select
          id="role"
          name="role"
          defaultValue={defaults?.role ?? 'GESTOR'}
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="GESTOR">GESTOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </div>
      {mode === 'create' && (
        <div className="space-y-2">
          <Label htmlFor="password">Contraseña inicial</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
          <p className="text-xs text-muted-foreground">El usuario podrá cambiarla desde su perfil.</p>
        </div>
      )}
      <div className="md:col-span-2 flex justify-end gap-2">
        <Button asChild variant="outline" type="button">
          <Link href="/usuarios">Cancelar</Link>
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? 'Guardando…' : mode === 'create' ? 'Crear usuario' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
