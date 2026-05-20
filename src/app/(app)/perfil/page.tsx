import { requireUser } from '@/lib/auth/session';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ProfileForm } from '@/components/auth/profile-form';
import { ChangePasswordForm } from '@/components/auth/change-password-form';

export const metadata = { title: 'Perfil — Repositorio Ramallo' };

export default async function PerfilPage() {
  const user = await requireUser();
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Mi perfil</h1>
        <p className="text-sm text-muted-foreground">Editá tus datos y tu contraseña.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
          <CardDescription>Actualizá tu nombre, usuario y email.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            defaults={{
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              username: user.username,
            }}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
          <CardDescription>Necesitás ingresar la contraseña actual.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
