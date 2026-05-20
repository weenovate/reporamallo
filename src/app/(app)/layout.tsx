import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { logoutAction } from '@/server/actions/auth';
import { Button } from '@/components/ui/button';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/documentos" className="font-semibold">
              Repositorio Ramallo
            </Link>
            <nav className="hidden md:flex gap-4 text-sm text-muted-foreground">
              <Link href="/documentos" className="hover:text-foreground">Documentos</Link>
              <Link href="/entidades" className="hover:text-foreground">Entidades</Link>
              {user.role === 'ADMIN' && (
                <>
                  <Link href="/usuarios" className="hover:text-foreground">Usuarios</Link>
                  <Link href="/configuracion" className="hover:text-foreground">Configuración</Link>
                </>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/perfil" className="hover:text-primary">
              {user.firstName} {user.lastName}
            </Link>
            <form action={logoutAction}>
              <Button type="submit" variant="ghost" size="sm">
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
