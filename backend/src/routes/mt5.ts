import { Router } from "express";
import { MtCommandStatus, MtCommandType, TradeSide } from "@prisma/client";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/requireAuth";
import { requireMtAuth, type MtAuthRequest } from "../middleware/requireMtAuth";
import { prisma } from "../util/prisma";
import {
  closeUserPosition,
  createBridgeAccount,
  ensureBridgePairingAccount,
  getDefaultBridgeAccount,
  getLinkedBridgeAccount,
  isBridgeConfigured,
  isBridgeLinked,
  isBridgeLive,
  resolveOrderAccount,
  revokeHostedAccounts,
  toBrokerSymbol,
} from "../util/megacandleTrading";
import {
  generateApiToken,
  generatePairingCode,
  hashApiToken,
} from "../util/mt5Tokens";
import { encryptMtSecret } from "../util/mtSecrets";
import {
  getStoredMtPassword,
  metaApiEnabled,
  metaApiOpenTrade,
  syncMetaApiPositions,
} from "../util/metaApiBridge";
import { parseMt5DateTime } from "../util/mt5Date";
import {
  fetchLocalMt5Quotes,
  listLocalMt5Symbols,
  localMt5Enabled,
  localMt5OpenTrade,
  syncLocalMt5Account,
} from "../util/localMt5";

export const mt5Router = Router();

const LOCAL_SYNC_GAP_MS = 12_000;
const LOCAL_SYNC_OK_TTL_MS = 120_000;

const localSyncState = new Map<string, { lastAttempt: number; lastOk: number }>();

function markLocalSyncAttempt(accountId: string) {
  const prev = localSyncState.get(accountId) ?? { lastAttempt: 0, lastOk: 0 };
  prev.lastAttempt = Date.now();
  localSyncState.set(accountId, prev);
}

function markLocalSyncOk(accountId: string) {
  localSyncState.set(accountId, { lastAttempt: Date.now(), lastOk: Date.now() });
}

function shouldRunLocalSync(accountId: string, force: boolean) {
  if (force) return true;
  const prev = localSyncState.get(accountId);
  if (!prev) return true;
  return Date.now() - prev.lastAttempt >= LOCAL_SYNC_GAP_MS;
}

function localSyncRecentlyOk(accountId: string) {
  const prev = localSyncState.get(accountId);
  return Boolean(prev && Date.now() - prev.lastOk < LOCAL_SYNC_OK_TTL_MS);
}

const openOrderSchema = z.object({
  symbol: z.string().min(1).max(20),
  side: z.nativeEnum(TradeSide),
  volume: z.number().positive().max(100),
  sl: z.number().positive().optional(),
  tp: z.number().positive().optional(),
  accountId: z.string().optional(),
});

const closeOrderSchema = z.object({
  ticket: z.number().int().positive().optional(),
  positionId: z.string().min(1).optional(),
  accountId: z.string().optional(),
}).refine((d) => d.ticket != null || d.positionId != null, {
  message: "ticket or positionId required",
});

const bridgeBrokerSchema = z.object({
  platform: z.enum(["MT5", "MT4"]).optional(),
  brokerName: z.string().max(120).optional(),
  brokerServer: z.string().max(120).optional(),
  accountLogin: z.string().max(40).optional(),
});

const mtConnectSchema = z.object({
  platform: z.enum(["MT5", "MT4"]).optional(),
  brokerName: z.string().max(120).optional(),
  brokerServer: z.string().min(1).max(120),
  accountLogin: z.string().min(1).max(40),
  password: z.string().min(1).max(128),
  accountId: z.string().optional(),
});

const createMtAccountSchema = z.object({
  label: z.string().max(80).optional(),
  platform: z.enum(["MT5", "MT4"]).optional(),
  brokerName: z.string().max(120).optional(),
  brokerServer: z.string().max(120).optional(),
  accountLogin: z.string().max(40).optional(),
  setDefault: z.boolean().optional(),
});

const updateMtAccountSchema = createMtAccountSchema.partial();

