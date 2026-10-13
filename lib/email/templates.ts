import {
  emailButton,
  emailCallout,
  emailHeading,
  emailLayout,
  emailParagraph,
  escapeHtml,
} from "./layout";

type Rendered = { subject: string; html: string; text: string };

function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/+$/,
    "",
  );
}

/* ---------- Welcome ---------- */

export function welcomeEmail(input: { name: string }): Rendered {
  const subject = "Welcome to ADFLOW";
  const html = emailLayout({
    preview: `Welcome, ${input.name}`,
    bodyHtml: `
      ${emailHeading(`Welcome to ADFLOW, ${input.name}!`)}
      ${emailParagraph(
        "You're ready to run campaigns, work with creators, and track performance — all in one place.",
      )}
      ${emailCallout(
        "Tip: Create an organization first. Every campaign belongs to an organization, and your wallet lives there too.",
      )}
      ${emailButton(`${appUrl()}/advertiser`, "Open the workspace")}
    `,
  });

  return {
    subject,
    html,
    text: `Welcome to ADFLOW, ${input.name}!\n\n${appUrl()}/advertiser`,
  };
}

/* ---------- Verify email ---------- */

export function verifyEmailTemplate(input: {
  name: string;
  token: string;
}): Rendered {
  const url = `${appUrl()}/verify-email?token=${encodeURIComponent(input.token)}`;
  const subject = "Verify your ADFLOW email";
  const html = emailLayout({
    preview: "Confirm your email address",
    bodyHtml: `
      ${emailHeading("Confirm your email")}
      ${emailParagraph(
        `Hi ${escapeHtml(input.name)}, please confirm this email address so you can receive payout alerts and important account notices.`,
      )}
      ${emailButton(url, "Verify email")}
      ${emailParagraph(
        "This link expires in 24 hours. If you didn't create an ADFLOW account, you can safely ignore this message.",
      )}
    `,
  });

  return {
    subject,
    html,
    text: `Verify your email: ${url}`,
  };
}

/* ---------- Password reset ---------- */

export function passwordResetEmail(input: {
  name: string;
  token: string;
}): Rendered {
  const url = `${appUrl()}/reset-password?token=${encodeURIComponent(input.token)}`;
  const subject = "Reset your ADFLOW password";
  const html = emailLayout({
    preview: "Reset your password",
    bodyHtml: `
      ${emailHeading("Reset your password")}
      ${emailParagraph(
        `Hi ${escapeHtml(input.name)}, use the button below to set a new password.`,
      )}
      ${emailButton(url, "Reset password")}
      ${emailParagraph(
        "This link expires in 30 minutes. If you didn't request a reset, you can ignore this email — your password is unchanged.",
      )}
    `,
  });

  return { subject, html, text: `Reset your password: ${url}` };
}

/* ---------- Invitation (existing org) ---------- */

export function organizationInvitationEmail(input: {
  organizationName: string;
  role: string;
  inviterName: string;
  acceptUrl: string;
}): Rendered {
  const subject = `You're invited to ${input.organizationName} on ADFLOW`;
  const html = emailLayout({
    preview: `Join ${input.organizationName}`,
    bodyHtml: `
      ${emailHeading(`Join ${escapeHtml(input.organizationName)}`)}
      ${emailParagraph(
        `${escapeHtml(input.inviterName)} invited you as <strong>${escapeHtml(input.role)}</strong>.`,
      )}
      ${emailButton(input.acceptUrl, "Accept invitation")}
      ${emailParagraph(
        "This invitation expires in 7 days. If you weren't expecting it, you can ignore this email.",
      )}
    `,
  });

  return { subject, html, text: `Accept invitation: ${input.acceptUrl}` };
}

/* ---------- Campaign invitation ---------- */

export function campaignInvitationEmail(input: {
  campaignTitle: string;
  organizationName: string;
  advertiserName: string;
  message?: string;
  acceptUrl: string;
}): Rendered {
  const subject = `${input.organizationName} invited you to "${input.campaignTitle}"`;
  const html = emailLayout({
    preview: `New campaign invitation`,
    bodyHtml: `
      ${emailHeading("You have a campaign invitation")}
      ${emailParagraph(
        `<strong>${escapeHtml(input.organizationName)}</strong> wants you to join <strong>${escapeHtml(input.campaignTitle)}</strong>.`,
      )}
      ${
        input.message
          ? emailCallout(escapeHtml(input.message))
          : ""
      }
      ${emailButton(input.acceptUrl, "View invitation")}
      ${emailParagraph(
        "You have 14 days to accept. Review the campaign requirements before committing.",
      )}
    `,
  });

  return { subject, html, text: `View invitation: ${input.acceptUrl}` };
}

/* ---------- Generic notification digest ---------- */

export function notificationDigestEmail(input: {
  name: string;
  items: Array<{ title: string; message: string; href?: string }>;
}): Rendered {
  const count = input.items.length;
  const subject = `${count} new update${count === 1 ? "" : "s"} on ADFLOW`;

  const items = input.items
    .map(
      (item) => `
      <div style="padding:14px 0;border-top:1px solid rgba(255,255,255,0.08);">
        <p style="margin:0;font-weight:600;color:#ffffff;font-size:15px;">${escapeHtml(item.title)}</p>
        <p style="margin:4px 0 0;color:#cbd5e1;font-size:14px;line-height:1.55;">${escapeHtml(item.message)}</p>
        ${
          item.href
            ? `<p style="margin:8px 0 0;"><a href="${appUrl()}${item.href}" style="color:#a78bfa;font-size:13px;text-decoration:none;">Open →</a></p>`
            : ""
        }
      </div>`,
    )
    .join("");

  const html = emailLayout({
    preview: `${count} new notification${count === 1 ? "" : "s"}`,
    bodyHtml: `
      ${emailHeading(`Hi ${escapeHtml(input.name)}, here's what's new`)}
      ${emailParagraph(
        `You have ${count} unread notification${count === 1 ? "" : "s"} on ADFLOW.`,
      )}
      ${items}
      ${emailButton(`${appUrl()}/notifications`, "Open notifications")}
    `,
  });

  return { subject, html, text: `${count} unread notifications: ${appUrl()}/notifications` };
}

/* ---------- Payout sent ---------- */

export function payoutSentEmail(input: {
  name: string;
  amount: number;
  currency: string;
  destinationLabel: string;
  reference: string;
}): Rendered {
  const subject = `Payout sent — ${input.currency} ${input.amount.toFixed(2)}`;
  const html = emailLayout({
    preview: "Your payout has been processed",
    bodyHtml: `
      ${emailHeading("Your payout is on the way")}
      ${emailParagraph(
        `Hi ${escapeHtml(input.name)}, we've sent <strong>${input.currency} ${input.amount.toFixed(
          2,
        )}</strong> to <strong>${escapeHtml(input.destinationLabel)}</strong>.`,
      )}
      ${emailCallout(`Reference: ${escapeHtml(input.reference)}`)}
      ${emailParagraph(
        "Depending on your bank or payment provider, funds may take 1–3 business days to arrive.",
      )}
      ${emailButton(`${appUrl()}/creator/payouts`, "View payout history")}
    `,
  });

  return {
    subject,
    html,
    text: `Payout sent: ${input.currency} ${input.amount.toFixed(2)} (${input.reference})`,
  };
}
