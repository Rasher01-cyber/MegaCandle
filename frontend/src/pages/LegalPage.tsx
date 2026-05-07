import React from "react";
import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { UiButton, UiCard } from "../components/ui";
import TradingVideoBackdrop from "../components/TradingVideoBackdrop";

export default function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname === "/privacy";

  const content = useMemo(
    () =>
      isPrivacy
        ? {
            title: "Privacy Policy",
            items: [
              "We collect account details required for login and profile setup.",
              "Trading records you store are used only to power your analytics and reports.",
              "We use secure cookies for authenticated sessions.",
              "You can request data deletion by contacting support from the Contact section.",
            ],
          }
        : {
            title: "Terms & Conditions",
            items: [
              "Use this platform responsibly and in compliance with your local laws.",
              "Trading is risky; platform insights are educational and not financial advice.",
              "You are responsible for protecting your account and login credentials.",
              "We may update platform features to improve performance, reliability, and security.",
            ],
          },
    [isPrivacy],
  );

  return (
    <div className="app-grid-bg relative min-h-screen overflow-hidden px-6 py-10">
      <TradingVideoBackdrop />
      <div className="relative z-10 mx-auto max-w-3xl">
        <UiCard className="border border-slate-200/90 bg-white/90 p-8 dark:border-slate-700/80 dark:bg-slate-950/85">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{content.title}</h1>
          <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            {content.items.map((item) => (
              <p key={item}>{item}</p>
            ))}
          </div>
          <div className="mt-7 flex gap-3">
            <UiButton href="/">Back to Home</UiButton>
            <UiButton href="/login" variant="ghost">
              Go to Login
            </UiButton>
          </div>
        </UiCard>
      </div>
    </div>
  );
}
