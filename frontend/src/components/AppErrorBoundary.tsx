import React from "react";
import { Link } from "react-router-dom";

type State = { hasError: boolean; message: string };

export default class AppErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : "Unexpected application error",
    };
  }

  componentDidCatch(error: unknown) {
    // Keep this log for debugging production/runtime crashes.
    // eslint-disable-next-line no-console
    console.error("App render error:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-grid-bg min-h-screen px-6 py-10 text-slate-900 dark:text-white">
          <div className="mx-auto max-w-xl rounded-2xl border border-rose-300/45 bg-white/95 p-6 shadow-lg dark:border-rose-500/35 dark:bg-slate-950/90">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              The page crashed while rendering. Refresh once; if it repeats, use Home and sign in again.
            </p>
            <p className="mt-2 rounded-md bg-slate-100 px-3 py-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {this.state.message}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Refresh
              </button>
              <Link
                to="/"
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-900"
              >
                Go Home
              </Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
