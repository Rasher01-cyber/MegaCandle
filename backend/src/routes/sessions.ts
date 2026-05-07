import { Router } from "express";
import { prisma } from "../util/prisma";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";

export const sessionsRouter = Router();

sessionsRouter.get("/sessions", requireAuth, async (req: AuthRequest, res) => {
  const sessions = await prisma.session.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { lastActiveAt: "desc" },
  });
  res.json({ sessions });
});

sessionsRouter.delete("/sessions/:id", requireAuth, async (req: AuthRequest, res) => {
  const sessionId = String(req.params.id);
  const target = await prisma.session.findUnique({ where: { id: sessionId } });
  if (!target || target.userId !== req.auth!.userId) {
    return res.status(404).json({ error: "Session not found" });
  }
  await prisma.session.update({
    where: { id: target.id },
    data: { revoked: true },
  });
  return res.json({ ok: true });
});

