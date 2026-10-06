// One layout for every WorkAI email: quiet, monochrome, lots of air. Wordmark, hairline, large serif
// heading, body copy, a details ledger, one black button, a short legal footer.
// Tables and inline styles only, since email apps ignore stylesheets and modern layout.
export type EmailContent = {
  // Shown by inboxes next to the subject
  preview: string;
  heading: string;
  paragraphs: string[];
  // Label and value pairs, shown as ledger rows (sign-in details)
  details?: [string, string][];
  button?: { label: string; url: string };
  // Smaller text under the button
  after?: string[];
};

const esc = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SERIF =
  "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

const INK = '#111111';
const BODY = '#3d3d3d';
const MUTED = '#8a8a8a';
const LINE = '#e6e6e6';

export function renderEmail(
  c: EmailContent,
  appUrl: string,
): { html: string; text: string } {
  const year = new Date().getFullYear();
  const host = appUrl.replace(/^https?:\/\//, '');

  const paragraphs = c.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 18px;font:16px/1.7 ${SANS};color:${BODY};">${esc(p)}</p>`,
    )
    .join('');

  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:30px 0 34px;border-top:1px solid ${INK};border-bottom:1px solid ${LINE};">
        ${c.details
          .map(
            ([label, value], i) => `
        <tr>
          <td style="padding:16px 0;${i ? `border-top:1px solid ${LINE};` : ''}font:600 11px/1.4 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:${MUTED};vertical-align:top;width:40%;">${esc(label)}</td>
          <td style="padding:16px 0;${i ? `border-top:1px solid ${LINE};` : ''}font:15px/1.5 ${MONO};color:${INK};word-break:break-all;text-align:right;vertical-align:top;">${esc(value)}</td>
        </tr>`,
          )
          .join('')}
      </table>`
    : '';

  const button = c.button
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;">
        <tr><td align="center" style="background:${INK};border-radius:3px;">
          <a href="${esc(c.button.url)}" target="_blank" style="display:block;padding:17px 28px;font:600 14px/1 ${SANS};color:#ffffff;text-decoration:none;letter-spacing:.06em;text-transform:uppercase;">${esc(c.button.label)}</a>
        </td></tr>
      </table>
      <p style="margin:0 0 30px;font:12px/1.7 ${SANS};color:${MUTED};">If the button does not open, paste this address into your browser:<br><a href="${esc(c.button.url)}" style="color:${BODY};word-break:break-all;">${esc(c.button.url)}</a></p>`
    : '';

  const after = (c.after ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 10px;font:13px/1.7 ${SANS};color:${MUTED};">${esc(p)}</p>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f3;-webkit-font-smoothing:antialiased;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(c.preview)}${'&#8204;&nbsp;'.repeat(40)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f3;">
  <tr><td align="center" style="padding:48px 20px 56px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

      <tr><td style="padding:0 8px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="font:700 15px/1 ${SANS};letter-spacing:.22em;color:${INK};">BLACKORWHITE</td>
            <td align="right" style="font:500 10px/1 ${MONO};letter-spacing:.24em;color:${MUTED};">WORKAI</td>
          </tr>
        </table>
      </td></tr>

      <tr><td style="background:#ffffff;border:1px solid ${LINE};padding:56px 56px 48px;">
        <h1 style="margin:0 0 28px;font:400 34px/1.2 ${SERIF};letter-spacing:-.01em;color:${INK};">${esc(c.heading)}</h1>
        ${paragraphs}
        ${details}
        ${button}
        ${after}
      </td></tr>

      <tr><td style="padding:32px 8px 0;">
        <p style="margin:0 0 10px;font:12px/1.7 ${SANS};color:${MUTED};">This message was sent to you because you have an account with WorkAI, the client and project workspace of BLACKORWHITE. It was sent automatically; replies are read by the team.</p>
        <p style="margin:0;font:12px/1.7 ${SANS};color:${MUTED};">&copy; ${year} BLACKORWHITE &nbsp;&middot;&nbsp; <a href="${esc(appUrl)}" style="color:${MUTED};text-decoration:underline;">${esc(host)}</a></p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    'BLACKORWHITE · WORKAI',
    '',
    c.heading,
    '',
    ...c.paragraphs.flatMap((p) => [p, '']),
    ...(c.details ?? []).map(([label, value]) => `${label}: ${value}`),
    ...(c.details?.length ? [''] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ''] : []),
    ...(c.after ?? []),
    '',
    `© ${year} BLACKORWHITE · ${appUrl}`,
  ].join('\n');

  return { html, text };
}
