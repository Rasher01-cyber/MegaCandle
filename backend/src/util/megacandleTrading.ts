import { MtAccount, MtCommandType, TradeSide, TradeSource } from "@prisma/client";
import { prisma } from "./prisma";
import { generatePairingCode } from "./mt5Tokens";
import {
  getStoredMtPassword,
  metaApiCloseTrade,
  metaApiEnabled,
} from "./metaApiBridge";
import { localMt5CloseTrade, localMt5Enabled, syncLocalMt5Account } from "./localMt5";

export { fromBrokerSymbol, toBrokerSymbol } from "./mtSymbols";

const BASE_PRICES: Record<string, number> = {
  EURUSD: 1.085,
  GBPUSD: 1.265,
  XAUUSD: 4680,
  XAUUSDm: 4680,
  USDJPY: 149.5,
  BTCUSD: 97500,
  US30: 39500,
};

const JITTER: Record<string, number> = {};

export function getMarkPrice(symbol: string): number {
  const sym = symbol.toUpperCase();
  const base = BASE_PRICES[sym] ?? BASE_PRICES[sym.replace(/M$/, "")] ?? 100;
  if (!JITTER[sym]) JITTER[sym] = base;
  const wave = Math.sin(Date.now() / 45000 + sym.length) * base * 0.0008;
  const noise = (Math.random() - 0.5) * base * 0.0004;
  JITTER[sym] = Math.max(base * 0.995, base + wave + noise);
  return Number(JITTER[sym].toFixed(sym.startsWith("XAUUSD") || sym === "US30" ? 2 : 5));
}

function profitFor(side: TradeSide, open: number, current: number, volume: number, symbol: string) {
  const base = symbol.toUpperCase().replace(/M$/, "");
  const mult = base === "XAUUSD" ? 100 : base === "US30" ? 5 : 100000;
  const diff = side === "LONG" ? current - open : open - current;
  return Number((diff * volume * mult * 0.01).toFixed(2));
}

export async function ensureMegaCandleHostedAccount(userId: string) {
  const existing = await prisma.mtAccount.findFirst({
    where: { userId, revoked: false, isHosted: true },
  });
  if (existing) {
    return prisma.mtAccount.update({
      where: { id: existing.id },
      data: { connected: true, lastSeenAt: new Date() },
    });
  }

  const login = `MC-${userId.replace(/\W/g, "").slice(-8).toUpperCase()}`;
  return prisma.mtAccount.create({
    data: {
      userId,
      label: "MegaCandle Trading Account",
      isHosted: true,
      connected: true,
      brokerName: "MegaCandle Markets",
      accountLogin: login,
      balance: 10_000,
      equity: 10_000,
      pairingCode: generatePairingCode(),
      pairingExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      lastSeenAt: new Date(),
    },
  });
}

export async function refreshHostedAccount(accountId: string) {
  const positions = await prisma.mtPosition.findMany({ where: { accountId } });
  let floating = 0;
  for (const p of positions) {
    const mark = getMarkPrice(p.symbol);
    const profit = profitFor(p.side, p.openPrice, mark, p.volume, p.symbol);
    floating += profit;
    await prisma.mtPosition.update({
      where: { id: p.id },
      data: { currentPrice: mark, profit },
    });
  }
  const account = await prisma.mtAccount.findUnique({ where: { id: accountId } });
  if (!account) return null;
  const balance = account.balance ?? 10_000;
  const equity = balance + floating;
  return prisma.mtAccount.update({
    where: { id: accountId },
    data: { equity, lastSeenAt: new Date(), connected: true },
  });
}

async function nextTicket(accountId: string) {
  const max = await prisma.mtPosition.aggregate({
    where: { accountId },
    _max: { ticket: true },
  });
  const base = max._max.ticket ?? BigInt(1000);
  return base + BigInt(1);
}

export async function openHostedTrade(
  account: MtAccount,
  params: { symbol: string; side: TradeSide; volume: number },
) {
  const symbol = params.symbol.toUpperCase();
  const price = getMarkPrice(symbol);
  const ticket = await nextTicket(account.id);

  await prisma.mtPosition.create({
    data: {
      accountId: account.id,
      ticket,
      symbol,
      side: params.side,
      volume: params.volume,
      openPrice: price,
      currentPrice: price,
      profit: 0,
      openTime: new Date(),
    },
  });

  await refreshHostedAccount(account.id);
  return { ticket, price };
}

export async function findUserPosition(userId: string, opts: { ticket?: number; positionId?: string }) {
  if (opts.positionId) {
    return prisma.mtPosition.findFirst({
      where: { id: opts.positionId, account: { userId, revoked: false } },
      include: { account: true },
    });
  }
  if (opts.ticket != null) {
    return prisma.mtPosition.findFirst({
      where: { ticket: BigInt(opts.ticket), account: { userId, revoked: false } },
      include: { account: true },
      orderBy: { openTime: "desc" },
    });
  }
  return null;
}

