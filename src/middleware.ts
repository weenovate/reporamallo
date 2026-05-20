import { NextResponse, type NextRequest } from 'next/server';

const SESSION_COOKIE = 'reporamallo_session';

const PROTECTED_PREFIXES = [
  '/documentos',
  '/entidades',
  '/usuarios',
  '/perfil',
  '/configuracion',
  '/auditoria',
  '/papelera',
];
const PUBLIC_AUTH_PATHS = ['/login', '/forgot-password', '/reset-password'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  const isAuthPage = PUBLIC_AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (isAuthPage && hasSession && pathname === '/login') {
    const url = req.nextUrl.clone();
    url.pathname = '/documentos';
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/.*).*)'],
};
