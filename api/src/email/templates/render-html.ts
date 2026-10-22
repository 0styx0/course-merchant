import type { EmailContent } from "./email-content.js";

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Email clients ignore most stylesheets, so styles are inline and the layout
// is a table.
const FONT = "-apple-system,'Segoe UI',Helvetica,Arial,sans-serif";

function renderButton(button: NonNullable<EmailContent["button"]>): string {
  return `<tr><td style="padding:8px 32px 24px">
<a href="${escapeHtml(button.url)}" style="display:inline-block;padding:12px 24px;background:#111827;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:600">${escapeHtml(button.label)}</a>
</td></tr>`;
}

export function renderHtml(content: EmailContent, shopName: string): string {
  const paragraphs = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.5">${escapeHtml(paragraph)}</p>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};color:#111827">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px">
<tr><td style="padding:24px 32px;border-bottom:1px solid #e5e7eb;font-size:18px;font-weight:700">${escapeHtml(shopName)}</td></tr>
<tr><td style="padding:32px 32px 8px">
<h1 style="margin:0 0 16px;font-size:22px;line-height:1.3">${escapeHtml(content.heading)}</h1>
${paragraphs}
</td></tr>
${content.button ? renderButton(content.button) : ""}
<tr><td style="padding:16px 32px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280">Sent by ${escapeHtml(shopName)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
