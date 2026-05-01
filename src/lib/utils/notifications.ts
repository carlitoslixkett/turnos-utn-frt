import { createAdminClient } from "@/lib/supabase/server";

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
}

// Insert a notification for a user. Never throws — failures are logged
// (notifications are best-effort, the calling action should not fail
// because of a notification insert error).
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const admin = await createAdminClient();
    const { error } = await admin.from("notifications").insert({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    });
    if (error) {
      console.error("[notifications] insert failed", error);
    }
  } catch (err) {
    console.error("[notifications] exception", err);
  }
}
