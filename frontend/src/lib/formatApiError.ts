import axios from "axios";

/** User-facing message from API / network failures. */
export function formatApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) {
      return "Cannot reach the trading API. Start the backend on port 4000 (npm run dev in backend/) and refresh.";
    }
    const data = err.response.data as {
      error?: string;
      issues?: Array<{ message?: string }>;
    };
    if (typeof data?.error === "string" && data.error.trim()) {
      return humanizeTradingError(data.error);
    }
    if (Array.isArray(data?.issues) && data.issues.length > 0) {
      return data.issues.map((i) => i.message ?? "Invalid field").join(" · ");
    }
    if (err.response.status === 401) {
      return "Session expired — sign out of demo workspace and sign in with email or Google.";
    }
    if (err.response.status === 404) {
      return "Trading API route not found. Restart the backend (npm run dev in backend/) and refresh this page.";
    }
    return `${fallback} (HTTP ${err.response.status})`;
  }
  if (err instanceof Error && err.message.trim()) return humanizeTradingError(err.message);
  return fallback;
}

function humanizeTradingError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("10018") || lower.includes("market closed")) {
    return "Market is closed for this symbol. Try during session hours or use EURUSD / XAUUSD.";
  }
  if (lower.includes("retcode")) {
    return raw.replace(/\(\([^)]*\)\)/g, "").replace(/retcode[=:]?\s*\d+\s*/i, "").trim() || raw;
  }
  return raw;
}
