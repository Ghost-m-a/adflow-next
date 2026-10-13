import { Resend } from "resend";

import type { EmailCategory } from "./preferences";

type SendInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  /** Used only for logging — the caller is responsible for the
   * preference check. */
  category?: EmailCategory;
};

export type EmailResult =
  | { ok: true; id: string; provider: string }
  | { ok: false; error: string; provider: string };

function provider(): "console" | "resend" {
  return (process.env.EMAIL_PROVIDER || "console").toLowerCase() === "resend"
    ? "resend"
    : "console";
}

function fromAddress(): string {
  return process.env.EMAIL_FROM || "ADFLOW <noreply@adflow.local>";
}

/** Send an email. In dev mode (console provider), the email is printed to stdout. */
export async function sendEmail(input: SendInput): Promise<EmailResult> {
  const p = provider();

  if (p === "console") {
    console.log("\n===== EMAIL (console provider) =====");
    console.log("Category:", input.category ?? "transactional");
    console.log("From:", fromAddress());
    console.log("To:", Array.isArray(input.to) ? input.to.join(", ") : input.to);
    console.log("Subject:", input.subject);
    console.log("----- text -----");
    console.log(input.text ?? stripHtml(input.html));
    console.log("====================================\n");

    return { ok: true, id: `console_${Date.now()}`, provider: "console" };
  }

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    return {
      ok: false,
      error: "RESEND_API_KEY is not configured.",
      provider: "resend",
    };
  }

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({
      from: fromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo,
      headers: input.headers,
    });

    if (result.error) {
      return { ok: false, error: result.error.message, provider: "resend" };
    }

    return {
      ok: true,
      id: result.data?.id ?? "unknown",
      provider: "resend",
    };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error.",
      provider: "resend",
    };
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
