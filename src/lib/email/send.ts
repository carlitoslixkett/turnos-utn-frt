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
      console.error("[email] send failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (err) {
    console.error("[email] exception", err);
    return { ok: false, error: err instanceof Error ? err.message : "unknown" };
  }
}
