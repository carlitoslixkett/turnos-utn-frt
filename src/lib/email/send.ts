import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

const resend = apiKey ? new Resend(apiKey) : null;

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: EmailInput): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.info("[email] (no RESEND_API_KEY, logged only)", { to, subject });
    return { ok: true };
  }

  try {
    const { error } = await resend.emails.send({ from: fromEmail, to, subject, html });
    if (error) {
      // Common cause: domain not verified or recipient not allowed by Resend free tier.
      // We don't surface this to the user — the in-app notification covers it.
      console.warn("[email] send failed (non-fatal, in-app notif still delivered)", {
        to,
        subject,
        from: fromEmail,
        error: error.message,
      });
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.warn("[email] exception (non-fatal)", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
