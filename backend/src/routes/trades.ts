import { Router } from "express";
import { TradeSide, TradeSource } from "@prisma/client";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { prisma } from "../util/prisma";
import { computePnl } from "../util/calc";
import { upload } from "../util/upload";
import { serializeTrade } from "../util/tradeSource";

export const tradesRouter = Router();
const demoSymbols = ["XAUUSD", "EURUSD", "GBPUSD", "US30", "BTCUSD"];

const tradeSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.nativeEnum(TradeSide),
  entryPrice: z.number().positive(),
  exitPrice: z.number().positive(),
  lotSize: z.number().positive(),
  openTime: z.string().datetime(),
  closeTime: z.string().datetime(),
  fees: z.number().min(0).default(0),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  strategy: z.string().max(120).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
  tagIds: z.array(z.string()).optional(),
});

const tradeListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(100),
  symbol: z.string().max(20).optional(),
});

tradesRouter.get("/trades", requireAuth, async (req: AuthRequest, res) => {
  const queryParsed = tradeListQuerySchema.safeParse(req.query);
  if (!queryParsed.success) {
    return res.status(400).json({ error: "Invalid trade query parameters" });
  }
  const { page, pageSize, symbol } = queryParsed.data;
  const skip = (page - 1) * pageSize;

  const where = {
    userId: req.auth!.userId,
    ...(symbol ? { symbol: symbol.toUpperCase() } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.trade.findMany({
      where,
      include: { tradeTags: { include: { tag: true } } },
      orderBy: { closeTime: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.trade.count({ where }),
  ]);

  res.json({
    items: items.map((t) => serializeTrade(t)),
    total,
    page,
    pageSize,
  });
});

tradesRouter.post("/trades", requireAuth, async (req: AuthRequest, res) => {
  const parsed = tradeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid trade payload" });
  }
  const body = parsed.data;
  const pnl = computePnl({
    side: body.side,
    entryPrice: body.entryPrice,
    exitPrice: body.exitPrice,
    lotSize: body.lotSize,
    fees: body.fees,
  });

  const trade = await prisma.trade.create({
    data: {
      userId: req.auth!.userId,
      symbol: body.symbol.toUpperCase(),
      side: body.side,
      entryPrice: body.entryPrice,
      exitPrice: body.exitPrice,
      lotSize: body.lotSize,
      openTime: new Date(body.openTime),
      closeTime: new Date(body.closeTime),
      fees: body.fees,
      pnl,
      rating: body.rating ?? null,
      strategy: body.strategy ?? null,
      notes: body.notes ?? null,
      source: TradeSource.JOURNAL,
      tradeTags: body.tagIds?.length
        ? {
            create: body.tagIds.map((tagId) => ({
              tag: { connect: { id: tagId } },
            })),
          }
        : undefined,
    },
    include: { tradeTags: { include: { tag: true } } },
  });
  res.status(201).json({ trade: serializeTrade(trade) });
});

tradesRouter.get("/trades/:id", requireAuth, async (req: AuthRequest, res) => {
  const tradeId = String(req.params.id);
  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { tradeTags: { include: { tag: true } } },
  });
  if (!trade || trade.userId !== req.auth!.userId) {
    return res.status(404).json({ error: "Trade not found" });
  }
  return res.json({ trade: serializeTrade(trade) });
});

tradesRouter.put("/trades/:id", requireAuth, async (req: AuthRequest, res) => {
  const parsed = tradeSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid trade update payload" });
  }
  const body = parsed.data;
  const tradeId = String(req.params.id);
  const existing = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!existing || existing.userId !== req.auth!.userId) {
    return res.status(404).json({ error: "Trade not found" });
  }

  const side = body.side ?? existing.side;
  const entryPrice = body.entryPrice ?? existing.entryPrice;
  const exitPrice = body.exitPrice ?? existing.exitPrice;
  const lotSize = body.lotSize ?? existing.lotSize;
  const fees = body.fees ?? existing.fees;

  const trade = await prisma.trade.update({
    where: { id: existing.id },
    data: {
      symbol: body.symbol?.toUpperCase() ?? existing.symbol,
      side,
      entryPrice,
      exitPrice,
      lotSize,
      fees,
      openTime: body.openTime ? new Date(body.openTime) : existing.openTime,
      closeTime: body.closeTime ? new Date(body.closeTime) : existing.closeTime,
      strategy: body.strategy === undefined ? existing.strategy : body.strategy,
      notes: body.notes === undefined ? existing.notes : body.notes,
      rating: body.rating === undefined ? existing.rating : body.rating,
      pnl: computePnl({ side, entryPrice, exitPrice, lotSize, fees }),
    },
    include: { tradeTags: { include: { tag: true } } },
  });

  if (body.tagIds) {
    await prisma.tradeTag.deleteMany({ where: { tradeId: existing.id } });
    if (body.tagIds.length) {
      await prisma.tradeTag.createMany({
        data: body.tagIds.map((tagId) => ({ tradeId: existing.id, tagId })),
      });
    }
  }
  return res.json({ trade: serializeTrade(trade) });
});

tradesRouter.delete("/trades/:id", requireAuth, async (req: AuthRequest, res) => {
  const tradeId = String(req.params.id);
  const existing = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!existing || existing.userId !== req.auth!.userId) {
    return res.status(404).json({ error: "Trade not found" });
  }
  await prisma.trade.delete({ where: { id: existing.id } });
  return res.json({ ok: true });
});

tradesRouter.post(
  "/trades/:id/screenshot",
  requireAuth,
  upload.single("screenshot"),
  async (req: AuthRequest, res) => {
    const tradeId = String(req.params.id);
    const trade = await prisma.trade.findUnique({ where: { id: tradeId } });
    if (!trade || trade.userId !== req.auth!.userId) {
      return res.status(404).json({ error: "Trade not found" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const updated = await prisma.trade.update({
      where: { id: trade.id },
      data: { screenshotPath: req.file.filename },
    });
    return res.json({ trade: updated });
  },
);

tradesRouter.post("/trades/seed-demo", requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.trade.count({ where: { userId: req.auth!.userId } });
  if (existing >= 30) {
    return res.json({ ok: true, created: 0, message: "User already has demo-worthy data" });
  }

  for (let i = 0; i < 40; i += 1) {
    const symbol = demoSymbols[i % demoSymbols.length];
    const side = i % 2 === 0 ? TradeSide.LONG : TradeSide.SHORT;
    const entryPrice = 100 + i * 2.2;
    const exitPrice = entryPrice + (i % 3 === 0 ? 5 : -3.2);
    const lotSize = 1 + (i % 3) * 0.5;
    const fees = 1.2;
    const pnl = computePnl({ side, entryPrice, exitPrice, lotSize, fees });
    const closeTime = new Date(Date.now() - (40 - i) * 86400000);
    const openTime = new Date(closeTime.getTime() - 7200000);

    await prisma.trade.create({
      data: {
        userId: req.auth!.userId,
        symbol,
        side,
        entryPrice,
        exitPrice,
        lotSize,
        fees,
        pnl,
        openTime,
        closeTime,
        notes: `Demo trade #${i + 1}`,
        strategy: i % 2 === 0 ? "Breakout" : "Pullback",
        source: TradeSource.JOURNAL,
      },
    });
  }

  return res.status(201).json({ ok: true, created: 40 });
});

