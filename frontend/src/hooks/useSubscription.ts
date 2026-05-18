import { useEffect, useState } from "react";
import { ENTITLEMENT_CHANGED_EVENT, getSubscriptionSnapshot, type SubscriptionSnapshot } from "../lib/entitlements";

export function useSubscription(): SubscriptionSnapshot {
  const [snap, setSnap] = useState<SubscriptionSnapshot>(() => getSubscriptionSnapshot());

  useEffect(() => {
    const sync = () => setSnap(getSubscriptionSnapshot());
    sync();
    window.addEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(ENTITLEMENT_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return snap;
}
