"""
Local MT5 bridge — talks to the MetaTrader 5 terminal on this PC.
Requires: pip install MetaTrader5
MT5 must be running (logged in or we call login).
"""
from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone

try:
    import MetaTrader5 as mt5
except ImportError:
    print(json.dumps({"ok": False, "error": "Install MetaTrader5: pip install MetaTrader5"}))
    sys.exit(0)


def emit(obj: dict) -> None:
    print(json.dumps(obj, default=str))
    sys.stdout.flush()


def side_from_mt5(pos_type: int) -> str:
    return "LONG" if pos_type == 0 else "SHORT"  # POSITION_TYPE_BUY = 0


def fetch_closed_trades(days: int = 365) -> list[dict]:
    """Pair IN/OUT deals per position_id — matches MT5 History tab."""
    DEAL_ENTRY_IN = 0
    DEAL_ENTRY_OUT = 1
    to_date = datetime.now(timezone.utc) + timedelta(hours=1)
    from_date = to_date - timedelta(days=max(1, days))
    deals = mt5.history_deals_get(from_date, to_date)
    if deals is None:
        return []

    ins: dict[int, object] = {}
    closed: list[dict] = []
    for d in sorted(deals, key=lambda x: int(x.time)):
        pid = int(d.position_id)
        if int(d.entry) == DEAL_ENTRY_IN:
            ins[pid] = d
        elif int(d.entry) == DEAL_ENTRY_OUT:
            entry = ins.pop(pid, None)
            if entry is None:
                continue
            closed.append(
                {
                    "ticket": int(d.ticket),
                    "symbol": str(d.symbol),
                    "side": side_from_mt5(int(entry.type)),
                    "volume": float(d.volume),
                    "openPrice": float(entry.price),
                    "closePrice": float(d.price),
                    "openTime": datetime.fromtimestamp(int(entry.time), tz=timezone.utc).isoformat(),
                    "closeTime": datetime.fromtimestamp(int(d.time), tz=timezone.utc).isoformat(),
                    "commission": float(d.commission or 0) + float(entry.commission or 0),
                    "profit": float(d.profit or 0),
                }
            )
    return closed


def order_ok(retcode: int) -> bool:
  return retcode in (
      mt5.TRADE_RETCODE_DONE,
      mt5.TRADE_RETCODE_PLACED,
      mt5.TRADE_RETCODE_DONE_PARTIAL,
  )


def resolve_symbol(symbol: str) -> tuple[str | None, str | None]:
    sym = symbol.upper().replace(" ", "")
    candidates = [sym]
    if sym.endswith("M") and len(sym) > 4:
        candidates.append(sym[:-1])
    else:
        candidates.append(sym + "M")

    seen: set[str] = set()
    for c in candidates:
        if c in seen:
            continue
        seen.add(c)
        info = mt5.symbol_info(c)
        if info is not None and info.visible:
            mt5.symbol_select(c, True)
            return c, None

    if sym in ("BTCUSD", "BITCOIN", "BTC/USD"):
        for name in mt5.symbols_get() or []:
            n = name.name.upper()
            if "BTCUSD" in n or n in ("BITCOIN", "#BTCUSD"):
                mt5.symbol_select(name.name, True)
                return name.name, None
        return None, (
            "BTCUSD is not available on MetaQuotes-Demo (only stock tickers like BTC exist). "
            "Use EURUSD, GBPUSD, XAUUSD, or US30 — or enable Crypto in MT5: View → Symbols → BTCUSD."
        )

    for name in mt5.symbols_get() or []:
        n = name.name.upper()
        if n == sym or n == sym.rstrip("M") or n == sym + "M":
            mt5.symbol_select(name.name, True)
            return name.name, None
    return None, f"Symbol {symbol} not in MT5 — add it in Market Watch (right-click → Show all)."


# symbol_info.filling_mode bit flags (same as MQL5 SYMBOL_FILLING_*)
_SYMBOL_FILLING_FOK = 1
_SYMBOL_FILLING_IOC = 2


def allowed_fillings(sym: str) -> list[int]:
    """Only return filling modes the symbol actually supports (avoids retcode 10030)."""
    info = mt5.symbol_info(sym)
    if info is None:
        return [mt5.ORDER_FILLING_RETURN]
    mode = int(info.filling_mode or 0)
    allowed: list[int] = []
    if mode & _SYMBOL_FILLING_FOK:
        allowed.append(mt5.ORDER_FILLING_FOK)
    if mode & _SYMBOL_FILLING_IOC:
        allowed.append(mt5.ORDER_FILLING_IOC)
    if not allowed:
        allowed.append(mt5.ORDER_FILLING_RETURN)
    return allowed


