import React from "react";

export default function LeaderboardPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-2 text-white/70">
          Leaderboard ranking is being prepared with risk-adjusted scoring to keep competition fair
          and focused on consistency.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Status", "In progress"],
          ["Planned Version", "v1.2"],
          ["Current Focus", "Ranking model"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <div className="text-xs uppercase tracking-[0.12em] text-white/50">{label}</div>
            <div className="mt-2 text-base font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