export async function closeHostedTrade(account: MtAccount, ticket: number | bigint, userId: string) {
  const ticketId = BigInt(ticket);
  const position = await prisma.mtPosition.findUnique({
    where: { accountId_ticket: { accountId: account.id, ticket: ticketId } },
  });
  if (!position) return null;

  const closePrice = getMarkPrice(position.symbol);
  const pnl = profitFor(position.side, position.openPrice, closePrice, position.volume, position.symbol);

  await prisma.mtPosition.delete({ where: { id: position.id } });

  const balance = (account.balance ?? 10_000) + pnl;
  await prisma.mtAccount.update({
    where: { id: account.id },
    data: { balance, lastSeenAt: new Date() },
  });

  await refreshHostedAccount(account.id);

  try {
    const { journalWebsiteClose } = await import("./journalWebsiteClose");
    await journalWebsiteClose(account, position, closePrice, pnl);
  } catch {
    /* journal entry optional — position close still counts */
  }

  return { pnl, closePrice };
}

/** Close any open position for this user (MetaAPI or bridge command). */
export async function closeUserPosition(
  userId: string,
  opts: { ticket?: number; positionId?: string; accountId?: string },
) {
  let row = await findUserPosition(userId, opts);
  if (!row && opts.accountId && opts.ticket != null) {
    const acc = await prisma.mtAccount.findFirst({
      where: { id: opts.accountId, userId, revoked: false, isHosted: false },
    });
    if (acc) {
      const pos = await prisma.mtPosition.findUnique({
        where: { accountId_ticket: { accountId: acc.id, ticket: BigInt(opts.ticket) } },
      });
      if (pos) row = { ...pos, account: acc };
    }
  }
  if (!row) return null;

  const { account } = row;

  if (account.isHosted) return null;

  const password = getStoredMtPassword(account);
  if (metaApiEnabled() && password) {
    const grossPnl = row.profit;
    const closePrice = row.currentPrice;
    const closed = await metaApiCloseTrade(account, password, Number(row.ticket));
    if (closed.ok) {
      try {
        const { journalWebsiteClose } = await import("./journalWebsiteClose");
        await journalWebsiteClose(account, row, closePrice, grossPnl);
      } catch {
        /* sync may import later */
      }
      return { mode: "metaapi" as const, executed: true, ticket: row.ticket };
    }
    if (!localMt5Enabled() || !isBridgeLive(account)) return null;
  }
  if (password && localMt5Enabled()) {
    const closed = await localMt5CloseTrade(account, password, Number(row.ticket));
    if (closed.ok) {
      try {
        const { journalWebsiteClose } = await import("./journalWebsiteClose");
        await journalWebsiteClose(account, row, row.currentPrice, row.profit);
      } catch {
        /* history sync may also import */
      }
      return { mode: "local" as const, executed: true, ticket: row.ticket };
    }
    if (!isBridgeLive(account)) return null;
  }

  if (!isBridgeLive(account)) return null;

  const command = await prisma.mtCommand.create({
    data: {
      accountId: account.id,
      type: MtCommandType.CLOSE,
      ticket: row.ticket,
    },
  });

  return { mode: "bridge" as const, executed: false, command, ticket: row.ticket };
}

