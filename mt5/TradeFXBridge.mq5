//+------------------------------------------------------------------+
//| TradeFXBridge.mq5 — syncs MT5 with MegaCandle Live Market        |
//+------------------------------------------------------------------+
#property copyright "MegaCandle"
#property version   "1.00"
#property strict

input string ApiBaseUrl   = "http://localhost:4000";  // MegaCandle API URL (no trailing slash)
input string PairingCode  = "";                       // 6-digit code from website (first connect only)
input string ApiToken     = "";                       // Saved after register — required for sync
input int    PollSeconds  = 2;

string g_headers[];

//+------------------------------------------------------------------+
int OnInit()
{
   string token = ApiToken;
   if(StringLen(token) < 16)
   {
      if(StringLen(PairingCode) < 4)
      {
         Print("MegaCandle: set PairingCode from website Settings, or paste ApiToken after first connect.");
         return INIT_FAILED;
      }
      token = RegisterWithPairing(PairingCode);
      if(StringLen(token) < 16)
         return INIT_FAILED;
      Print("MegaCandle: registration OK. Save this ApiToken in EA inputs: ", token);
   }
   ArrayResize(g_headers, 1);
   g_headers[0] = "Authorization: Bearer " + token;
   EventSetTimer(PollSeconds);
   Print("MegaCandle Bridge started. Polling every ", PollSeconds, "s");
   return INIT_SUCCEEDED;
}

string RegisterWithPairing(string code)
{
   string body = StringFormat("{\"pairingCode\":\"%s\"}", code);
   char post[];
   StringToCharArray(body, post, 0, StringLen(body));
   char result[];
   string resultHeaders;
   string url = ApiBaseUrl + "/api/integrations/mt5/register";
   string headers[];
   ArrayResize(headers, 1);
   headers[0] = "Content-Type: application/json";
   int res = WebRequest("POST", url, "", 10000, headers, post, ArraySize(post) - 1, result, resultHeaders);
   if(res == -1)
   {
      Print("MegaCandle register failed. Allow WebRequest for ", ApiBaseUrl);
      return "";
   }
   string response = CharArrayToString(result);
   int start = StringFind(response, "\"apiToken\":\"");
   if(start < 0)
   {
      Print("MegaCandle register error: ", response);
      return "";
   }
   start += 12;
   int end = StringFind(response, "\"", start);
   return StringSubstr(response, start, end - start);
}

void OnDeinit(const int reason)
{
   EventKillTimer();
}

void OnTimer()
{
   ProcessCommands();
   SyncState();
}

//+------------------------------------------------------------------+
string JsonEscape(string s)
{
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   return s;
}

string SideToJson(ENUM_POSITION_TYPE type)
{
   return (type == POSITION_TYPE_BUY) ? "LONG" : "SHORT";
}

ENUM_ORDER_TYPE SideToOrderType(string side)
{
   return (side == "LONG") ? ORDER_TYPE_BUY : ORDER_TYPE_SELL;
}

//+------------------------------------------------------------------+
void ProcessCommands()
{
   char result[];
   string resultHeaders;
   string url = ApiBaseUrl + "/api/integrations/mt5/commands";
   int res = WebRequest("GET", url, "", 5000, g_headers, NULL, 0, result, resultHeaders);
   if(res == -1)
   {
      Print("MegaCandle GET commands failed. Allow URL in Tools → Options → Expert Advisors.");
      return;
   }

   string body = CharArrayToString(result);
   if(StringFind(body, "\"commands\"") < 0) return;

   int pos = 0;
   while(true)
   {
      int idStart = StringFind(body, "\"id\":\"", pos);
      if(idStart < 0) break;
      idStart += 6;
      int idEnd = StringFind(body, "\"", idStart);
      string cmdId = StringSubstr(body, idStart, idEnd - idStart);

      int typeStart = StringFind(body, "\"type\":\"", idEnd);
      typeStart += 8;
      int typeEnd = StringFind(body, "\"", typeStart);
      string cmdType = StringSubstr(body, typeStart, typeEnd - typeStart);

      if(cmdType == "OPEN")
      {
         string symbol = ExtractJsonString(body, "symbol", typeEnd);
         string side = ExtractJsonString(body, "side", typeEnd);
         double volume = ExtractJsonDouble(body, "volume", typeEnd);
         double sl = ExtractJsonDouble(body, "sl", typeEnd);
         double tp = ExtractJsonDouble(body, "tp", typeEnd);
         ExecuteOpen(cmdId, symbol, side, volume, sl, tp);
      }
      else if(cmdType == "CLOSE")
      {
         int ticket = (int)ExtractJsonDouble(body, "ticket", typeEnd);
         ExecuteClose(cmdId, ticket);
      }

      pos = typeEnd + 1;
   }
}

