import { router } from "./init";
import { wastewaterRouter } from "./routers/wastewater";
import { clinicalRouter } from "./routers/clinical";
import { rougeoleRouter } from "./routers/rougeole";

export const appRouter = router({
  wastewater: wastewaterRouter,
  clinical: clinicalRouter,
  rougeole: rougeoleRouter,
});

export type AppRouter = typeof appRouter;
