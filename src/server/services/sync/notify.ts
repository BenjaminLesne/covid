import { env } from "@/env";

export async function notifyDiscord(message: string): Promise<void> {
  await fetch(env.DISCORD_FEEDBACK_WEBHOOK, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });
}
