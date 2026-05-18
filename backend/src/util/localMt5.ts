import { spawn } from "child_process";
import path from "path";
import type { MtAccount, TradeSide } from "@prisma/client";
import { prisma } from "./prisma";

export type LocalMt5Position = {
  ticket: number;
  symbol: string;
  side: TradeSide;
  volume: number;
  openPrice: number;
  currentPrice: number;
  profit: number;
  openTime: string;
};

export type LocalMt5BridgeResponse = {
  ok: boolean;
  error?: string;
  accountLogin?: string;
  brokerServer?: string;
  brokerName?: string;
  balance?: number;
  equity?: number;
  positions?: LocalMt5Position[];
  symbols?: string[];
  btcusdAvailable?: boolean;
  ticket?: number;
  symbol?: string;
  quotes?: Array<{
    symbol: string;
    bid: number;
    ask: number;
    spread: number;
    time: number;
  }>;
};

export type LocalMt5SyncResult = LocalMt5BridgeResponse;

const scriptPath = path.resolve(__dirname, "../../scripts/mt5_bridge.py");

let localMt5Checked: boolean | null = null;
let localMt5Works: boolean | null = null;

function runPythonBridge(payload: Record<string, unknown>): Promise<LocalMt5BridgeResponse> {
  return new Promise((resolve) => {
    const py = process.platform === "win32" ? "python" : "python3";
    const child = spawn(py, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    const timer = setTimeout(() => {
      child.kill();
      resolve({ ok: false, error: "Local MT5 bridge timed out — is MetaTrader 5 running?" });
    }, 20_000);

    child.on("close", (code) => {
      clearTimeout(timer);
      if (!stdout.trim()) {
        resolve({
          ok: false,
          error:
            stderr.trim() ||
            (code !== 0
              ? "Could not run Python MT5 bridge. Install: pip install MetaTrader5"
              : "Empty response from MT5 bridge"),
        });
        return;
      }
      try {
        const parsed = JSON.parse(stdout.trim()) as LocalMt5BridgeResponse;
        resolve(parsed);
      } catch {
        resolve({ ok: false, error: stdout.slice(0, 200) || "Invalid MT5 bridge response" });
      }
    });

    child.on("error", () => {
      clearTimeout(timer);
      resolve({
        ok: false,
        error: "Python not found. Install Python 3 and run: pip install MetaTrader5",
      });
    });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}

export function localMt5Enabled() {
  return process.env.LOCAL_MT5_ENABLED !== "0";
}

const quoteCache = new Map<string, { at: number; quotes: LocalMt5BridgeResponse["quotes"] }>();
const QUOTE_CACHE_MS = 1_500;

export async function fetchLocalMt5Quotes(symbols: string[]): Promise<LocalMt5BridgeResponse["quotes"]> {
  if (!localMt5Enabled() || symbols.length === 0) return [];
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");
  const cached = quoteCache.get(key);
  if (cached && Date.now() - cached.at < QUOTE_CACHE_MS) return cached.quotes ?? [];

  const result = await runPythonBridge({
    action: "quotes",
    login: 0,
    password: "",
    server: "",
    symbols: symbols.map((s) => s.toUpperCase()),
  });
  const quotes = result.ok && Array.isArray(result.quotes) ? result.quotes : [];
  quoteCache.set(key, { at: Date.now(), quotes });
  return quotes;
}

export async function listLocalMt5Symbols(): Promise<string[]> {
  if (!localMt5Enabled()) return ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30"];
  const result = await runPythonBridge({ action: "symbols", login: 0, password: "", server: "" });
  if (result.ok && Array.isArray(result.symbols) && result.symbols.length > 0) {
    return result.symbols;
  }
  return ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30"];
}

export async function probeLocalMt5(): Promise<boolean> {
  if (!localMt5Enabled()) return false;
  if (localMt5Works !== null) return localMt5Works;

  const probe = await runPythonBridge({ action: "sync", login: 0, password: "", server: "" });
  localMt5Checked = true;
  if (probe.ok) {
    localMt5Works = true;
    return true;
  }
  const err = probe.error ?? "";
  if (
    err.includes("Install MetaTrader5") ||
    err.includes("Python not found") ||
    err.includes("initialize failed")
  ) {
    localMt5Works = false;
    return false;
  }
  localMt5Works = true;
  return true;
}

export async function syncLocalMt5Account(
  account: MtAccount,
  password: string,
): Promise<LocalMt5BridgeResponse> {
  if (!localMt5Enabled()) return { ok: false, error: "Local MT5 disabled" };

  const login = parseInt(account.accountLogin ?? "0", 10);
  if (!login || !account.brokerServer) {
    return { ok: false, error: "Missing login or server" };
  }

  const result = await runPythonBridge({
    action: "sync",
    login,
    password,
    server: account.brokerServer,
  });

  if (!result.ok) return result;

  await prisma.mtAccount.update({
    where: { id: account.id },
    data: {
      brokerName: result.brokerName ?? undefined,
      brokerServer: result.brokerServer ?? account.brokerServer,
      accountLogin: result.accountLogin ?? account.accountLogin,
      balance: result.balance,
      equity: result.equity,
      connected: true,
      lastSeenAt: new Date(),
    },
  });

  const positions = result.positions ?? [];
  const tickets = positions.map((p) => BigInt(p.ticket));
  await prisma.mtPosition.deleteMany({
    where: {
      accountId: account.id,
      ...(tickets.length ? { ticket: { notIn: tickets } } : {}),
    },
  });

  for (const p of positions) {
    const ticket = BigInt(p.ticket);
    await prisma.mtPosition.upsert({
      where: { accountId_ticket: { accountId: account.id, ticket } },
      create: {
        accountId: account.id,
        ticket,
        symbol: p.symbol.toUpperCase(),
        side: p.side,
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit,
        openTime: new Date(p.openTime),
      },
      update: {
        symbol: p.symbol.toUpperCase(),
        side: p.side,
        volume: p.volume,
        openPrice: p.openPrice,
        currentPrice: p.currentPrice,
        profit: p.profit,
      },
    });
  }

  return result;
}

export type LocalTradeResult =
  | { ok: true; ticket: number; symbol: string }
  | { ok: false; error: string };

export async function localMt5OpenTrade(
  account: MtAccount,
  password: string,
  params: { symbol: string; side: TradeSide; volume: number },
): Promise<LocalTradeResult> {
  const login = parseInt(account.accountLogin ?? "0", 10);
  const result = await runPythonBridge({
    action: "open",
    login,
    password,
    server: account.brokerServer,
    symbol: params.symbol.toUpperCase(),
    side: params.side,
    volume: params.volume,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "MT5 order failed" };
  }
  await syncLocalMt5Account(account, password);
  const ticket = result.ticket ?? 0;
  const symbol = result.symbol ?? params.symbol;
  return { ok: true, ticket, symbol };
}

export async function localMt5CloseTrade(
  account: MtAccount,
  password: string,
  ticket: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const login = parseInt(account.accountLogin ?? "0", 10);
  const result = await runPythonBridge({
    action: "close",
    login,
    password,
    server: account.brokerServer,
    ticket,
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "MT5 close failed" };
  }
  await syncLocalMt5Account(account, password);
  return { ok: true };
}
