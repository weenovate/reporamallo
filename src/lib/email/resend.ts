import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export type SendArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(args: SendArgs): Promise<{ ok: boolean; reason?: string }> {
  const from = process.env.RESEND_FROM ?? 'no-reply@example.com';
  const resend = getClient();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY no configurado, simulando envio:', args.subject, '->', args.to);
    return { ok: false, reason: 'not_configured' };
  }
  const { error } = await resend.emails.send({ from, to: args.to, subject: args.subject, html: args.html, text: args.text });
  if (error) {
    console.error('[email] error enviando', error);
    return { ok: false, reason: error.message };
  }
  return { ok: true };
}

export function passwordResetTemplate(link: string, firstName: string) {
  const subject = 'Restablece tu contraseña — Repositorio Ramallo';
  const text = `Hola ${firstName},\n\nRecibimos un pedido para restablecer tu contraseña.\nUsa este enlace dentro de la próxima hora:\n\n${link}\n\nSi no fuiste vos, ignorá este mensaje.`;
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111">
    <p>Hola ${firstName},</p>
    <p>Recibimos un pedido para restablecer tu contraseña en <strong>Repositorio Ramallo</strong>.</p>
    <p>Usá este enlace dentro de la próxima hora:</p>
    <p><a href="${link}" style="display:inline-block;padding:10px 16px;background:#1d4ed8;color:#fff;border-radius:6px;text-decoration:none">Restablecer contraseña</a></p>
    <p>Si no fuiste vos, ignorá este mensaje.</p>
  </body></html>`;
  return { subject, html, text };
}
