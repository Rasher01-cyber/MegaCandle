# MetaTrader 4 bridge

Use the same MegaCandle bridge flow as MT5:

1. Log in to your **broker** inside MetaTrader 4 (File → Login to Trade Account).
2. Allow WebRequest for your API URL in Tools → Options → Expert Advisors.
3. Copy `TradeFXBridge.mq5` from `mt5/` and adapt for MT4, or use MT5 if your broker supports it.

The website API is shared: pairing and sync use `/api/integrations/mt5/register` and `/api/integrations/mt5/sync`.

Select **MT4** in Settings → MT5/MT4 when saving your broker server and login.
