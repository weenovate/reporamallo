import { requireAdmin } from '@/lib/auth/session';
import { UserForm } from '../_components/user-form';

export const metadata = { title: 'Nuevo usuario — Repositorio Ramallo' };

export default async function NuevoUsuarioPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nuevo usuario</h1>
        <p className="text-sm text-muted-foreground">Creá un usuario con rol Admin o Gestor.</p>
      </div>
      <UserForm mode="create" />
    </div>
  );
}
