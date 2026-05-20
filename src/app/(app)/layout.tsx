import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { Navbar } from '@/components/layout/navbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar user={user} />
      <main className="flex-1 container py-8">{children}</main>
    </div>
  );
}
