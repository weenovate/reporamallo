import Link from 'next/link';
import { FileText, FolderTree, Settings, Users, History, Trash2 } from 'lucide-react';
import type { SessionUser } from '@/lib/auth/session';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';
import { UserMenu } from '@/components/layout/user-menu';

export function Navbar({ user }: { user: SessionUser }) {
  return (
    <header className="border-b bg-card">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/documentos" className="font-semibold tracking-tight">
            Repositorio Ramallo
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            <NavLink href="/documentos" icon={<FileText className="h-4 w-4" />}>
              Documentos
            </NavLink>
            <NavLink href="/entidades" icon={<FolderTree className="h-4 w-4" />}>
              Entidades
            </NavLink>
            {user.role === 'ADMIN' && (
              <>
                <NavLink href="/usuarios" icon={<Users className="h-4 w-4" />}>
                  Usuarios
                </NavLink>
                <NavLink href="/papelera" icon={<Trash2 className="h-4 w-4" />}>
                  Papelera
                </NavLink>
                <NavLink href="/auditoria" icon={<History className="h-4 w-4" />}>
                  Auditoría
                </NavLink>
                <NavLink href="/configuracion" icon={<Settings className="h-4 w-4" />}>
                  Configuración
                </NavLink>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <ThemeSwitcher />
          <UserMenu firstName={user.firstName} lastName={user.lastName} email={user.email} />
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {children}
    </Link>
  );
}
