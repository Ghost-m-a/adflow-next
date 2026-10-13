export function emailLayout({
  preview,
  bodyHtml,
}: {
  preview?: string;
  bodyHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ADFLOW</title>
</head>
<body style="margin:0;padding:0;background:#0b0f19;color:#e5e7eb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <span style="display:none;color:transparent;visibility:hidden;height:0;width:0;font-size:1px;">
    ${preview ?? "ADFLOW notification"}
  </span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0b0f19;">
    <tr>
      <td align="center" style="padding:32px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#111521;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:24px 28px 8px;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}" style="text-decoration:none;">
                <span style="font-size:20px;font-weight:900;letter-spacing:-0.02em;color:#ffffff;">AD<span style="color:#a78bfa;">FLOW</span></span>
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px 24px;border-top:1px solid rgba(255,255,255,0.06);font-size:12px;color:#64748b;">
              <p style="margin:0;">You received this because you have an account on ADFLOW.</p>
              <p style="margin:6px 0 0;">© ${new Date().getFullYear()} ADFLOW</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailHeading(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:700;line-height:1.25;color:#ffffff;">${escapeHtml(
    text,
  )}</h1>`;
}

export function emailParagraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#cbd5e1;">${text}</p>`;
}

export function emailButton(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;">
    <tr>
      <td style="border-radius:12px;background:#8b5cf6;">
        <a href="${href}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px;">${escapeHtml(
          label,
        )}</a>
      </td>
    </tr>
  </table>`;
}

export function emailCallout(text: string): string {
  return `<div style="margin:16px 0;padding:14px 16px;background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.2);border-radius:12px;font-size:14px;line-height:1.55;color:#ddd6fe;">${text}</div>`;
}

export function emailDivider(): string {
  return `<hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:20px 0;">`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
