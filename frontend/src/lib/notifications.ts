export type AppNotification = {
  id: string;
  message: string;
  createdAt: number;
};

const KEY = "tradefx_notifications";

export function getNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((n) => typeof n?.id === "string" && typeof n?.message === "string" && typeof n?.createdAt === "number")
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

export function addNotification(message: string) {
  const next: AppNotification = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    message,
    createdAt: Date.now(),
  };
  const existing = getNotifications();
  const merged = [next, ...existing].slice(0, 20);
  localStorage.setItem(KEY, JSON.stringify(merged));
  return next;
}

export function clearNotifications() {
  localStorage.removeItem(KEY);
}
