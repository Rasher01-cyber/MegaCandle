import { Navigate, useSearchParams } from "react-router-dom";

/** Legacy /app/live-market → merged Trades page */
export default function LiveMarketRedirect() {
  const [params] = useSearchParams();
  const tab = params.get("tab") ?? "live";
  return <Navigate to={tab === "journal" ? "/app/trades?tab=journal" : "/app/trades"} replace />;
}
