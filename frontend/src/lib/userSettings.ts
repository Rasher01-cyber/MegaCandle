export type UserPrefs = {
  profilePublic: boolean;
  showLeaderboard: boolean;
  showTrades: boolean;
  showPnlPerTrade: boolean;
  streamerMode: boolean;
  pushNotifications: boolean;
  tradeAlerts: boolean;
  weeklyReport: boolean;
  currency: string;
  timezone: string;
};

const KEY = "megacandle_user_prefs_v1";

const defaults: UserPrefs = {
  profilePublic: true,
  showLeaderboard: true,
  showTrades: true,
  showPnlPerTrade: true,
  streamerMode: false,
  pushNotifications: false,
  tradeAlerts: true,
  weeklyReport: false,
  currency: "USD",
  timezone: "UTC",
};

export function loadUserPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...defaults };
    const parsed = JSON.parse(raw) as Partial<UserPrefs>;
    return { ...defaults, ...parsed };
  } catch {
    return { ...defaults };
  }
}

export function saveUserPrefs(prefs: UserPrefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}
