'use client';

import { useActionState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { changePasswordAction, type ActionResult } from '@/server/actions/auth';

export function ChangePasswordForm() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(changePasswordAction, null);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success('Contraseña actualizada');
      ref.current?.reset();
    } else if (state && !state.ok) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="grid gap-4 sm:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="current">Contraseña actual</Label>
        <Input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">Nueva</Label>
        <Input id="next" name="next" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="sm:col-span-3 flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Cambiar contraseña'}
        </Button>
      </div>
    </form>
  );
}
