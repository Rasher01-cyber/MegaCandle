/** Browser-only MT login helpers — passwords never go to the API. */

const KEY = "megacandle_mt_login_v1";

export type MtLocalLogin = {
  accountLogin: string;
  brokerServer: string;
  password: string;
  savePassword: boolean;
  platform: "MT5" | "MT4";
};

export function loadMtLocalLogin(): MtLocalLogin | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MtLocalLogin;
    if (!parsed.savePassword) {
      return { ...parsed, password: "" };
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveMtLocalLogin(data: MtLocalLogin) {
  try {
    const payload: MtLocalLogin = {
      accountLogin: data.accountLogin,
      brokerServer: data.brokerServer,
      platform: data.platform,
      savePassword: data.savePassword,
      password: data.savePassword ? data.password : "",
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function clearMtLocalPassword() {
  const existing = loadMtLocalLogin();
  if (!existing) return;
  saveMtLocalLogin({ ...existing, password: "", savePassword: false });
}
