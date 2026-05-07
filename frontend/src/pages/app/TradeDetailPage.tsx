import React from "react";
import { useNavigate } from "react-router-dom";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../lib/api";
import { UiBadge, UiButton, UiCard, UiSectionHeader, UiSkeleton } from "../../components/ui";
import { ArrowLeft, Clock3, HandCoins, Trash2 } from "lucide-react";

export default function TradeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["trade", id],
    queryFn: async () => (await api.get(`/api/trades/${id}`)).data.trade,
    enabled: Boolean(id),
  });
  const deleteTrade = useMutation({
    mutationFn: async () => api.delete(`/api/trades/${id}`),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["trades"] });
      navigate("/app/trades");
    },
  });

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Trade Review"
        title={data ? `${data.symbol} Trade` : "Trade Detail"}
        description="Review your execution details and lock in lessons for future setups."
        action={
          <div className="flex gap-2">
            <UiButton href="/app/trades" variant="ghost">
              <ArrowLeft size={14} className="mr-1" />
              Back
            </UiButton>
            <UiButton variant="danger" onClick={() => deleteTrade.mutate()} disabled={deleteTrade.isPending}>
              <Trash2 size={14} className="mr-1" />
              {deleteTrade.isPending ? "Deleting..." : "Delete"}
            </UiButton>
          </div>
        }
      />

      {isLoading ? (
        <UiCard className="p-5">
          <UiSkeleton className="h-5 w-44" />
          <UiSkeleton className="mt-3 h-20 w-full" />
        </UiCard>
      ) : data ? (
        <>
          <UiCard className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Symbol" value={data.symbol} />
              <Metric label="Side" value={<UiBadge>{data.side}</UiBadge>} />
              <Metric label="Lot Size" value={String(data.lotSize)} />
              <Metric label="Entry Price" value={String(data.entryPrice)} />
              <Metric label="Exit Price" value={String(data.exitPrice)} />
              <Metric
                label="PnL"
                value={
                  <span className={`inline-flex items-center gap-1 ${data.pnl >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                    <HandCoins size={14} />
                    {Number(data.pnl).toFixed(2)}
                  </span>
                }
              />
              <Metric
                label="Open Time"
                value={
                  <span className="inline-flex items-center gap-1 text-slate-200">
                    <Clock3 size={14} />
                    {new Date(data.openTime).toLocaleString()}
                  </span>
                }
              />
              <Metric
                label="Close Time"
                value={
                  <span className="inline-flex items-center gap-1 text-slate-200">
                    <Clock3 size={14} />
                    {new Date(data.closeTime).toLocaleString()}
                  </span>
                }
              />
              <Metric label="Trade ID" value={<span className="text-xs text-slate-400">{id}</span>} />
            </div>
          </UiCard>

          <UiCard className="p-5">
            <h2 className="text-lg font-semibold">Journal Notes</h2>
            <p className="mt-2 text-sm text-slate-300">{data.notes || "No notes added yet."}</p>
            <div className="mt-4 text-sm text-slate-400">Strategy: {data.strategy || "Not specified"}</div>
            {data.screenshotPath ? (
              <div className="mt-3 text-xs text-slate-400">
                Screenshot available at{" "}
                <a
                  className="text-blue-300 hover:underline"
                  href={`${import.meta.env.VITE_API_BASE_URL}/uploads/${data.screenshotPath}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  /uploads/{data.screenshotPath}
                </a>
              </div>
            ) : null}
          </UiCard>
        </>
      ) : (
        <UiCard className="p-5 text-sm text-slate-300">Trade was not found or you do not have access.</UiCard>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-500/25 bg-slate-900/60 p-3">
      <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{label}</div>
      <div className="mt-1 text-base font-medium">{value}</div>
    </div>
  );
}

