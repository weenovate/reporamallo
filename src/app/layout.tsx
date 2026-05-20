import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { ThemeScript } from '@/components/theme/theme-script';
import { Toaster } from '@/components/ui/toaster';
import { ConfirmDialogProvider } from '@/components/ui/confirm-dialog';

export const metadata: Metadata = {
  title: 'Repositorio Ramallo',
  description: 'Repositorio documental de la Municipalidad de Ramallo',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <ConfirmDialogProvider>
            {children}
            <Toaster />
          </ConfirmDialogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
