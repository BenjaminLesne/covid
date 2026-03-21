import { router } from "./init";
import { wastewaterRouter } from "./routers/wastewater";
import { clinicalRouter } from "./routers/clinical";
import { rougeoleRouter } from "./routers/rougeole";
import { feedbackRouter } from "./routers/feedback";
import { waveAnalysisRouter } from "./routers/wave-analysis";

export const appRouter = router({
  wastewater: wastewaterRouter,
  clinical: clinicalRouter,
  rougeole: rougeoleRouter,
  feedback: feedbackRouter,
  waveAnalysis: waveAnalysisRouter,
});

export type AppRouter = typeof appRouter;
