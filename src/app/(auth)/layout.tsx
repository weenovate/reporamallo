import Link from 'next/link';
import { ThemeSwitcher } from '@/components/theme/theme-switcher';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center justify-between">
          <Link href="/" className="font-semibold text-foreground">
            Repositorio Ramallo
          </Link>
          <ThemeSwitcher />
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
