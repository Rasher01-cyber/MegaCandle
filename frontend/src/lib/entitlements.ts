export type Billing = "monthly" | "yearly";
export type PlanTier = "pro" | "elite";

export type Entitlement = {
  active: boolean;
  planTier: PlanTier;
  billing: Billing;
  expiresAt: number | null;
};

const STORAGE_KEY = "tradefx_entitlement_v1";

/** Fired on same-tab updates; pair with `storage` for other tabs. */
export const ENTITLEMENT_CHANGED_EVENT = "tradefx-entitlement-changed";

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function notifyEntitlementChanged() {
  window.dispatchEvent(new Event(ENTITLEMENT_CHANGED_EVENT));
}

function isEntitlementValid(ent: Entitlement): boolean {
  if (!ent.active) return false;
  if (ent.expiresAt == null) return true;
  return Date.now() < ent.expiresAt;
}

/** Stored subscription; `active` false if missing or expired. Demo mode does not grant paid features. */
export function getEntitlement(): Entitlement | null {
  const ent = readJson<Entitlement>(STORAGE_KEY);
  if (!ent) return null;
  if (!isEntitlementValid(ent)) return { ...ent, active: false };
  return { ...ent, active: true };
}

export function setEntitlement(params: { planTier: PlanTier; billing: Billing }) {
  const { planTier, billing } = params;
  const expiresAt =
    billing === "monthly" ? Date.now() + 30 * 24 * 60 * 60 * 1000 : Date.now() + 365 * 24 * 60 * 60 * 1000;

  writeJson<Entitlement>(STORAGE_KEY, {
    active: true,
    planTier,
    billing,
    expiresAt,
  });
  notifyEntitlementChanged();
}

export function clearEntitlement() {
  localStorage.removeItem(STORAGE_KEY);
  notifyEntitlementChanged();
}

/** Pro or Elite monthly/yearly — unlocks AI Reports (and MT sync upsell resolution in UI). */
export function hasAiReportsEntitlement(): boolean {
  const ent = getEntitlement();
  return Boolean(ent?.active && (ent.planTier === "pro" || ent.planTier === "elite"));
}

/** Elite only — matches journal products that bundle the backtester on top tier. */
export function hasBacktestingEntitlement(): boolean {
  const ent = getEntitlement();
  return Boolean(ent?.active && ent.planTier === "elite");
}

export type SubscriptionSnapshot = {
  tier: "free" | "pro" | "elite";
  billing: Billing | null;
  expiresAt: number | null;
  hasAiReports: boolean;
  hasBacktesting: boolean;
};

export function getSubscriptionSnapshot(): SubscriptionSnapshot {
  const ent = getEntitlement();
  if (!ent?.active) {
    return {
      tier: "free",
      billing: null,
      expiresAt: null,
      hasAiReports: false,
      hasBacktesting: false,
    };
  }
  return {
    tier: ent.planTier,
    billing: ent.billing,
    expiresAt: ent.expiresAt,
    hasAiReports: hasAiReportsEntitlement(),
    hasBacktesting: hasBacktestingEntitlement(),
  };
}
