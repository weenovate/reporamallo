import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Repositorio Ramallo',
  description: 'Repositorio documental de la Municipalidad de Ramallo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" data-theme="light-azul" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