string ExtractJsonString(string body, string key, int fromPos)
{
   string needle = "\"" + key + "\":\"";
   int start = StringFind(body, needle, fromPos);
   if(start < 0) return "";
   start += StringLen(needle);
   int end = StringFind(body, "\"", start);
   return StringSubstr(body, start, end - start);
}

double ExtractJsonDouble(string body, string key, int fromPos)
{
   string needle = "\"" + key + "\":";
   int start = StringFind(body, needle, fromPos);
   if(start < 0) return 0;
   start += StringLen(needle);
   int end = StringFind(body, ",", start);
   if(end < 0) end = StringFind(body, "}", start);
   string num = StringSubstr(body, start, end - start);
   StringTrimLeft(num);
   StringTrimRight(num);
   return StringToDouble(num);
}

//+------------------------------------------------------------------+
string ResolveBrokerSymbol(string symbol)
{
   if(SymbolSelect(symbol, true))
      return symbol;
   int len = StringLen(symbol);
   if(len > 1 && StringGetCharacter(symbol, len - 1) == 'm')
   {
      string base = StringSubstr(symbol, 0, len - 1);
      if(SymbolSelect(base, true))
         return base;
   }
   string withM = symbol + "m";
   if(SymbolSelect(withM, true))
      return withM;
   return symbol;
}

ENUM_ORDER_TYPE_FILLING PickFilling(string sym)
{
   int mode = (int)SymbolInfoInteger(sym, SYMBOL_FILLING_MODE);
   if((mode & SYMBOL_FILLING_IOC) == SYMBOL_FILLING_IOC) return ORDER_FILLING_IOC;
   if((mode & SYMBOL_FILLING_FOK) == SYMBOL_FILLING_FOK) return ORDER_FILLING_FOK;
   return ORDER_FILLING_RETURN;
}

void ExecuteOpen(string cmdId, string symbol, string side, double volume, double sl, double tp)
{
   string status = "EXECUTED";
   string errMsg = "";
   ulong ticket = 0;

   string brokerSymbol = ResolveBrokerSymbol(symbol);
   if(!SymbolSelect(brokerSymbol, true))
   {
      status = "FAILED";
      errMsg = "Symbol not found in Market Watch: " + brokerSymbol;
      ReportCommandResult(cmdId, status, errMsg, (int)ticket);
      return;
   }

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action       = TRADE_ACTION_DEAL;
   req.symbol       = brokerSymbol;
   req.volume       = volume;
   req.type         = SideToOrderType(side);
   req.type_filling = PickFilling(brokerSymbol);
   req.deviation    = 30;
   req.magic        = 88001;
   req.comment      = "MegaCandle";
   if(sl > 0) req.sl = sl;
   if(tp > 0) req.tp = tp;

   if(!OrderSend(req, res))
   {
      status = "FAILED";
      errMsg = "OrderSend " + IntegerToString(GetLastError()) + " retcode " + IntegerToString(res.retcode);
   }
   else if(res.deal > 0)
   {
      if(HistoryDealSelect(res.deal))
      {
         ulong posId = (ulong)HistoryDealGetInteger(res.deal, DEAL_POSITION_ID);
         if(posId > 0 && PositionSelectByTicket(posId))
            ticket = posId;
      }
      if(ticket == 0)
      {
         for(int i = PositionsTotal() - 1; i >= 0; i--)
         {
            ulong t = PositionGetTicket(i);
            if(t == 0 || !PositionSelectByTicket(t)) continue;
            if(PositionGetString(POSITION_SYMBOL) == brokerSymbol && PositionGetInteger(POSITION_MAGIC) == 88001)
            {
               ticket = t;
               break;
            }
         }
      }
   }
   else
   {
      status = "FAILED";
      errMsg = "No deal returned retcode " + IntegerToString(res.retcode);
   }

   ReportCommandResult(cmdId, status, errMsg, (int)ticket);
}

