import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { isAxiosError } from "axios";
import { Mail } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../auth/AuthProvider";
import ThemeToggle from "../components/ThemeToggle";
import GoogleSignInButton from "../components/GoogleSignInButton";
import TradingVideoBackdrop from "../components/TradingVideoBackdrop";
import LoginCandleBanner from "../components/LoginCandleBanner";

type EmailMode = "login" | "signup";

function SignInCard({
  googleClientId,
  configReady,
  apiReachable,
}: {
  googleClientId: string | null;
  configReady: boolean;
  apiReachable: boolean;
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refresh } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const deviceInfo = useMemo(() => {
    const key = "tradefx_device_id";
    let deviceId = localStorage.getItem(key);
    if (!deviceId) {
      const fallbackId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      deviceId =
        typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : fallbackId;
      localStorage.setItem(key, deviceId);
    }
    const deviceFingerprintRaw = `${navigator.userAgent}|${deviceId}`;
    const deviceLabel = `${navigator.platform || "device"} / ${navigator.language}`;
    return { deviceFingerprintRaw, deviceLabel };
  }, []);

  const hasGoogle = Boolean(googleClientId);

  const submitEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);
    setErrorMessage(null);
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setFieldError("Enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setFieldError("Password must be at least 8 characters.");
      return;
    }
    if (emailMode === "signup" && name.trim().length < 1) {
      setFieldError("Enter your name.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isSignup = emailMode === "signup";
      if (isSignup) {
        await api.post("/api/auth/register", {
          email: trimmed,
          password,
          name: name.trim(),
          deviceFingerprint: deviceInfo.deviceFingerprintRaw,
          deviceLabel: deviceInfo.deviceLabel,
        });
      } else {
        await api.post("/api/auth/login", {
          email: trimmed,
          password,
          deviceFingerprint: deviceInfo.deviceFingerprintRaw,
          deviceLabel: deviceInfo.deviceLabel,
        });
      }
      await refresh();
      const nextTarget = searchParams.get("next");
      if (isSignup) {
        navigate(nextTarget || "/#pricing");
      } else {
        navigate(nextTarget || "/app/dashboard");
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const data = err.response?.data as { error?: string } | undefined;
        const msg = data?.error;
        if (err.response?.status === 409) {
          setFieldError(msg || "This email is already registered. Sign in instead.");
        } else if (err.response?.status === 401) {
          setFieldError(msg || "Invalid email or password.");
        } else if (err.response?.status === 400) {
          setFieldError(msg || "Check your details and try again.");
        } else {
          setErrorMessage(msg || err.message || "Could not reach the server. Is the API running?");
        }
      } else {
        setErrorMessage("Something went wrong. Try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoginCandleBanner />
      <h1 className="text-center text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome</h1>
      <p className="mt-2 text-center text-sm text-slate-600 dark:text-zinc-300">Sign in or create an account</p>

      <div className="mt-8 space-y-4">
        {!configReady ? (
          <div className="flex h-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-500 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-400">
            Loading sign-in…
          </div>
        ) : null}

        {configReady && apiReachable && hasGoogle ? (
          <GoogleSignInButton
            disabled={isSubmitting}
            onSuccess={async (credentialResponse) => {
              if (!credentialResponse.credential) {
                setErrorMessage("Google sign-in failed. Missing credential token.");
                return;
              }
              setErrorMessage(null);
              setIsSubmitting(true);
              try {
                await api.post("/api/auth/google", {
                  credential: credentialResponse.credential,
                  deviceFingerprint: deviceInfo.deviceFingerprintRaw,
                  deviceLabel: deviceInfo.deviceLabel,
                });
                await refresh();
                navigate(searchParams.get("next") || "/app/dashboard");
              } catch (err) {
                if (isAxiosError(err)) {
                  const status = err.response?.status;
                  const data = err.response?.data as { error?: string } | undefined;
                  const msg = data?.error;
                  if (status === 503) {
                    setErrorMessage(
                      msg ||
                        "Google sign-in is disabled until GOOGLE_CLIENT_ID is set in backend/.env and the API is restarted.",
                    );
                  } else if (status === 401) {
                    setErrorMessage(msg || "Server rejected the Google token. Check GOOGLE_CLIENT_ID on the server.");
                  } else if (status === 409) {
                    setErrorMessage(msg || "This account is already linked differently.");
                  } else if (status === 400) {
                    setErrorMessage(msg || "Invalid sign-in request.");
                  } else {
                    setErrorMessage(
                      msg || err.message || "Sign-in failed. Is the API running (VITE_API_BASE_URL / localhost:4000)?",
                    );
                  }
                } else {
                  setErrorMessage("Sign-in failed. Please try again.");
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
            onError={() => {
              setErrorMessage("Google sign-in was cancelled or blocked. Allow pop-ups for this site or try again.");
            }}
          />
        ) : null}
        {configReady && apiReachable && hasGoogle ? (
          <p className="text-center text-[11px] text-slate-500 dark:text-zinc-400">
            Use Google for instant sign-in or automatic account creation.
          </p>
        ) : null}

        {configReady && !apiReachable ? (
          <div className="rounded-xl border border-amber-400/40 bg-amber-50/95 px-4 py-3 text-left text-sm text-amber-950 dark:border-amber-400/35 dark:bg-amber-950/35 dark:text-amber-100">
            <p className="font-medium">Server is waking up</p>
            <p className="mt-2 text-xs leading-relaxed text-amber-900/90 dark:text-amber-100/90">
              Email login works as soon as the backend is running. If needed, start API from <span className="font-mono">backend</span> using{" "}
              <span className="font-mono">npm run dev</span>.
            </p>
          </div>
        ) : null}

        <div className="flex items-center gap-3 py-0.5">
          <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-600" />
          <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">or</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-zinc-600" />
        </div>

        <button
          type="button"
          onClick={() => {
            setEmailOpen((v) => !v);
            setFieldError(null);
            setErrorMessage(null);
          }}
          className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-300/90 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50/90 hover:shadow dark:border-zinc-500/40 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-400 dark:hover:bg-zinc-800/90"
        >
          <Mail className="text-blue-600 dark:text-blue-400" size={20} strokeWidth={2} />
          Continue with Email
        </button>

        {emailOpen ? (
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-zinc-600 dark:bg-zinc-900/60">
            <div className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-zinc-800/80">
              <button
                type="button"
                onClick={() => {
                  setEmailMode("login");
                  setFieldError(null);
                }}
                className={`flex-1 rounded-md py-2 text-center text-sm font-semibold transition ${
                  emailMode === "login"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmailMode("signup");
                  setFieldError(null);
                }}
                className={`flex-1 rounded-md py-2 text-center text-sm font-semibold transition ${
                  emailMode === "signup"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-zinc-950 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={submitEmailAuth} className="space-y-3">
              {emailMode === "signup" ? (
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                    placeholder="Jane Doe"
                    autoComplete="name"
                  />
                </div>
              ) : null}
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-blue-500/20 focus:border-blue-500 focus:ring-2 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                  placeholder={emailMode === "signup" ? "At least 8 characters" : "Your password"}
                  autoComplete={emailMode === "signup" ? "new-password" : "current-password"}
                />
              </div>
              {fieldError ? <p className="text-xs text-red-600 dark:text-red-400">{fieldError}</p> : null}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {isSubmitting ? "Please wait…" : emailMode === "signup" ? "Create account" : "Log in"}
              </button>
            </form>
          </div>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/35 dark:bg-red-950/40 dark:text-red-200">
          {errorMessage}
        </p>
      ) : null}

      <p className="mt-8 text-center text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
        By continuing, you agree to our{" "}
        <Link to="/terms" className="underline decoration-slate-400 underline-offset-2 hover:text-slate-700 dark:hover:text-zinc-200">
          Terms
        </Link>{" "}
        and{" "}
        <Link to="/privacy" className="underline decoration-slate-400 underline-offset-2 hover:text-slate-700 dark:hover:text-zinc-200">
          Privacy Policy
        </Link>
        .
      </p>
    </>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const envOverride = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() || null;
  const [resolvedClientId, setResolvedClientId] = useState<string | null>(null);
  const [configReady, setConfigReady] = useState(() => Boolean(envOverride));
  const [apiReachable, setApiReachable] = useState(true);

  useEffect(() => {
    if (envOverride) {
      setApiReachable(true);
      setConfigReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      let reached = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const { data } = await api.get<{ googleClientId?: string }>("/api/auth/public-config");
          if (cancelled) return;
          reached = true;
          const id = data?.googleClientId?.trim();
          if (id) setResolvedClientId(id);
          break;
        } catch {
          await new Promise((r) => setTimeout(r, 260 + attempt * 240));
        }
      }
      if (cancelled) return;
      setApiReachable(reached);
      setConfigReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [envOverride]);

  const effectiveGoogleId = envOverride || resolvedClientId;

  return (
    <div className="app-grid-bg relative min-h-screen overflow-hidden text-slate-900 dark:text-zinc-100">
      <TradingVideoBackdrop variant="login" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="absolute right-4 top-4 z-20 md:right-6 md:top-6">
          <ThemeToggle />
        </div>

        <div className="flex flex-1 flex-col items-center justify-center px-4 py-16 pt-20">
          <div className="w-full max-w-[420px] rounded-2xl border border-slate-200/90 bg-white/95 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md dark:border-zinc-700/90 dark:bg-zinc-950/90 dark:shadow-black/40">
            {effectiveGoogleId ? (
              <GoogleOAuthProvider clientId={effectiveGoogleId}>
                <SignInCard
                  googleClientId={effectiveGoogleId}
                  configReady={configReady}
                  apiReachable={apiReachable}
                />
              </GoogleOAuthProvider>
            ) : (
              <SignInCard
                googleClientId={null}
                configReady={configReady}
                apiReachable={apiReachable}
              />
            )}
          </div>

          <div className="mt-10 w-full max-w-[420px] border-t border-slate-200/90 pt-6 dark:border-zinc-700/80">
            <p className="text-center text-xs text-slate-500 dark:text-zinc-400">© 2026 MegaCandle. All rights reserved.</p>
            <button
              type="button"
              onClick={async () => {
                localStorage.setItem("tradefx_demo_mode", "1");
                await refresh();
                navigate("/app/dashboard");
              }}
              className="mt-3 w-full text-center text-xs font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
            >
              Try demo workspace without signing in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