const bridgeSyncSchema = z.object({
  brokerName: z.string().max(120).optional(),
  brokerServer: z.string().max(120).optional(),
  accountLogin: z.string().max(40).optional(),
  balance: z.number().optional(),
  equity: z.number().optional(),
  positions: z
    .array(
      z.object({
        ticket: z.coerce.number().int(),
        symbol: z.string().min(1).max(32),
        side: z.nativeEnum(TradeSide),
        volume: z.number().positive(),
        openPrice: z.number().positive(),
        currentPrice: z.number().positive(),
        profit: z.number(),
        openTime: z.preprocess(parseMt5DateTime, z.date()),
      }),
    )
    .default([]),
  commandResults: z
    .array(
      z.object({
        commandId: z.string(),
        status: z.enum(["EXECUTED", "FAILED"]),
        errorMsg: z.string().max(500).optional(),
        ticket: z.number().int().optional(),
      }),
    )
    .default([]),
  closedDeals: z
    .array(
      z.object({
        ticket: z.coerce.number().int(),
        symbol: z.string().min(1).max(32),
        side: z.nativeEnum(TradeSide),
        volume: z.number().positive(),
        openPrice: z.number().positive(),
        closePrice: z.number().positive(),
        openTime: z.preprocess(parseMt5DateTime, z.date()),
        closeTime: z.preprocess(parseMt5DateTime, z.date()),
        profit: z.number(),
        commission: z.number().default(0),
      }),
    )
    .default([]),
});

function accountPayload(account: {
  id: string;
  label: string;
  platform?: string;
  brokerName: string | null;
  brokerServer: string | null;
  accountLogin: string | null;
  balance: number | null;
  equity: number | null;
  lastSeenAt: Date | null;
  isHosted: boolean;
  isDefault?: boolean;
  pairingCode?: string;
  connected?: boolean;
}) {
  return {
    id: account.id,
    label: account.label,
    platform: account.platform,
    brokerName: account.brokerName,
    brokerServer: account.brokerServer,
    accountLogin: account.accountLogin,
    balance: account.balance,
    equity: account.equity,
    lastSeenAt: account.lastSeenAt,
    isHosted: account.isHosted,
    isDefault: account.isDefault ?? false,
    pairingCode: account.pairingCode,
    connected: account.connected,
    bridgeLive: account.isHosted ? false : isBridgeLive(account as Parameters<typeof isBridgeLive>[0]),
  };
}

