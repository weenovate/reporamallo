'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resetPasswordAction, type ActionResult } from '@/server/actions/auth';

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(resetPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="space-y-3 text-sm">
        <p>Contraseña actualizada. Ya podés iniciar sesión.</p>
        <Link href="/login" className="text-primary hover:underline">
          Ir al login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">Nueva contraseña</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">Confirmar</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar nueva contraseña'}
      </Button>
    </form>
  );
}
