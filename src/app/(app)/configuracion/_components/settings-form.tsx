'use client';

import { useActionState, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { saveSettings, type ActionResult } from '@/server/actions/settings';

type Props = {
  defaults: { tagsDefaultCount: number; extractMaxChars: number; smtpFrom: string };
};

export function SettingsForm({ defaults }: Props) {
  const [state, formAction, isPending] = useActionState<ActionResult | null, FormData>(saveSettings, null);

  useEffect(() => {
    if (state?.ok) toast.success('Configuración guardada');
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Documentos</CardTitle>
          <CardDescription>Defaults aplicados al crear nuevos documentos.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tagsDefaultCount">Tags por defecto</Label>
            <Input
              id="tagsDefaultCount"
              name="tagsDefaultCount"
              type="number"
              min={1}
              max={50}
              defaultValue={defaults.tagsDefaultCount}
              required
            />
            <p className="text-xs text-muted-foreground">Cantidad de tags sugeridos automáticamente.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="extractMaxChars">Caracteres máximos del extracto</Label>
            <Input
              id="extractMaxChars"
              name="extractMaxChars"
              type="number"
              min={50}
              max={5000}
              defaultValue={defaults.extractMaxChars}
              required
            />
            <p className="text-xs text-muted-foreground">Longitud máxima del extracto sugerido del PDF.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email (Resend)</CardTitle>
          <CardDescription>Configuración del servicio SMTP usado para reset de contraseña.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smtpFrom">Remitente</Label>
            <Input
              id="smtpFrom"
              name="smtpFrom"
              defaultValue={defaults.smtpFrom}
              placeholder='Repositorio Ramallo <no-reply@ramallo.gob.ar>'
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtpToken">API Key de Resend</Label>
            <Input
              id="smtpToken"
              name="smtpToken"
              type="password"
              placeholder="Dejar vacío para no modificar"
              autoComplete="new-password"
            />
            <p className="text-xs text-muted-foreground">
              El valor se guarda en AppSetting `smtp.token`. Si lo dejás vacío, no se modifica el valor actual.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Guardando…' : 'Guardar configuración'}
        </Button>
      </div>
    </form>
  );
}