async function buildMt5Snapshot(
  userId: string,
  options?: { forceSync?: boolean; skipSync?: boolean; light?: boolean },
) {
  if (!options?.light) {
    await revokeHostedAccounts(userId);
  }
  const bridge =
    (await getLinkedBridgeAccount(userId)) ??
    (await getDefaultBridgeAccount(userId)) ??
    (await ensureBridgePairingAccount(userId));

  const configured = isBridgeConfigured(bridge);
  const linked = isBridgeLinked(bridge);
  const password = getStoredMtPassword(bridge);
  let useLocal = false;
  let syncError: string | undefined;
  const forceSync = options?.forceSync === true;
  const skipSync = options?.skipSync === true;

  if (!skipSync && password && localMt5Enabled()) {
    if (shouldRunLocalSync(bridge.id, forceSync)) {
      markLocalSyncAttempt(bridge.id);
      const local = await syncLocalMt5Account(bridge, password);
      if (local.ok) {
        markLocalSyncOk(bridge.id);
        useLocal = true;
      } else {
        syncError = local.error;
        useLocal = localSyncRecentlyOk(bridge.id);
      }
    } else {
      useLocal = localSyncRecentlyOk(bridge.id);
    }
  } else if (skipSync && password && localMt5Enabled()) {
    useLocal = localSyncRecentlyOk(bridge.id);
  }
  const useMetaApi = !skipSync && !useLocal && metaApiEnabled() && Boolean(password);

  if (useMetaApi && password) {
    try {
      await syncMetaApiPositions(bridge, password);
    } catch {
      /* show last known state */
    }
  }

  const bridgeLive = useLocal || useMetaApi || isBridgeLive(bridge);

  if (!linked) {
    return {
      connected: false,
      mode: "none" as const,
      account: null,
      positions: [],
      bridgePairingCode: bridge.pairingCode,
      bridgeLive: false,
      bridgeConfigured: configured,
      bridgeLinked: false,
      pendingCommands: 0,
      directConnect: metaApiEnabled() || localMt5Enabled(),
    localMt5: useLocal,
    };
  }

  const fresh = await prisma.mtAccount.findUnique({ where: { id: bridge.id } });
  if (!fresh) {
    return {
      connected: false,
      mode: "none" as const,
      account: null,
      positions: [],
      bridgePairingCode: null,
      bridgeLive: false,
      pendingCommands: 0,
      directConnect: metaApiEnabled() || localMt5Enabled(),
    localMt5: useLocal,
    };
  }

  const positions = await prisma.mtPosition.findMany({
    where: { accountId: bridge.id },
    orderBy: { openTime: "desc" },
  });

  const pendingCommands =
    !useMetaApi && bridgeLive
      ? 0
      : await prisma.mtCommand.count({
          where: {
            accountId: bridge.id,
            status: { in: [MtCommandStatus.PENDING, MtCommandStatus.DISPATCHED] },
          },
        });

  const mode = bridgeLive
    ? useLocal
      ? ("local" as const)
      : useMetaApi
        ? ("metaapi" as const)
        : ("bridge" as const)
    : ("pending" as const);

  return {
    connected: bridgeLive,
    mode,
    account: accountPayload(fresh),
    positions,
    bridgePairingCode: bridge.pairingCode,
    bridgeLive,
    bridgeConfigured: configured,
    bridgeLinked: linked,
    accountSaved: configured,
    activeAccountId: bridge.id,
    tradingAccountId: bridge.id,
    pendingCommands,
    bridgeHasToken: Boolean(bridge.apiTokenHash),
    directConnect: metaApiEnabled() || localMt5Enabled(),
    localMt5: useLocal,
    bridgeBroker: {
      platform: bridge.platform,
      brokerName: bridge.brokerName,
      brokerServer: bridge.brokerServer,
      accountLogin: bridge.accountLogin,
    },
    lastSeenAt: fresh.lastSeenAt,
    bridgeWaiting: linked && !bridgeLive,
    syncError: syncError ?? null,
  };
}

mt5Router.get("/mt5/accounts", requireAuth, async (req: AuthRequest, res) => {
  await revokeHostedAccounts(req.auth!.userId);
  const rows = await prisma.mtAccount.findMany({
    where: { userId: req.auth!.userId, revoked: false, isHosted: false },
    orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
  });
  res.json({
    accounts: rows.map((a) =>
      accountPayload({
        ...a,
        pairingCode: a.isHosted ? undefined : a.pairingCode,
      }),
    ),
  });
});

mt5Router.post("/mt5/accounts", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createMtAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid account details" });
  }
  const account = await createBridgeAccount(req.auth!.userId, {
    ...parsed.data,
    setDefault: parsed.data.setDefault ?? true,
  });
  return res.status(201).json({
    account: accountPayload({ ...account, pairingCode: account.pairingCode }),
    accountId: account.id,
    message: "Account slot created — enter password and click Connect to link live trading.",
  });
});

mt5Router.patch("/mt5/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  const accountId = String(req.params.id);
  const parsed = updateMtAccountSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid update" });
  }

  const existing = await prisma.mtAccount.findFirst({
    where: { id: accountId, userId: req.auth!.userId, revoked: false, isHosted: false },
  });
  if (!existing) {
    return res.status(404).json({ error: "MT account not found" });
  }

  const data = parsed.data;
  const updated = await prisma.mtAccount.update({
    where: { id: accountId },
    data: {
      label: data.label?.trim() || undefined,
      platform: data.platform,
      brokerName: data.brokerName?.trim() || undefined,
      brokerServer: data.brokerServer?.trim() || undefined,
      accountLogin: data.accountLogin?.trim() || undefined,
    },
  });

  return res.json({ account: accountPayload({ ...updated, pairingCode: updated.pairingCode }) });
});

