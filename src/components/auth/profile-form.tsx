'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateProfileAction, type ActionResult } from '@/server/actions/auth';

type Props = {
  defaults: { firstName: string; lastName: string; email: string; username: string };
};

export function ProfileForm({ defaults }: Props) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(updateProfileAction, null);

  useEffect(() => {
    if (state?.ok) toast.success('Perfil actualizado');
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="firstName">Nombre</Label>
        <Input id="firstName" name="firstName" defaultValue={defaults.firstName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="lastName">Apellido</Label>
        <Input id="lastName" name="lastName" defaultValue={defaults.lastName} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Usuario</Label>
        <Input id="username" name="username" defaultValue={defaults.username} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={defaults.email} required />
      </div>
      <div className="sm:col-span-2 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </form>
  );
}
