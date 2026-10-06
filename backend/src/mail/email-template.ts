// One layout for every WorkAI email: black brand bar, white card, details box, one button.
// Tables and inline styles only, since email apps ignore stylesheets and modern layout.
export type EmailContent = {
  // Shown by inboxes next to the subject
  preview: string;
  heading: string;
  paragraphs: string[];
  // Label and value pairs, shown in a box in a monospace font (sign-in details)
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

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const MONO = "'SFMono-Regular', Menlo, Consolas, 'Courier New', monospace";

export function renderEmail(
  c: EmailContent,
  appUrl: string,
): { html: string; text: string } {
  const paragraphs = c.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font:15px/1.6 ${FONT};color:#1a1a1a;">${esc(p)}</p>`,
    )
    .join('');

  const details = c.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;background:#f4f4f4;border:1px solid #e2e2e2;border-radius:8px;">
        <tr><td style="padding:16px 20px;">
          ${c.details
            .map(
              ([label, value]) => `
          <p style="margin:0 0 2px;font:600 11px/1.4 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6b6b6b;">${esc(label)}</p>
          <p style="margin:0 0 12px;font:16px/1.4 ${MONO};color:#000;word-break:break-all;">${esc(value)}</p>`,
            )
            .join('')}
        </td></tr>
      </table>`
    : '';

  const button = c.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td style="background:#000;border-radius:6px;">
          <a href="${esc(c.button.url)}" target="_blank" style="display:inline-block;padding:13px 26px;font:700 14px/1 ${FONT};color:#fff;text-decoration:none;letter-spacing:.02em;">${esc(c.button.label)} &rarr;</a>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;font:12px/1.5 ${FONT};color:#6b6b6b;">Button not working? Copy this link into your browser:<br><a href="${esc(c.button.url)}" style="color:#000;word-break:break-all;">${esc(c.button.url)}</a></p>`
    : '';

  const after = (c.after ?? [])
    .map(
      (p) =>
        `<p style="margin:0 0 10px;font:13px/1.6 ${FONT};color:#4a4a4a;">${esc(p)}</p>`,
    )
    .join('');

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(c.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#ececec;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(c.preview)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ececec;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="background:#000;border-radius:10px 10px 0 0;padding:22px 32px;">
        <span style="font:800 18px/1 ${FONT};letter-spacing:.14em;color:#fff;">BLACKORWHITE</span>
        <span style="font:600 11px/1 ${MONO};letter-spacing:.18em;color:#9a9a9a;padding-left:8px;">WORKAI</span>
      </td></tr>
      <tr><td style="background:#fff;border-radius:0 0 10px 10px;padding:36px 32px 28px;">
        <h1 style="margin:0 0 20px;font:800 24px/1.25 ${FONT};color:#000;">${esc(c.heading)}</h1>
        ${paragraphs}
        ${details}
        ${button}
        ${after}
      </td></tr>
      <tr><td align="center" style="padding:20px 32px;">
        <p style="margin:0;font:12px/1.6 ${FONT};color:#8a8a8a;">Sent by WorkAI &middot; <a href="${esc(appUrl)}" style="color:#8a8a8a;">${esc(appUrl.replace(/^https?:\/\//, ''))}</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const text = [
    c.heading,
    '',
    ...c.paragraphs.flatMap((p) => [p, '']),
    ...(c.details ?? []).map(([label, value]) => `${label}: ${value}`),
    ...(c.details?.length ? [''] : []),
    ...(c.button ? [`${c.button.label}: ${c.button.url}`, ''] : []),
    ...(c.after ?? []),
    '',
    `WorkAI · ${appUrl}`,
  ].join('\n');

  return { html, text };
}