mt5Router.post("/mt5/accounts/:id/default", requireAuth, async (req: AuthRequest, res) => {
  const accountId = String(req.params.id);
  const existing = await prisma.mtAccount.findFirst({
    where: { id: accountId, userId: req.auth!.userId, revoked: false, isHosted: false },
  });
  if (!existing) {
    return res.status(404).json({ error: "MT account not found" });
  }

  await prisma.mtAccount.updateMany({
    where: { userId: req.auth!.userId, revoked: false, isHosted: false },
    data: { isDefault: false },
  });
  const updated = await prisma.mtAccount.update({
    where: { id: accountId },
    data: { isDefault: true },
  });

  return res.json({ account: accountPayload({ ...updated, pairingCode: updated.pairingCode }) });
});

mt5Router.post("/mt5/accounts/auto-init", requireAuth, async (req: AuthRequest, res) => {
  return res.json(await buildMt5Snapshot(req.auth!.userId));
});

mt5Router.get("/mt5/bridge", requireAuth, async (req: AuthRequest, res) => {
  await ensureBridgePairingAccount(req.auth!.userId);
  const bridge = (await getDefaultBridgeAccount(req.auth!.userId)) ?? (await ensureBridgePairingAccount(req.auth!.userId));
  return res.json({
    pairingCode: bridge.pairingCode,
    bridgeLive: isBridgeLive(bridge),
    bridgeConfigured: Boolean(bridge.brokerServer?.trim() || bridge.accountLogin?.trim()),
    expiresAt: bridge.pairingExpiresAt,
    platform: bridge.platform,
    brokerName: bridge.brokerName,
    brokerServer: bridge.brokerServer,
    accountLogin: bridge.accountLogin,
  });
});

mt5Router.post("/mt5/connect", requireAuth, async (req: AuthRequest, res) => {
  const parsed = mtConnectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Enter login, password, and server" });
  }

  await revokeHostedAccounts(req.auth!.userId);
  await ensureBridgePairingAccount(req.auth!.userId);

  const data = parsed.data;
  const platform = data.platform ?? "MT5";

  let bridge =
    data.accountId
      ? await prisma.mtAccount.findFirst({
          where: {
            id: data.accountId,
            userId: req.auth!.userId,
            revoked: false,
            isHosted: false,
          },
        })
      : null;
  if (!bridge) {
    bridge =
      (await getDefaultBridgeAccount(req.auth!.userId)) ??
      (await ensureBridgePairingAccount(req.auth!.userId));
  }

  await prisma.mtAccount.updateMany({
    where: { userId: req.auth!.userId, revoked: false, isHosted: false },
    data: { isDefault: false },
  });

  const updated = await prisma.mtAccount.update({
    where: { id: bridge.id },
    data: {
      platform,
      isDefault: true,
      brokerName: data.brokerName?.trim() || null,
      brokerServer: data.brokerServer.trim(),
      accountLogin: data.accountLogin.trim(),
      brokerPasswordEnc: encryptMtSecret(data.password),
      label: `${platform} · ${data.accountLogin.trim()}`,
    },
  });

  if (localMt5Enabled()) {
    const local = await syncLocalMt5Account(updated, data.password);
    if (local.ok) markLocalSyncOk(updated.id);
    if (local.ok) {
      const snapshot = await buildMt5Snapshot(req.auth!.userId, { forceSync: false });
      return res.json({
        ok: true,
        message: "Connected to your MT5 terminal. Open positions and trades are synced.",
        ...snapshot,
      });
    }
  }

  if (metaApiEnabled()) {
    try {
      await syncMetaApiPositions(updated, data.password);
      const snapshot = await buildMt5Snapshot(req.auth!.userId);
      return res.json({
        ok: true,
        message: "Connected to your MT5/MT4 account. Trades run on your broker.",
        ...snapshot,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not connect to broker";
      return res.status(502).json({
        error: `Broker connection failed: ${msg}. Check login, password, and server.`,
      });
    }
  }

  const snapshot = await buildMt5Snapshot(req.auth!.userId);
  const localHint = localMt5Enabled()
    ? " Keep MetaTrader 5 open on this PC, then click Sync from MT5."
    : "";
  return res.json({
    ok: true,
    message: `Credentials saved.${localHint} Or attach TradeFXBridge.mq5 with your pairing code.`,
    requiresBridge: true,
    ...snapshot,
  });
});

mt5Router.patch("/mt5/bridge/broker", requireAuth, async (req: AuthRequest, res) => {
  const parsed = bridgeBrokerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid broker details" });
  }

  await ensureBridgePairingAccount(req.auth!.userId);
  const bridge =
    (await getDefaultBridgeAccount(req.auth!.userId)) ??
    (await ensureBridgePairingAccount(req.auth!.userId));
  const data = parsed.data;
  const platform = data.platform ?? bridge.platform;
  await prisma.mtAccount.updateMany({
    where: { userId: req.auth!.userId, revoked: false, isHosted: false },
    data: { isDefault: false },
  });

  const updated = await prisma.mtAccount.update({
    where: { id: bridge.id },
    data: {
      platform,
      isDefault: true,
      brokerName: data.brokerName ?? bridge.brokerName,
      brokerServer: data.brokerServer ?? bridge.brokerServer,
      accountLogin: data.accountLogin ?? bridge.accountLogin,
      label: data.brokerName ? `${data.brokerName} ${platform} Bridge` : `${platform} Bridge`,
    },
  });

  return res.json({
    platform: updated.platform,
    brokerName: updated.brokerName,
    brokerServer: updated.brokerServer,
    accountLogin: updated.accountLogin,
    pairingCode: updated.pairingCode,
  });
});

