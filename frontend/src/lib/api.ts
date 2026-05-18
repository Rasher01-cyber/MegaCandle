import axios from "axios";

/** Strip trailing /api so paths like `/api/mt5/connect` are not doubled. */
function normalizeApiBase(raw: string | undefined): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "";
  return trimmed.replace(/\/api\/?$/i, "").replace(/\/$/, "");
}

const apiBaseUrl = normalizeApiBase(import.meta.env.VITE_API_BASE_URL as string | undefined);

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
  timeout: 25_000,
});

