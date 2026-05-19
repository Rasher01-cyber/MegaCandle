/** MegaCandle platform fee on profitable website-executed trades (2% of gross profit). */
export const WEBSITE_PROFIT_COMMISSION_RATE = 0.02;

export function applyWebsiteCommission(grossPnl: number, isWebsiteTrade: boolean) {
  if (!isWebsiteTrade || grossPnl <= 0) {
    return { grossPnl, platformFee: 0, netPnl: grossPnl };
  }
  const platformFee = Math.round(grossPnl * WEBSITE_PROFIT_COMMISSION_RATE * 100) / 100;
  return { grossPnl, platformFee, netPnl: grossPnl - platformFee };
}