def normalize_volume(sym: str, volume: float) -> float:
    info = mt5.symbol_info(sym)
    if info is None:
        return round(volume, 2)
    step = info.volume_step or 0.01
    vmin = info.volume_min or step
    vmax = info.volume_max or volume
    v = max(vmin, min(vmax, volume))
    steps = round(v / step)
    return round(steps * step, 8)


def send_market_order(sym: str, side: str, volume: float) -> tuple[bool, str, int]:
    from MetaTrader5 import ORDER_TYPE_BUY, ORDER_TYPE_SELL, TRADE_ACTION_DEAL

    term = mt5.terminal_info()
    if term is not None and not term.trade_allowed:
        return False, "Algo trading is OFF in MT5 — click the Algo Trading button (must be green).", 0

    tick = mt5.symbol_info_tick(sym)
    if tick is None:
        return False, f"No price for {sym} — add symbol to Market Watch or market may be closed.", 0

    order_type = ORDER_TYPE_BUY if side == "LONG" else ORDER_TYPE_SELL
    price = tick.ask if side == "LONG" else tick.bid
    vol = normalize_volume(sym, volume)
    fillings = allowed_fillings(sym)
    result = None
    last_comment = ""

    for filling in fillings:
        request = {
            "action": TRADE_ACTION_DEAL,
            "symbol": sym,
            "volume": vol,
            "type": order_type,
            "price": price,
            "deviation": 50,
            "magic": 88001,
            "comment": "MegaCandle",
            "type_time": mt5.ORDER_TIME_GTC,
            "type_filling": filling,
        }
        result = mt5.order_send(request)
        if result is not None and order_ok(result.retcode):
            ticket = int(result.order or result.deal or 0)
            return True, sym, ticket
        if result is not None:
            last_comment = f"retcode={result.retcode} {result.comment}"
            if result.retcode == mt5.TRADE_RETCODE_REQUOTE:
                tick = mt5.symbol_info_tick(sym)
                if tick:
                    request["price"] = tick.ask if side == "LONG" else tick.bid
                    result = mt5.order_send(request)
                    if result is not None and order_ok(result.retcode):
                        return True, sym, int(result.order or result.deal or 0)
            if result.retcode == 10030:
                continue

    request = {
        "action": TRADE_ACTION_DEAL,
        "symbol": sym,
        "volume": vol,
        "type": order_type,
        "price": price,
        "deviation": 50,
        "magic": 88001,
        "comment": "MegaCandle",
        "type_time": mt5.ORDER_TIME_GTC,
    }
    result = mt5.order_send(request)
    if result is not None and order_ok(result.retcode):
        return True, sym, int(result.order or result.deal or 0)

    if "10018" in last_comment or "market closed" in last_comment.lower():
        return False, "Market is closed for this symbol. Try during trading hours or use EURUSD / XAUUSD.", 0
    err = mt5.last_error()
    return False, f"Order rejected: {last_comment} ({err})".strip(), 0