mt5Router.post("/mt5/accounts/pairing", requireAuth, async (req: AuthRequest, res) => {
  const pairingCode = generatePairingCode();
  const account = await prisma.mtAccount.create({
    data: {
      userId: req.auth!.userId,
      pairingCode,
      pairingExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      label: "External MT5 Bridge",
      isHosted: false,
    },
    select: { id: true, pairingCode: true, pairingExpiresAt: true },
  });
  res.status(201).json({ account });
});

mt5Router.delete("/mt5/accounts/:id", requireAuth, async (req: AuthRequest, res) => {
  const accountId = String(req.params.id);
  const existing = await prisma.mtAccount.findUnique({ where: { id: accountId } });
  if (!existing || existing.userId !== req.auth!.userId || existing.isHosted) {
    return res.status(404).json({ error: "MT account not found" });
  }
  const wasDefault = existing.isDefault;
  await prisma.mtAccount.update({
    where: { id: accountId },
    data: { revoked: true, connected: false, apiTokenHash: null, isDefault: false },
  });
  await prisma.mtPosition.deleteMany({ where: { accountId } });

  if (wasDefault) {
    const next = await prisma.mtAccount.findFirst({
      where: { userId: req.auth!.userId, revoked: false, isHosted: false },
      orderBy: { createdAt: "desc" },
    });
    if (next) {
      await prisma.mtAccount.update({ where: { id: next.id }, data: { isDefault: true } });
    }
  }

  return res.json({ ok: true });
});

mt5Router.get("/mt5/symbols", requireAuth, async (_req: AuthRequest, res) => {
  const symbols = localMt5Enabled() ? await listLocalMt5Symbols() : ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30"];
  const btcusdAvailable = symbols.some((s) => s.toUpperCase().includes("BTCUSD"));
  return res.json({
    symbols: [...new Set(symbols.map((s) => (s === "US30M" ? "US30" : s)))],
    btcusdAvailable,
    note: btcusdAvailable
      ? undefined
      : "BTCUSD is not on MetaQuotes-Demo. The “BTC” in Market Watch is a stock ETF, not Bitcoin. Trade EURUSD, XAUUSD, or US30.",
  });
});

mt5Router.get("/mt5/positions", requireAuth, async (req: AuthRequest, res) => {
  return res.json(await buildMt5Snapshot(req.auth!.userId, { skipSync: true, light: true }));
});

mt5Router.get("/mt5/quotes", requireAuth, async (req: AuthRequest, res) => {
  const raw = String(req.query.symbols ?? "EURUSD,GBPUSD,USDJPY,XAUUSD,US30");
  const symbols = [...new Set(raw.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean))].slice(
    0,
    12,
  );
  if (!localMt5Enabled()) {
    return res.json({ quotes: [], live: false });
  }
  const quotes = await fetchLocalMt5Quotes(symbols);
  return res.json({ quotes, live: quotes.length > 0 });
});

