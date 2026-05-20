import { requireAdmin } from '@/lib/auth/session';
import { getSettings } from '@/lib/config/settings';
import { SettingsForm } from './_components/settings-form';

export const metadata = { title: 'Configuración — Repositorio Ramallo' };
export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Parámetros globales de la aplicación. Solo administradores.</p>
      </div>
      <SettingsForm defaults={settings} />
    </div>
  );
}
