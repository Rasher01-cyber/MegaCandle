import { addNotification } from "./notifications";

export type ActivityKind = "success" | "error" | "info" | "trade";

export type ActivityPayload = {
  message: string;
  kind?: ActivityKind;
};

const EVENT = "megacandle-activity";

export function notifyActivity(message: string, kind: ActivityKind = "info") {
  const payload: ActivityPayload = { message, kind };
  addNotification(message);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: payload }));
  }
  return payload;
}

export function subscribeActivity(handler: (payload: ActivityPayload) => void) {
  if (typeof window === "undefined") return () => {};
  const fn = (e: Event) => handler((e as CustomEvent<ActivityPayload>).detail);
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}
