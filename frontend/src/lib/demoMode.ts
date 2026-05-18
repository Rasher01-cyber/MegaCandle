const DEMO_KEY = "tradefx_demo_mode";

export function isDemoWorkspaceFlagSet(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(DEMO_KEY) === "1";
}

export function clearDemoWorkspaceMode(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(DEMO_KEY);
  }
}

export function enableDemoWorkspaceMode(): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(DEMO_KEY, "1");
  }
}

export function isDemoUserId(userId: string | undefined | null): boolean {
  return userId === "demo";
}
