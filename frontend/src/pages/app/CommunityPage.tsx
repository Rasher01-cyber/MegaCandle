import React from "react";

export default function CommunityPage() {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h1 className="text-2xl font-bold">Community</h1>
        <p className="mt-2 text-white/70">
          Community features are being designed for professional collaboration, shared setups, and
          structured trader discussions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Status", "In design"],
          ["Planned Version", "v1.3"],
          ["Current Focus", "Profiles + discussion"],
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

