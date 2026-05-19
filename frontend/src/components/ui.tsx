import React from "react";
import { Link } from "react-router-dom";

function isInternalPath(href: string) {
  return href.startsWith("/") && !href.startsWith("//");
}

function cx(...items: Array<string | undefined | false>) {
  return items.filter(Boolean).join(" ");
}

export function UiCard({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "rounded-2xl border border-slate-200 bg-white/60 text-slate-900 shadow-xl shadow-slate-200/40 backdrop-blur-md dark:border-slate-400/20 dark:bg-slate-900/55 dark:text-white dark:shadow-black/20",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function UiBadge({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-full border border-blue-200 bg-blue-600/10 px-2.5 py-1 text-xs font-medium text-blue-700 dark:border-blue-300/30 dark:bg-blue-500/10 dark:text-blue-200",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function UiButton({
  href,
  onClick,
  children,
  variant = "primary",
  type,
  disabled,
  className = "",
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-60";
  const byVariant =
    variant === "primary"
      ? "border border-blue-400/40 bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:scale-[1.01] hover:shadow-lg hover:shadow-blue-500/20"
      : variant === "danger"
        ? "border border-rose-300 bg-rose-600/10 text-rose-700 hover:bg-rose-600/15 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
        : "border border-slate-300 bg-white/80 text-slate-900 hover:bg-white dark:border-slate-300/20 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

  if (href) {
    if (isInternalPath(href)) {
      return (
        <Link to={href} onClick={onClick} className={cx(base, byVariant, className)}>
          {children}
        </Link>
      );
    }
    return (
      <a
        href={href}
        onClick={onClick}
        className={cx(base, byVariant, className)}
      >
        {children}
      </a>
    );
  }

  return (
    <button type={type ?? "button"} disabled={disabled} onClick={onClick} className={cx(base, byVariant, className)}>
      {children}
    </button>
  );
}

export function UiSkeleton({
  className = "",
}: {
  className?: string;
}) {
  return <div className={cx("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-300/15", className)} />;
}

export function UiEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center dark:border-slate-300/25 dark:bg-slate-900/40">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-slate-700 dark:text-slate-300">{description}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function UiSectionHeader({
  badge,
  title,
  description,
  action,
}: {
  badge?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {badge ? <UiBadge className="mb-3">{badge}</UiBadge> : null}
        <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-700 dark:text-slate-300">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function UiStatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
}) {
  return (
    <UiCard className="bg-gradient-to-b from-white/90 to-white/70 p-4 dark:from-slate-900/80 dark:to-slate-900/50">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{label}</p>
        {icon ? <span className="text-blue-600 dark:text-blue-300">{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p> : null}
    </UiCard>
  );
}

