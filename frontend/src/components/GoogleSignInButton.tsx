import React from "react";
import { GoogleLogin } from "@react-oauth/google";
import type { CredentialResponse } from "@react-oauth/google";

function GoogleGMark({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

type Props = {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError?: () => void;
  disabled?: boolean;
};

/**
 * Looks like a normal site “Continue with Google” row, but the real click target is the official
 * Google Identity button (invisible, full-size) so the account picker / FedCM flow works reliably.
 */
export default function GoogleSignInButton({ onSuccess, onError, disabled }: Props) {
  return (
    <div
      className={`relative h-[48px] w-full overflow-hidden rounded-xl border border-slate-300/90 bg-white shadow-sm dark:border-slate-400/25 dark:bg-white ${
        disabled ? "pointer-events-none opacity-60" : ""
      }`}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-3 px-4">
        <GoogleGMark />
        <span className="text-sm font-semibold text-slate-800">Continue with Google</span>
      </div>
      <div
        className="absolute inset-0 z-10 opacity-0 [&>div]:flex [&>div]:h-full [&>div]:w-full [&>div]:items-stretch [&>div]:justify-stretch [&_iframe]:!h-full [&_iframe]:!w-full [&_iframe]:!max-w-none"
        aria-hidden
      >
        <GoogleLogin
          onSuccess={onSuccess}
          onError={onError}
          useOneTap={false}
          auto_select={false}
          prompt="select_account"
          ux_mode="popup"
          type="standard"
          theme="outline"
          size="large"
          text="continue_with"
          shape="rectangular"
          width="100%"
          logo_alignment="left"
        />
      </div>
    </div>
  );
}
