import React, { useEffect, useState } from "react";
import { useAuth } from "../../auth/AuthProvider";
import { api } from "../../lib/api";
import { UiBadge, UiButton, UiCard, UiSectionHeader, UiSkeleton } from "../../components/ui";
import { Laptop } from "lucide-react";

type DeviceSession = {
  id: string;
  deviceLabel: string | null;
  lastActiveAt: string;
  revoked: boolean;
  expiresAt: string;
};

export default function SettingsPage() {
  return <SettingsInner />;
}

function SettingsInner() {
  const { user, logout } = useAuth();
  const [devices, setDevices] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokeLoading, setRevokeLoading] = useState<string | null>(null);

  const loadDevices = async () => {
    try {
      const res = await api.get("/api/sessions");
      setDevices(res.data.sessions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
  }, []);

  const revoke = async (id: string) => {
    setRevokeLoading(id);
    try {
      await api.delete(`/api/sessions/${id}`);
      await loadDevices();
    } finally {
      setRevokeLoading(null);
    }
  };

  return (
    <section className="space-y-5">
      <UiSectionHeader
        badge="Account Security"
        title="Settings"
        description="Manage your account and control active device sessions."
        action={
          <UiButton onClick={logout} variant="ghost">
            Logout
          </UiButton>
        }
      />
      <UiCard className="p-4">
        <div className="text-sm text-slate-400">Signed in as</div>
        <div className="mt-1 font-semibold">{user?.email}</div>
      </UiCard>

      <h2 className="text-lg font-semibold">Devices</h2>
      {loading ? (
        <UiCard className="p-4 space-y-3">
          <UiSkeleton className="h-10 w-full" />
          <UiSkeleton className="h-10 w-full" />
          <UiSkeleton className="h-10 w-full" />
        </UiCard>
      ) : (
        <div className="space-y-3">
          {devices.map((d) => (
            <UiCard
              key={d.id}
              className="p-4 flex items-start justify-between gap-4"
            >
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 font-semibold">
                  <Laptop size={14} className="text-slate-400" />
                  <span className="truncate">{d.deviceLabel ?? "Unknown device"}</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <UiBadge className={d.revoked ? "border-rose-300/30 bg-rose-500/10 text-rose-200" : ""}>
                    {d.revoked ? "Revoked" : "Active"}
                  </UiBadge>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  Last active: {new Date(d.lastActiveAt).toLocaleString()}
                </div>
                <div className="text-xs text-slate-400">Expires: {new Date(d.expiresAt).toLocaleString()}</div>
              </div>
              <UiButton
                disabled={d.revoked}
                onClick={() => revoke(d.id)}
                variant="danger"
              >
                {revokeLoading === d.id ? "Revoking..." : d.revoked ? "Revoked" : "Revoke"}
              </UiButton>
            </UiCard>
          ))}
        </div>
      )}
    </section>
  );
}

