import { Router } from "express";
import { authRouter } from "./auth";
import { sessionsRouter } from "./sessions";
import { tradesRouter } from "./trades";
import { tagsRouter } from "./tags";
import { analyticsRouter } from "./analytics";
import { mt5Router } from "./mt5";

export function createApiRouter() {
  const router = Router();
  router.use(authRouter);
  router.use(sessionsRouter);
  router.use(tradesRouter);
  router.use(tagsRouter);
  router.use(analyticsRouter);
  router.use(mt5Router);
  return router;
}

