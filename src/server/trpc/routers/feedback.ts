import { z } from "zod";
import { router, publicProcedure } from "../init";

export const feedbackRouter = router({
  send: publicProcedure
    .input(z.object({ message: z.string().min(1).max(2000) }))
    .mutation(async ({ input }) => {
      const webhookUrl = process.env.DISCORD_FEEDBACK_WEBHOOK;

      if (!webhookUrl) {
        throw new Error("Feedback webhook is not configured");
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `**[EauxVid Feedback]**\n${input.message}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send feedback");
      }

      return { success: true };
    }),
});
