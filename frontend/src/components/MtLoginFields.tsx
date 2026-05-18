import React, { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { COMMON_MT_SERVERS } from "../lib/mtPresets";

export type MtLoginFieldValues = {
  accountLogin: string;
  brokerServer: string;
  password: string;
  savePassword: boolean;
};

type Props = MtLoginFieldValues & {
  onChange: (patch: Partial<MtLoginFieldValues>) => void;
  serverListId?: string;
  className?: string;
};

export default function MtLoginFields({
  accountLogin,
  brokerServer,
  password,
  savePassword,
  onChange,
  serverListId: serverListIdProp,
  className = "",
}: Props) {
  const autoId = useId();
  const serverListId = serverListIdProp ?? `mt-servers-${autoId.replace(/:/g, "")}`;
  const [showPassword, setShowPassword] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-white/15 dark:bg-[#0d1118] dark:text-white";
  const monoClass = `${inputClass} font-mono`;

  return (
    <div className={`space-y-3 ${className}`}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        Login
        <input
          type="text"
          inputMode="numeric"
          autoComplete="username"
          value={accountLogin}
          onChange={(e) => onChange({ accountLogin: e.target.value.replace(/[^\d]/g, "") })}
          placeholder="Account number (e.g. 107166113)"
          className={monoClass}
        />
      </label>

      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        Password
        <div className="relative mt-1">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete={savePassword ? "current-password" : "off"}
            value={password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Trading password (same as in MetaTrader)"
            className={`${monoClass} pr-10`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs font-normal text-slate-600 dark:text-slate-400">
          <input
            type="checkbox"
            checked={savePassword}
            onChange={(e) => onChange({ savePassword: e.target.checked })}
            className="rounded border-slate-300"
          />
          Save password on this device only
        </label>
        <p className="mt-1 text-[10px] text-slate-500">
          Encrypted on our server — same password you use in MetaTrader (File → Login to Trade Account).
        </p>
      </label>

      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        Server
        <input
          list={serverListId}
          value={brokerServer}
          onChange={(e) => onChange({ brokerServer: e.target.value })}
          placeholder="e.g. MetaQuotes-Demo"
          className={monoClass}
        />
        <datalist id={serverListId}>
          {COMMON_MT_SERVERS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
    </div>
  );
}
