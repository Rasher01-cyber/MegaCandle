import React from "react";
import { UiButton, UiCard } from "../components/ui";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <UiCard className="w-full max-w-lg p-8 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-white/50">404</div>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        <p className="mt-2 text-sm text-white/65">
          The page you requested does not exist or may have been moved.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <UiButton href="/">Go Home</UiButton>
          <UiButton href="/app/dashboard" variant="ghost">
            Dashboard
          </UiButton>
        </div>
      </UiCard>
    </div>
  );
}