export async function ensureBridgePairingAccount(userId: string) {
  const existing = await prisma.mtAccount.findFirst({
    where: { userId, revoked: false, isHosted: false },
  });
  if (existing) return existing;

  return prisma.mtAccount.create({
    data: {
      userId,
      label: "MT5/MT4 Bridge",
      isHosted: false,
      isDefault: true,
      connected: false,
      brokerName: "Your MT5 Terminal",
      pairingCode: generatePairingCode(),
      pairingExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function createBridgeAccount(
  userId: string,
  data: {
    label?: string;
    platform?: "MT5" | "MT4";
    brokerName?: string;
    brokerServer?: string;
    accountLogin?: string;
    setDefault?: boolean;
  },
) {
  const login = data.accountLogin?.trim();
  const server = data.brokerServer?.trim();

  const emptyStub = await prisma.mtAccount.findFirst({
    where: {
      userId,
      revoked: false,
      isHosted: false,
      accountLogin: null,
      brokerServer: null,
    },
  });

  const bridgeCount = await prisma.mtAccount.count({
    where: { userId, revoked: false, isHosted: false },
  });
  const makeDefault = data.setDefault ?? bridgeCount === 0;

  if (makeDefault) {
    await prisma.mtAccount.updateMany({
      where: { userId, revoked: false, isHosted: false },
      data: { isDefault: false },
    });
  }

  if (emptyStub && (login || server)) {
    return prisma.mtAccount.update({
      where: { id: emptyStub.id },
      data: {
        label: data.label?.trim() || (login ? `MT5 · ${login}` : emptyStub.label),
        platform: data.platform ?? "MT5",
        isDefault: makeDefault,
        brokerName: data.brokerName?.trim() || null,
        brokerServer: server || null,
        accountLogin: login || null,
      },
    });
  }

  return prisma.mtAccount.create({
    data: {
      userId,
      label: data.label?.trim() || (login ? `MT5 · ${login}` : "MT5 / MT4 Account"),
      platform: data.platform ?? "MT5",
      isHosted: false,
      isDefault: makeDefault,
      connected: false,
      brokerName: data.brokerName?.trim() || null,
      brokerServer: data.brokerServer?.trim() || null,
      accountLogin: login || null,
      pairingCode: generatePairingCode(),
      pairingExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

export async function getDefaultBridgeAccount(userId: string) {
  return (
    (await prisma.mtAccount.findFirst({
      where: { userId, revoked: false, isHosted: false, isDefault: true },
    })) ??
    (await prisma.mtAccount.findFirst({
      where: { userId, revoked: false, isHosted: false },
      orderBy: [{ lastSeenAt: "desc" }, { createdAt: "desc" }],
    }))
  );
}

/** Any MT5/MT4 account this user saved or paired (not the website demo). */
export async function getLinkedBridgeAccount(userId: string) {
  const rows = await prisma.mtAccount.findMany({
    where: { userId, revoked: false, isHosted: false },
    orderBy: [{ isDefault: "desc" }, { lastSeenAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.find((a) => isBridgeLinked(a)) ?? null;
}

const BRIDGE_LIVE_MS = 60_000;

export function isBridgeLive(account: { connected: boolean; lastSeenAt: Date | null; isHosted: boolean }) {
  if (account.isHosted) return false;
  return (
    account.connected &&
    Boolean(account.lastSeenAt && Date.now() - account.lastSeenAt.getTime() < BRIDGE_LIVE_MS)
  );
}

export function isBridgeLinked(account: {
  isHosted: boolean;
  brokerServer: string | null;
  accountLogin: string | null;
  apiTokenHash: string | null;
  brokerPasswordEnc?: string | null;
  connected: boolean;
}) {
  if (account.isHosted) return false;
  return Boolean(
    isBridgeConfigured(account) ||
      account.apiTokenHash ||
      account.brokerPasswordEnc ||
      account.connected,
  );
}

/** Remove website-only demo accounts so trades never appear without MT5/MT4. */
export async function revokeHostedAccounts(userId: string) {
  const hosted = await prisma.mtAccount.findMany({
    where: { userId, isHosted: true, revoked: false },
  });
  for (const h of hosted) {
    await prisma.mtPosition.deleteMany({ where: { accountId: h.id } });
    await prisma.mtAccount.update({
      where: { id: h.id },
      data: { revoked: true, connected: false, isDefault: false },
    });
  }
}

export function isBridgeConfigured(account: {
  brokerServer: string | null;
  accountLogin: string | null;
}) {
  return Boolean(account.brokerServer?.trim() || account.accountLogin?.trim());
}

export async function resolveTradingAccount(userId: string, accountId?: string) {
  await ensureBridgePairingAccount(userId);

  if (accountId) {
    const picked = await prisma.mtAccount.findFirst({
      where: { id: accountId, userId, revoked: false, isHosted: false },
    });
    if (picked) {
      const useMeta =
        metaApiEnabled() && Boolean(getStoredMtPassword(picked));
      return {
        account: picked,
        mode: useMeta ? ("metaapi" as const) : ("bridge" as const),
        bridgeLive: useMeta || isBridgeLive(picked),
      };
    }
  }

  const bridge = await getLinkedBridgeAccount(userId);
  if (bridge) {
    const useMeta = metaApiEnabled() && Boolean(getStoredMtPassword(bridge));
    return {
      account: bridge,
      mode: useMeta ? ("metaapi" as const) : ("bridge" as const),
      bridgeLive: useMeta || isBridgeLive(bridge),
    };
  }

  const shell = await ensureBridgePairingAccount(userId);
  return { account: shell, mode: "none" as const, bridgeLive: false };
}

export async function getHostedTradingAccount(userId: string) {
  return ensureMegaCandleHostedAccount(userId);
}

export type OrderRouteMode = "local" | "metaapi" | "bridge" | "none";

/** MT5/MT4 only — no website demo account. */
export async function resolveOrderAccount(
  userId: string,
  accountId?: string,
): Promise<{ account: MtAccount; mode: OrderRouteMode; bridgeLive: boolean } | null> {
  const linked =
    (accountId
      ? await prisma.mtAccount.findFirst({
          where: { id: accountId, userId, revoked: false, isHosted: false },
        })
      : null) ?? (await getLinkedBridgeAccount(userId));

  if (!linked || !isBridgeLinked(linked)) return null;

  const password = getStoredMtPassword(linked);
  const fresh = await prisma.mtAccount.findUnique({ where: { id: linked.id } });
  const account = fresh ?? linked;

  if (metaApiEnabled() && password) {
    return { account, mode: "metaapi", bridgeLive: true };
  }

  if (password && localMt5Enabled()) {
    const local = await syncLocalMt5Account(linked, password);
    if (local.ok) {
      return { account, mode: "local", bridgeLive: true };
    }
  }

  return {
    account,
    mode: "bridge",
    bridgeLive: isBridgeLive(account),
  };
}

export async function getTradingAccount(userId: string, accountId?: string) {
  const resolved = await resolveTradingAccount(userId, accountId);
  return resolved.account;
}
