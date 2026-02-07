import { router } from "./init";
import { wastewaterRouter } from "./routers/wastewater";

export const appRouter = router({
  wastewater: wastewaterRouter,
});

export type AppRouter = typeof appRouter;