def main() -> None:
    try:
        req = json.load(sys.stdin)
    except json.JSONDecodeError:
        emit({"ok": False, "error": "Invalid JSON request"})
        return

    action = req.get("action", "sync")
    login = int(req.get("login", 0))
    password = str(req.get("password", ""))
    server = str(req.get("server", ""))

    if not mt5.initialize():
        err = mt5.last_error()
        emit({"ok": False, "error": f"MT5 initialize failed: {err}"})
        return

    if login and password and server and login > 0:
        info = mt5.account_info()
        already = (
            info is not None
            and str(info.login) == str(login)
            and str(info.server).lower() == server.lower()
        )
        if not already and not mt5.login(login, password=password, server=server):
            info2 = mt5.account_info()
            if info2 is None:
                err = mt5.last_error()
                mt5.shutdown()
                emit(
                    {
                        "ok": False,
                        "error": f"MT5 login failed: {err}. Open MT5, log in to {login} on {server}, or check password.",
                    }
                )
                return

    if action == "quotes":
        raw_symbols = req.get("symbols") or []
        if isinstance(raw_symbols, str):
            raw_symbols = [s.strip() for s in raw_symbols.split(",") if s.strip()]
        quotes: list[dict] = []
        for sym in raw_symbols:
            name = str(sym).upper()
            broker_sym, _ = resolve_symbol(name)
            if not broker_sym:
                continue
            tick = mt5.symbol_info_tick(broker_sym)
            if tick is None:
                continue
            spread = float(tick.ask - tick.bid) if tick.ask and tick.bid else 0.0
            quotes.append(
                {
                    "symbol": name,
                    "bid": float(tick.bid),
                    "ask": float(tick.ask),
                    "spread": spread,
                    "time": int(tick.time),
                }
            )
        mt5.shutdown()
        emit({"ok": True, "quotes": quotes})
        return

    if action == "symbols":
        preferred = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD", "US30", "US30M", "BTCUSD", "BTCUSDm"]
        found: list[str] = []
        for name in preferred:
            info = mt5.symbol_info(name)
            if info is not None:
                mt5.symbol_select(name, True)
                if name not in found:
                    found.append(name)
        btc_on_server = any(
            "BTCUSD" in (s.name.upper()) for s in (mt5.symbols_get() or [])
        )
        mt5.shutdown()
        emit({"ok": True, "symbols": found, "btcusdAvailable": btc_on_server})
        return

    if action == "sync":
        info = mt5.account_info()
        if info is None:
            mt5.shutdown()
            emit({"ok": False, "error": f"account_info failed: {mt5.last_error()}"})
            return

        positions = mt5.positions_get()
        pos_list = []
        if positions:
            for p in positions:
                pos_list.append(
                    {
                        "ticket": int(p.ticket),
                        "symbol": str(p.symbol),
                        "side": side_from_mt5(p.type),
                        "volume": float(p.volume),
                        "openPrice": float(p.price_open),
                        "currentPrice": float(p.price_current),
                        "profit": float(p.profit),
                        "openTime": datetime.fromtimestamp(p.time, tz=timezone.utc).isoformat(),
                    }
                )

        closed_deals = fetch_closed_trades(365)
        emit(
            {
                "ok": True,
                "accountLogin": str(info.login),
                "brokerServer": str(info.server),
                "brokerName": str(info.company),
                "balance": float(info.balance),
                "equity": float(info.equity),
                "profit": float(info.profit),
                "positions": pos_list,
                "closedDeals": closed_deals,
            }
        )
        mt5.shutdown()
        return

    if action == "open":
        symbol = str(req.get("symbol", ""))
        side = str(req.get("side", "LONG"))
        volume = float(req.get("volume", 0.01))
        if not symbol or volume <= 0:
            mt5.shutdown()
            emit({"ok": False, "error": "symbol and volume required"})
            return

        broker_sym, sym_err = resolve_symbol(symbol)
        if not broker_sym:
            mt5.shutdown()
            emit({"ok": False, "error": sym_err or f"Symbol {symbol} not found in MT5."})
            return

        ok, msg, ticket = send_market_order(broker_sym, side, volume)
        mt5.shutdown()
        if ok:
            emit({"ok": True, "ticket": ticket, "symbol": msg})
        else:
            emit({"ok": False, "error": msg})
        return

    if action == "close":
        ticket = int(req.get("ticket", 0))
        if not ticket:
            mt5.shutdown()
            emit({"ok": False, "error": "ticket required"})
            return
        pos_info = mt5.positions_get(ticket=ticket)
        if not pos_info:
            mt5.shutdown()
            emit({"ok": False, "error": f"position {ticket} not found"})
            return
        p = pos_info[0]
        from MetaTrader5 import ORDER_TYPE_BUY, ORDER_TYPE_SELL, TRADE_ACTION_DEAL

        tick = mt5.symbol_info_tick(p.symbol)
        if tick is None:
            mt5.shutdown()
            emit({"ok": False, "error": f"No price for {p.symbol}"})
            return
        close_type = ORDER_TYPE_SELL if p.type == 0 else ORDER_TYPE_BUY
        price = tick.bid if p.type == 0 else tick.ask
        fillings = allowed_fillings(p.symbol)
        result = None
        for filling in fillings:
            request = {
                "action": TRADE_ACTION_DEAL,
                "symbol": p.symbol,
                "volume": p.volume,
                "type": close_type,
                "position": ticket,
                "price": price,
                "deviation": 50,
                "magic": 88001,
                "comment": "MegaCandle close",
                "type_time": mt5.ORDER_TIME_GTC,
                "type_filling": filling,
            }
            result = mt5.order_send(request)
            if result is not None and order_ok(result.retcode):
                mt5.shutdown()
                emit({"ok": True, "ticket": ticket})
                return
        err = result.comment if result else str(mt5.last_error())
        mt5.shutdown()
        emit({"ok": False, "error": f"Close failed: {err}"})
        return

    mt5.shutdown()
    emit({"ok": False, "error": f"unknown action {action}"})


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        emit({"ok": False, "error": f"MT5 bridge error: {exc}"})
