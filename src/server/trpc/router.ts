import { router } from "./init";
import { wastewaterRouter } from "./routers/wastewater";
import { clinicalRouter } from "./routers/clinical";
import { rougeoleRouter } from "./routers/rougeole";
import { feedbackRouter } from "./routers/feedback";
import { waveAnalysisRouter } from "./routers/wave-analysis";
import { authRouter } from "./routers/auth";
import { sicknessRouter } from "./routers/sickness";
import { timeMachineRouter } from "./routers/time-machine";
import { eventsRouter } from "./routers/events";

export const appRouter = router({
  wastewater: wastewaterRouter,
  clinical: clinicalRouter,
  rougeole: rougeoleRouter,
  feedback: feedbackRouter,
  waveAnalysis: waveAnalysisRouter,
  auth: authRouter,
  sickness: sicknessRouter,
  timeMachine: timeMachineRouter,
  events: eventsRouter,
});

export type AppRouter = typeof appRouter;
