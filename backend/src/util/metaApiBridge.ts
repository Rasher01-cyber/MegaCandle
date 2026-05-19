import type { MtAccount, TradeSide } from "@prisma/client";
import { config } from "./config";
import { decryptMtSecret } from "./mtSecrets";
import { prisma } from "./prisma";
import { toBrokerSymbol } from "./mtSymbols";
import { formatTradingError } from "./mtErrors";

type MetaApiAccountLike = {
  id: string;
  deploy: () => Promise<void>;
  waitConnected: () => Promise<void>;
  getRPCConnection: () => MetaRpc;
};

type MetaRpc = {
  connect: () => Promise<void>;
  waitSynchronized: () => Promise<void>;
  getAccountInformation: () => Promise<{ balance?: number; equity?: number }>;
  getPositions: () => Promise<
    Array<{
      id: string | number;
      symbol: string;
      type: string;
      volume: number;
      openPrice: number;
      currentPrice: number;
      profit: number;
      time: Date | string;
    }>
  >;
  createMarketBuyOrder: (
    symbol: string,
    volume: number,
    sl?: number,
    tp?: number,
    options?: { comment?: string; magic?: number },
  ) => Promise<{ orderId?: string | number; positionId?: string | number }>;
  createMarketSellOrder: (
    symbol: string,
    volume: number,
    sl?: number,
    tp?: number,
    options?: { comment?: string; magic?: number },
  ) => Promise<{ orderId?: string | number; positionId?: string | number }>;
  closePosition: (positionId: string, options?: { comment?: string }) => Promise<void>;
  getSymbolPrice?: (
    symbol: string,
  ) => Promise<{ bid: number; ask: number; time?: Date | string } | undefined>;
};

type MetaApiCtor = new (token: string) => {
  metatraderAccountApi: {
    getAccount: (id: string) => Promise<MetaApiAccountLike>;
    createAccount: (d: unknown) => Promise<MetaApiAccountLike>;
  };
};

export function metaApiEnabled() {
  return Boolean(config.METAAPI_TOKEN?.trim());
}

async function getApi() {
  if (!metaApiEnabled()) return null;
  const mod = await import("metaapi.cloud-sdk");
  const MetaApi = mod.default as unknown as MetaApiCtor;
  return new MetaApi(config.METAAPI_TOKEN!);
}

export async function getMetaApiAccount(account: MtAccount, password: string) {
  const api = await getApi();
  if (!api) return null;

  if (account.metaApiAccountId) {
    try {
      return await api.metatraderAccountApi.getAccount(account.metaApiAccountId);
    } catch {
      /* recreate below */
    }
  }

  const created = await api.metatraderAccountApi.createAccount({
    name: `megacandle-${account.userId.slice(-8)}`,
    type: "cloud",
    login: account.accountLogin,
    password,
    server: account.brokerServer,
    platform: account.platform === "MT4" ? "mt4" : "mt5",
    magic: 88001,
  });

  await prisma.mtAccount.update({
    where: { id: account.id },
    data: { metaApiAccountId: created.id, connected: true, lastSeenAt: new Date() },
  });

  return created;
}

export async function connectMetaApiRpc(account: MtAccount, password: string) {
  const meta = await getMetaApiAccount(account, password);
  if (!meta) return null;

  await meta.deploy();
  await meta.waitConnected();
  const rpc = meta.getRPCConnection();
  await rpc.connect();
  await rpc.waitSynchronized();
  return rpc;
}

export async function syncMetaApiPositions(account: MtAccount, password: string) {
  const rpc = await connectMetaApiRpc(account, password);
  if (!rpc) return false;

  const info = await rpc.getAccountInformation();
  const raw = await rpc.getPositions();

  await prisma.mtAccount.update({
    where: { id: account.id },
    data: {
      balance: info.balance ?? undefined,
      equity: info.equity ?? undefined,
      connected: true,
      lastSeenAt: new Date(),
    },
  });

  const tickets = raw.map((p) => BigInt(p.id));
  await prisma.mtPosition.deleteMany({
    where: {
      accountId: account.id,
      ...(tickets.length ? { ticket: { notIn: tickets } } : {}),
    },
  });

  for (const p of raw) {
    const ticket = BigInt(p.id);
    const side = p.type?.toLowerCase().includes("buy") ? ("LONG" as TradeSide) : ("SHORT" as TradeSide);
    await prisma.mtPosition.upsert({
      where: { accountId_ticket: { accountId: account.id, ticket } },
      create: {
        accountId: account.id,
        ticket,
        symbol: p.symbol.toUpperCase(),
        side,
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit,
        openTime: new Date(p.time),
      },
      update: {
        symbol: p.symbol.toUpperCase(),
        side,
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit,
      },
    });
  }

  return true;
}

export type MetaApiTradeResult =
  | { ok: true; ticket: number; symbol: string }
  | { ok: false; error: string };

export async function metaApiOpenTrade(
  account: MtAccount,
  password: string,
  params: { symbol: string; side: TradeSide; volume: number; sl?: number; tp?: number },
): Promise<MetaApiTradeResult> {
  try {
    const rpc = await connectMetaApiRpc(account, password);
    if (!rpc) return { ok: false, error: "Could not connect to cloud trading API." };

    const sym = toBrokerSymbol(params.symbol);
    const opts = { comment: "MegaCandle", magic: 88001 };
    const res =
      params.side === "LONG"
        ? await rpc.createMarketBuyOrder(sym, params.volume, params.sl, params.tp, opts)
        : await rpc.createMarketSellOrder(sym, params.volume, params.sl, params.tp, opts);

    await syncMetaApiPositions(account, password);
    const ticket = Number(res.positionId ?? res.orderId ?? 0);
    return { ok: true, ticket, symbol: sym };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: formatTradingError(msg) };
  }
}

export async function metaApiCloseTrade(
  account: MtAccount,
  password: string,
  ticket: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const rpc = await connectMetaApiRpc(account, password);
    if (!rpc) return { ok: false, error: "Could not connect to cloud trading API." };
    await rpc.closePosition(String(ticket), { comment: "MegaCandle close" });
    await syncMetaApiPositions(account, password);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: formatTradingError(msg) };
  }
}

export async function fetchMetaApiQuotes(account: MtAccount, password: string, symbols: string[]) {
  try {
    const rpc = await connectMetaApiRpc(account, password);
    if (!rpc?.getSymbolPrice) return [];
    const quotes: Array<{ symbol: string; bid: number; ask: number; spread: number; time: number }> = [];
    for (const sym of symbols) {
      const broker = toBrokerSymbol(sym);
      const price = await rpc.getSymbolPrice(broker);
      if (!price) continue;
      quotes.push({
        symbol: sym.toUpperCase(),
        bid: price.bid,
        ask: price.ask,
        spread: price.ask - price.bid,
        time: price.time ? Math.floor(new Date(price.time).getTime() / 1000) : Math.floor(Date.now() / 1000),
      });
    }
    return quotes;
  } catch {
    return [];
  }
}

export function getStoredMtPassword(account: MtAccount) {
  if (!account.brokerPasswordEnc) return null;
  try {
    return decryptMtSecret(account.brokerPasswordEnc);
  } catch {
    return null;
  }
}