/** Force broker sync (MetaAPI cloud or wait for terminal bridge). */
mt5Router.post("/mt5/refresh", requireAuth, async (req: AuthRequest, res) => {
  const userId = req.auth!.userId;
  const bridge = await getLinkedBridgeAccount(userId);
  if (!bridge) {
    return res.status(400).json({ error: "Connect your MT5 account first." });
  }

  const password = getStoredMtPassword(bridge);
  if (password && localMt5Enabled()) {
    markLocalSyncAttempt(bridge.id);
    const local = await syncLocalMt5Account(bridge, password);
    if (local.ok) markLocalSyncOk(bridge.id);
    if (!local.ok && !metaApiEnabled()) {
      return res.status(502).json({
        error: local.error ?? "Could not sync with MT5. Open MetaTrader 5 on this PC.",
      });
    }
  } else if (metaApiEnabled() && password) {
    try {
      await syncMetaApiPositions(bridge, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Broker sync failed";
      return res.status(502).json({ error: msg });
    }
  }

  const snapshot = await buildMt5Snapshot(userId, { skipSync: true, light: true });
  return res.json({
    ok: true,
    message: snapshot.bridgeLive
      ? "Synced with your MT5/MT4 account."
      : (snapshot.syncError as string | null) ??
        "Waiting for MT5 — open MetaTrader 5 on this PC and click Sync MT5 again.",
    ...snapshot,
  });
});

mt5Router.get("/mt5/stream", requireAuth, async (req: AuthRequest, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  if (typeof res.flushHeaders === "function") res.flushHeaders();

  let closed = false;
  let tick = 0;
  req.on("close", () => {
    closed = true;
  });

  const push = async (forceSync: boolean) => {
    if (closed) return;
    const snapshot = await buildMt5Snapshot(req.auth!.userId, {
      skipSync: !forceSync,
      forceSync,
      light: true,
    });
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  };

  await push(false);
  const timer = setInterval(() => {
    tick += 1;
    void push(tick % 5 === 0);
  }, 5000);

  req.on("close", () => clearInterval(timer));
});

mt5Router.post("/mt5/orders/open", requireAuth, async (req: AuthRequest, res) => {
  try {
  const parsed = openOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid open order payload" });
  }

    const linkedForOpen =
      (await getLinkedBridgeAccount(req.auth!.userId)) ??
      (await getDefaultBridgeAccount(req.auth!.userId));
    const pwdForSync = linkedForOpen ? getStoredMtPassword(linkedForOpen) : null;
    if (linkedForOpen && pwdForSync && localMt5Enabled()) {
      await syncLocalMt5Account(linkedForOpen, pwdForSync);
    }

    const resolved = await resolveOrderAccount(req.auth!.userId, parsed.data.accountId);
    if (!resolved) {
      return res.status(400).json({
        error: "Connect your MT5/MT4 account first (login, password, server).",
      });
    }

    const { account, mode } = resolved;
    const symbol = parsed.data.symbol.toUpperCase();
    const brokerSymbol = toBrokerSymbol(symbol);

    if (mode === "local") {
      const password = getStoredMtPassword(account);
      if (!password) {
        return res.status(400).json({ error: "Reconnect your MT5 account with password." });
      }
      await syncLocalMt5Account(account, password);
      const result = await localMt5OpenTrade(account, password, {
        symbol,
        side: parsed.data.side,
        volume: parsed.data.volume,
      });
      if (!result.ok) {
        return res.status(502).json({
          error:
            result.error ??
            "Could not open trade in MT5. Open MetaTrader 5, enable Algo Trading (green), and keep the terminal running.",
        });
      }
      return res.status(201).json({
        executed: true,
        mode: "local",
        symbol: result.symbol,
        ticket: result.ticket,
        message: `Trade opened on ${result.symbol} in MT5.`,
      });
    }

    if (mode === "metaapi") {
      const password = getStoredMtPassword(account);
      if (!password) {
        return res.status(400).json({ error: "Reconnect your MT5 account with password." });
      }
      const result = await metaApiOpenTrade(account, password, {
        symbol: brokerSymbol,
        side: parsed.data.side,
        volume: parsed.data.volume,
        sl: parsed.data.sl,
        tp: parsed.data.tp,
      });
      if (!result) {
        return res.status(502).json({ error: "Could not open trade on broker." });
      }
      return res.status(201).json({
        executed: true,
        mode: "metaapi",
        symbol: brokerSymbol,
        ticket: result.ticket,
        message: "Trade opened on your MT5/MT4 account.",
      });
    }

    if (!isBridgeLive(account)) {
      const pwd = getStoredMtPassword(account);
      if (pwd && localMt5Enabled()) {
        const local = await syncLocalMt5Account(account, pwd);
        if (local.ok) {
          return res.status(503).json({
            error: "MT5 was busy — try your trade again.",
          });
        }
        return res.status(503).json({
          error: local.error ?? "Open MetaTrader 5 on this PC and enable Algo Trading (green button).",
        });
      }
      return res.status(503).json({
        error: "Not connected to MT5. Use Connect with login and password, or enable direct cloud trading.",
      });
    }

  const command = await prisma.mtCommand.create({
    data: {
      accountId: account.id,
      type: MtCommandType.OPEN,
      symbol: brokerSymbol,
      side: parsed.data.side,
      volume: parsed.data.volume,
      sl: parsed.data.sl ?? null,
      tp: parsed.data.tp ?? null,
    },
  });

    const bridgeLive = isBridgeLive(account);
    return res.status(201).json({
      executed: false,
      mode: "bridge",
      symbol: brokerSymbol,
      command,
      bridgeLive,
      message: bridgeLive
        ? "Order sent to MetaTrader — it will appear in MT5 within a few seconds."
        : "Order queued — attach TradeFXBridge.mq5 in MT5 with your pairing code to execute.",
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mt5/orders/open]", err);
    return res.status(500).json({
      error: "Could not open trade. Run prisma generate in backend/ and restart the API.",
    });
  }
});

mt5Router.post("/mt5/orders/close", requireAuth, async (req: AuthRequest, res) => {
  try {
  const parsed = closeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid close order payload" });
  }

    const result = await closeUserPosition(req.auth!.userId, {
      ticket: parsed.data.ticket,
      positionId: parsed.data.positionId,
      accountId: parsed.data.accountId,
    });

    if (!result) {
      return res.status(404).json({ error: "Position not found or already closed" });
    }

    if ("command" in result && result.mode === "bridge") {
      const bridgeAcc = await prisma.mtAccount.findFirst({
        where: { id: result.command.accountId, userId: req.auth!.userId },
      });
      const live = bridgeAcc ? isBridgeLive(bridgeAcc) : false;
      return res.status(201).json({
        executed: false,
        mode: "bridge",
        ticket: result.ticket,
        command: result.command,
        bridgeLive: live,
        message: live
          ? "Close sent to MT5 — position will clear here after the terminal confirms."
          : "Close queued — start TradeFXBridge.mq5 in MT5 to execute.",
      });
    }

    return res.json(result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[mt5/orders/close]", err);
    return res.status(500).json({ error: "Could not close trade." });
  }
});

// --- EA bridge (optional external MT5) ---

const registerSchema = z.object({
  pairingCode: z.string().min(4).max(12),
});

mt5Router.post("/integrations/mt5/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid pairing code" });
  }

  const account = await prisma.mtAccount.findFirst({
    where: {
      pairingCode: parsed.data.pairingCode,
      revoked: false,
      isHosted: false,
      pairingExpiresAt: { gt: new Date() },
    },
  });

  if (!account) {
    return res.status(404).json({ error: "Pairing code invalid or expired" });
  }

  const apiToken = generateApiToken(account.id);
  const apiTokenHash = await hashApiToken(apiToken);

  await prisma.mtAccount.update({
    where: { id: account.id },
    data: { apiTokenHash, connected: true, lastSeenAt: new Date() },
  });

  return res.json({ accountId: account.id, apiToken });
});

