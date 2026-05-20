import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ForgotForm } from '@/components/auth/forgot-form';

export const metadata = { title: 'Olvidé mi contraseña — Repositorio Ramallo' };

export default function ForgotPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Olvidé mi contraseña</CardTitle>
        <CardDescription>Ingresá tu email y te enviamos un enlace para restablecerla.</CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotForm />
      </CardContent>
    </Card>
  );
}
