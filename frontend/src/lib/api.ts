import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || "";

export const api = axios.create({
  baseURL: apiBaseUrl,
  withCredentials: true,
});

