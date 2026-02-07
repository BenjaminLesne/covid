import { router, publicProcedure } from "../init";

export const wastewaterRouter = router({
  ping: publicProcedure.query(() => {
    return { status: "ok" as const };
  }),
});
