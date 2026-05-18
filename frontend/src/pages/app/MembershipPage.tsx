import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { UiButton, UiCard, UiSectionHeader } from "../../components/ui";
import { api } from "../../lib/api";
import { addNotification } from "../../lib/notifications";
import { setEntitlement, type Billing, type PlanTier } from "../../lib/entitlements";

type Plan = "pro" | "elite";

const MERCHANT_UPI_ID = "megacandle@upi";
const MERCHANT_NAME = "MegaCandle";

const PRICING: Record<Billing, Record<Plan, { amount: number; label: string }>> = {
  monthly: {
    pro: { amount: 16.99, label: "Pro Monthly" },
    elite: { amount: 27.99, label: "Elite Monthly" },
  },
  yearly: {
    pro: { amount: 149, label: "Pro Yearly" },
    elite: { amount: 239, label: "Elite Yearly" },
  },
};

function makeUpiLink(amount: number, note: string) {
  const params = new URLSearchParams({
    pa: MERCHANT_UPI_ID,
    pn: MERCHANT_NAME,
    am: amount.toFixed(2),
    cu: "USD",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

function formatUsd(amount: number) {
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
}

export default function MembershipPage() {
  const [params] = useSearchParams();
  const initialBilling = params.get("billing") === "yearly" ? "yearly" : "monthly";
  const initialPlan = params.get("plan") === "elite" ? "elite" : "pro";

  const [billing, setBilling] = useState<Billing>(initialBilling);
  const [plan, setPlan] = useState<Plan>(initialPlan);

  const selected = PRICING[billing][plan];
  const note = `${selected.label} membership`;
  const upiLink = useMemo(() => makeUpiLink(selected.amount, note), [selected.amount, note]);
  const qrUrl = "/phonepe-qr.png";

  const confirmPaid = async () => {
    setEntitlement({ planTier: plan as PlanTier, billing });
    addNotification(`Payment confirmed: ${plan.toUpperCase()} (${billing}). Connect MT5/MT4 on Live Market to trade.`);
  };

  return (
    <section className="space-y-6">
      <UiSectionHeader
        badge="Membership Payment"
        title="Complete Your Plan"
        description="Scan the QR in your payment app. Amount is shown in USD for your selected membership."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <UiCard className="p-5">
          <div className="text-sm font-semibold">Choose Billing</div>
          <div className="mt-3 inline-flex rounded-xl border border-slate-300 bg-white/80 p-1 dark:border-slate-700 dark:bg-slate-900/50">
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm ${billing === "monthly" ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
              onClick={() => {
                setBilling("monthly");
                addNotification("Billing changed to Monthly.");
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`rounded-lg px-4 py-2 text-sm ${billing === "yearly" ? "bg-blue-500 text-white" : "text-slate-700 dark:text-slate-300"}`}
              onClick={() => {
                setBilling("yearly");
                addNotification("Billing changed to Yearly.");
              }}
            >
              Yearly
            </button>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {(["pro", "elite"] as const).map((p) => {
              const item = PRICING[billing][p];
              const active = p === plan;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPlan(p);
                    addNotification(`${p.toUpperCase()} plan selected.`);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    active
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-300 bg-white/70 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900/50"
                  }`}
                >
                  <div className="text-sm font-semibold uppercase">{p}</div>
                  <div className="mt-1 text-2xl font-bold">
                    ${formatUsd(item.amount)}
                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400">/{billing === "monthly" ? "month" : "year"}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </UiCard>

        <UiCard className="p-5">
          <div className="text-sm font-semibold">Pay with Your PhonePe QR</div>
          <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Plan: <span className="font-semibold">{selected.label}</span>
          </div>
          <div className="text-sm text-slate-700 dark:text-slate-300">
            Amount: <span className="font-semibold">${formatUsd(selected.amount)}</span>
          </div>
          <img src={qrUrl} alt="PhonePe QR Code" className="mt-4 w-full max-w-[320px] rounded-lg border border-slate-300 bg-white p-2" />
          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={upiLink}
              onClick={() => addNotification(`Payment app opened for $${formatUsd(selected.amount)} (${selected.label}).`)}
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Open UPI App
            </a>
            <UiButton href="/app/dashboard" variant="ghost">
              Back to Dashboard
            </UiButton>
          </div>

          <div className="mt-4 rounded-xl border border-slate-300 bg-white/60 p-4 dark:border-slate-700/60 dark:bg-slate-900/40">
            <div className="text-sm font-semibold">Mark payment as completed</div>
            <p className="mt-1 text-xs leading-relaxed text-slate-700 dark:text-slate-300">
              This prototype unlocks features using a local confirmation step (there is no live payment webhook wired yet).
              After you pay, click this button once to activate your plan. Pro unlocks AI Reports; Elite also unlocks Backtesting.
            </p>
            <UiButton
              onClick={confirmPaid}
              className="mt-3 w-full"
              variant="primary"
            >
              I have paid ({plan.toUpperCase()}, {billing})
            </UiButton>
          </div>
        </UiCard>
      </div>
    </section>
  );
}
