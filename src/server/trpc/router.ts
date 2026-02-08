import { router } from "./init";
import { wastewaterRouter } from "./routers/wastewater";
import { clinicalRouter } from "./routers/clinical";

export const appRouter = router({
  wastewater: wastewaterRouter,
  clinical: clinicalRouter,
});

export type AppRouter = typeof appRouter;