void ExecuteClose(string cmdId, int ticket)
{
   string status = "EXECUTED";
   string errMsg = "";

   if(!PositionSelectByTicket((ulong)ticket))
   {
      status = "FAILED";
      errMsg = "Position not found";
      ReportCommandResult(cmdId, status, errMsg, ticket);
      return;
   }

   string symbol = PositionGetString(POSITION_SYMBOL);
   double volume = PositionGetDouble(POSITION_VOLUME);
   ENUM_POSITION_TYPE ptype = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);

   MqlTradeRequest req = {};
   MqlTradeResult  res = {};
   req.action       = TRADE_ACTION_DEAL;
   req.symbol       = symbol;
   req.volume       = volume;
   req.position     = ticket;
   req.type         = (ptype == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   req.type_filling = PickFilling(symbol);
   req.deviation    = 30;
   req.magic        = 88001;
   req.comment      = "MegaCandle close";

   if(!OrderSend(req, res))
   {
      status = "FAILED";
      errMsg = "Close failed: " + IntegerToString(GetLastError());
   }

   ReportCommandResult(cmdId, status, errMsg, ticket);
}

void ReportCommandResult(string cmdId, string status, string errMsg, int ticket)
{
   // Results are sent in the next SyncState batch via commandResults
   string key = cmdId;
   GlobalVariableSet("TFX_CMD_" + key + "_status", status == "EXECUTED" ? 1 : 0);
   GlobalVariableSet("TFX_CMD_" + key + "_ticket", ticket);
   if(StringLen(errMsg) > 0)
      GlobalVariableSet("TFX_CMD_" + key + "_err", 1);
}

//+------------------------------------------------------------------+
void SyncState()
{
   string json = BuildSyncPayload();
   int jsonLen = StringLen(json);
   char post[];
   ArrayResize(post, jsonLen);
   StringToCharArray(json, post, 0, jsonLen);

   char result[];
   string resultHeaders;
   string url = ApiBaseUrl + "/api/integrations/mt5/sync";
   string headers[];
   ArrayResize(headers, 2);
   headers[0] = g_headers[0];
   headers[1] = "Content-Type: application/json";

   int res = WebRequest("POST", url, "", 10000, headers, post, jsonLen, result, resultHeaders);
   if(res == -1)
      Print("MegaCandle sync failed. Check ApiBaseUrl and WebRequest whitelist.");
}

string BuildSyncPayload()
{
   string broker = AccountInfoString(ACCOUNT_COMPANY);
   string server = AccountInfoString(ACCOUNT_SERVER);
   string login = IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN));
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity = AccountInfoDouble(ACCOUNT_EQUITY);

   string positions = "[";
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0 || !PositionSelectByTicket(ticket)) continue;

      string sym = PositionGetString(POSITION_SYMBOL);
      ENUM_POSITION_TYPE ptype = (ENUM_POSITION_TYPE)PositionGetInteger(POSITION_TYPE);
      string side = SideToJson(ptype);
      double vol = PositionGetDouble(POSITION_VOLUME);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double current = PositionGetDouble(POSITION_PRICE_CURRENT);
      double profit = PositionGetDouble(POSITION_PROFIT);
      datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);

      if(i > 0) positions += ",";
      positions += StringFormat(
         "{\"ticket\":%I64u,\"symbol\":\"%s\",\"side\":\"%s\",\"volume\":%.2f,"
         "\"openPrice\":%.5f,\"currentPrice\":%.5f,\"profit\":%.2f,"
         "\"openTime\":\"%s\"}",
         ticket, JsonEscape(sym), side, vol, openPrice, current, profit,
         TimeToString(openTime, TIME_DATE|TIME_SECONDS)
      );
   }
   positions += "]";

   string cmdResults = BuildCommandResultsJson();

   string closedDeals = BuildClosedDealsJson();

   return StringFormat(
      "{\"brokerName\":\"%s\",\"brokerServer\":\"%s\",\"accountLogin\":\"%s\",\"balance\":%.2f,\"equity\":%.2f,"
      "\"positions\":%s,\"commandResults\":%s,\"closedDeals\":%s}",
      JsonEscape(broker), JsonEscape(server), login, balance, equity, positions, cmdResults, closedDeals
   );
}

