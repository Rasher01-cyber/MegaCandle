import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { prisma } from "../util/prisma";

export const analyticsRouter = Router();
const breakdownQuerySchema = z.object({
  by: z.enum(["symbol", "side", "tag", "session"]).default("symbol"),
});

analyticsRouter.get("/analytics/summary", requireAuth, async (req: AuthRequest, res) => {
  const trades = await prisma.trade.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { closeTime: "asc" },
  });
  const totalTrades = trades.length;
  const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const grossProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0));
  const winRate = totalTrades ? (wins.length / totalTrades) * 100 : 0;
  const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? 99 : 0;
  res.json({
    totalTrades,
    totalPnl,
    winRate,
    profitFactor,
    avgPnl: totalTrades ? totalPnl / totalTrades : 0,
  });
});

analyticsRouter.get("/analytics/equity-curve", requireAuth, async (req: AuthRequest, res) => {
  const trades = await prisma.trade.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { closeTime: "asc" },
  });
  let equity = 0;
  const points = trades.map((trade) => {
    equity += trade.pnl;
    return {
      date: trade.closeTime.toISOString(),
      equity,
      pnl: trade.pnl,
    };
  });
  res.json({ points });
});

analyticsRouter.get("/analytics/calendar", requireAuth, async (req: AuthRequest, res) => {
  const month = String(req.query.month ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) return res.status(400).json({ error: "Invalid month" });
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);

  const trades = await prisma.trade.findMany({
    where: {
      userId: req.auth!.userId,
      closeTime: { gte: start, lt: end },
    },
  });

  const map = new Map<string, number>();
  for (const t of trades) {
    const day = t.closeTime.toISOString().slice(0, 10);
    map.set(day, (map.get(day) ?? 0) + t.pnl);
  }
  res.json({
    days: Array.from(map.entries()).map(([date, pnl]) => ({ date, pnl })),
  });
});

analyticsRouter.get("/analytics/breakdown", requireAuth, async (req: AuthRequest, res) => {
  const queryParsed = breakdownQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: "Invalid breakdown query parameter" });
  }
  const by = queryParsed.data.by;
  const trades = await prisma.trade.findMany({
    where: { userId: req.auth!.userId },
    include: { tradeTags: { include: { tag: true } } },
  });

  const bucket = new Map<string, { count: number; pnl: number }>();
  const add = (key: string, pnl: number) => {
    const v = bucket.get(key) ?? { count: 0, pnl: 0 };
    v.count += 1;
    v.pnl += pnl;
    bucket.set(key, v);
  };

  for (const t of trades) {
    if (by === "side") add(t.side, t.pnl);
    else if (by === "tag") {
      if (!t.tradeTags.length) add("untagged", t.pnl);
      t.tradeTags.forEach((tt) => add(tt.tag.name, t.pnl));
    } else if (by === "session") {
      const h = t.closeTime.getUTCHours();
      const session = h < 8 ? "asia" : h < 16 ? "london" : "new_york";
      add(session, t.pnl);
    } else add(t.symbol, t.pnl);
  }
  res.json({
    breakdown: Array.from(bucket.entries()).map(([key, val]) => ({ key, ...val })),
  });
});