mt5Router.get("/integrations/mt5/commands", requireMtAuth, async (req: MtAuthRequest, res) => {
  const account = await prisma.mtAccount.findUnique({ where: { id: req.mtAuth!.accountId } });
  if (account?.isHosted) {
    return res.json({ commands: [] });
  }
  const commands = await prisma.mtCommand.findMany({
    where: { accountId: req.mtAuth!.accountId, status: MtCommandStatus.PENDING },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  if (commands.length > 0) {
    await prisma.mtCommand.updateMany({
      where: { id: { in: commands.map((c) => c.id) } },
      data: { status: MtCommandStatus.DISPATCHED, executedAt: new Date() },
    });
  }

  return res.json({ commands });
});

mt5Router.post("/integrations/mt5/sync", requireMtAuth, async (req: MtAuthRequest, res) => {
  const account = await prisma.mtAccount.findUnique({ where: { id: req.mtAuth!.accountId } });
  if (account?.isHosted) {
    return res.json({ ok: true, skipped: "hosted account" });
  }

  const parsed = bridgeSyncSchema.safeParse(req.body);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("[mt5/sync] validation", parsed.error.flatten());
    return res.status(400).json({ error: "Invalid sync payload", details: parsed.error.flatten() });
  }

  const body = parsed.data;
  const accountId = req.mtAuth!.accountId;
  const userId = req.mtAuth!.userId;

  await prisma.mtAccount.update({
    where: { id: accountId },
    data: {
      brokerName: body.brokerName ?? undefined,
      brokerServer: body.brokerServer ?? undefined,
      accountLogin: body.accountLogin ?? undefined,
      balance: body.balance ?? undefined,
      equity: body.equity ?? undefined,
      lastSeenAt: new Date(),
      connected: true,
      platform: "MT5",
    },
  });

  for (const result of body.commandResults) {
    await prisma.mtCommand.updateMany({
      where: {
        id: result.commandId,
        accountId,
        status: { in: [MtCommandStatus.PENDING, MtCommandStatus.DISPATCHED] },
      },
      data: {
        status: result.status === "EXECUTED" ? MtCommandStatus.EXECUTED : MtCommandStatus.FAILED,
        errorMsg: result.errorMsg ?? null,
        executedAt: new Date(),
      },
    });
  }

  const staleCutoff = new Date(Date.now() - 5 * 60_000);
  await prisma.mtCommand.updateMany({
    where: {
      accountId,
      status: MtCommandStatus.DISPATCHED,
      executedAt: { lt: staleCutoff },
    },
    data: {
      status: MtCommandStatus.FAILED,
      errorMsg: "Bridge did not confirm — check MT5 Experts tab and WebRequest URL",
    },
  });

  const incomingTickets = body.positions.map((p) => BigInt(p.ticket));
  await prisma.mtPosition.deleteMany({
    where: {
      accountId,
      ...(incomingTickets.length ? { ticket: { notIn: incomingTickets } } : {}),
    },
  });

  for (const pos of body.positions) {
    const ticket = BigInt(pos.ticket);
    await prisma.mtPosition.upsert({
      where: { accountId_ticket: { accountId, ticket } },
      create: {
        accountId,
        ticket,
        symbol: pos.symbol.toUpperCase(),
        side: pos.side,
        volume: pos.volume,
        openPrice: pos.openPrice,
        currentPrice: pos.currentPrice,
        profit: pos.profit,
        openTime: pos.openTime,
      },
      update: {
        symbol: pos.symbol.toUpperCase(),
        side: pos.side,
        volume: pos.volume,
        openPrice: pos.openPrice,
        currentPrice: pos.currentPrice,
        profit: pos.profit,
      },
    });
  }

  for (const deal of body.closedDeals) {
    const existing = await prisma.trade.findFirst({
      where: { userId, notes: { contains: `MT5 ticket ${deal.ticket}` } },
    });
    if (existing) continue;

    await prisma.trade.create({
      data: {
        userId,
        symbol: deal.symbol.toUpperCase(),
        side: deal.side,
        entryPrice: deal.openPrice,
        exitPrice: deal.closePrice,
        lotSize: deal.volume,
        openTime: deal.openTime,
        closeTime: deal.closeTime,
        fees: Math.abs(deal.commission),
        pnl: deal.profit,
        notes: `Synced from MT5 · ticket ${deal.ticket}`,
        strategy: "MegaCandle Live",
      },
    });
  }

  return res.json({ ok: true });
});