string BuildClosedDealsJson()
{
   datetime from = TimeCurrent() - 3600;
   HistorySelect(from, TimeCurrent());
   string out = "[";
   int count = 0;
   int total = HistoryDealsTotal();
   for(int i = total - 1; i >= 0 && count < 10; i--)
   {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;
      if(HistoryDealGetInteger(dealTicket, DEAL_ENTRY) != DEAL_ENTRY_OUT) continue;
      if(HistoryDealGetInteger(dealTicket, DEAL_MAGIC) != 88001) continue;

      string sym = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      long dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      string side = (dealType == DEAL_TYPE_BUY) ? "LONG" : "SHORT";
      double vol = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double closePrice = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double profit = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      datetime closeTime = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);

      ulong posId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      double openPrice = closePrice;
      datetime openTime = closeTime;
      if(HistorySelectByPosition(posId))
      {
         int deals = HistoryDealsTotal();
         for(int j = 0; j < deals; j++)
         {
            ulong inTicket = HistoryDealGetTicket(j);
            if(HistoryDealGetInteger(inTicket, DEAL_ENTRY) == DEAL_ENTRY_IN)
            {
               openPrice = HistoryDealGetDouble(inTicket, DEAL_PRICE);
               openTime = (datetime)HistoryDealGetInteger(inTicket, DEAL_TIME);
               long inType = HistoryDealGetInteger(inTicket, DEAL_TYPE);
               side = (inType == DEAL_TYPE_BUY) ? "LONG" : "SHORT";
               break;
            }
         }
      }

      if(count > 0) out += ",";
      out += StringFormat(
         "{\"ticket\":%I64u,\"symbol\":\"%s\",\"side\":\"%s\",\"volume\":%.2f,"
         "\"openPrice\":%.5f,\"closePrice\":%.5f,\"openTime\":\"%s\",\"closeTime\":\"%s\","
         "\"profit\":%.2f,\"commission\":%.2f}",
         dealTicket, JsonEscape(sym), side, vol, openPrice, closePrice,
         TimeToString(openTime, TIME_DATE|TIME_SECONDS),
         TimeToString(closeTime, TIME_DATE|TIME_SECONDS),
         profit, commission
      );
      count++;
   }
   out += "]";
   return out;
}

string BuildCommandResultsJson()
{
   string out = "[";
   int count = 0;
   string prefix = "TFX_CMD_";
   int vars = GlobalVariablesTotal();
   for(int i = 0; i < vars; i++)
   {
      string name = GlobalVariableName(i);
      if(StringFind(name, prefix) != 0) continue;
      if(StringFind(name, "_status") < 0) continue;

      string cmdId = StringSubstr(name, StringLen(prefix));
      int us = StringFind(cmdId, "_status");
      if(us > 0) cmdId = StringSubstr(cmdId, 0, us);

      double st = GlobalVariableGet(name);
      string status = (st >= 1) ? "EXECUTED" : "FAILED";
      string errMsg = "";
      if(GlobalVariableCheck(prefix + cmdId + "_err"))
         errMsg = ",\"errorMsg\":\"Execution error\"";

      if(count > 0) out += ",";
      out += StringFormat("{\"commandId\":\"%s\",\"status\":\"%s\"%s}", cmdId, status, errMsg);
      count++;

      GlobalVariableDel(name);
      GlobalVariableDel(prefix + cmdId + "_ticket");
      GlobalVariableDel(prefix + cmdId + "_err");
   }
   out += "]";
   return out;
}

//+------------------------------------------------------------------+
