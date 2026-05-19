import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Radio, ClipboardList } from "lucide-react";
import LiveMarketPage from "./LiveMarketPage";
import TradeJournalPanel from "../../components/TradeJournalPanel";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";
type Tab = "live" | "journal";

export default function TradesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(tabParam === "journal" ? "journal" : "live");

  useEffect(() => {
    if (tabParam === "journal") setTab("journal");
    else if (tabParam === "live") setTab("live");
  }, [tabParam]);

  const setTabAndUrl = (next: Tab) => {
    setTab(next);
    setSearchParams(next === "live" ? {} : { tab: next }, { replace: true });
  };

  return (
    <section className="space-y-6">
      <UiSectionHeader
        badge="Trading hub"
        title="Trades"
        description="Live trading (works without MT5 open when cloud is enabled) and full trade records synced from your account."
      />

      <UiCard className="p-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Trades sections">
          <UiButton
            variant={tab === "live" ? "primary" : "ghost"}
            className="min-w-[140px] flex-1 sm:flex-none"
            onClick={() => setTabAndUrl("live")}
          >
            <Radio size={14} className="mr-1.5" />
            Live trading
          </UiButton>
          <UiButton
            variant={tab === "journal" ? "primary" : "ghost"}
            className="min-w-[140px] flex-1 sm:flex-none"
            onClick={() => setTabAndUrl("journal")}
          >
            <ClipboardList size={14} className="mr-1.5" />
            Records
          </UiButton>
        </div>
      </UiCard>

      {tab === "live" ? <LiveMarketPage embedded /> : <TradeJournalPanel />}
    </section>
  );
}
