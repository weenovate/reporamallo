'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { forgotPasswordAction, type ActionResult } from '@/server/actions/auth';

export function ForgotForm() {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(forgotPasswordAction, null);

  if (state?.ok) {
    return (
      <div className="space-y-3 text-sm">
        <p>
          Si el email existe en el sistema, te enviamos un enlace para restablecer la contraseña. El enlace expira en
          1 hora.
        </p>
        <Link href="/login" className="text-primary hover:underline">
          Volver al login
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Enviando…' : 'Enviar enlace'}
      </Button>
      <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-primary">
        Volver al login
      </Link>
    </form>
  );
}
