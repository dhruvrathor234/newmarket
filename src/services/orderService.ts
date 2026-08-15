import { BotState, Symbol, TradeType, AccountType } from '../types';

/** Maps the app's internal symbols to Binance trading pairs. */
export const mapSymbolToBinance = (sym: Symbol): string => {
  const mapping: Record<string, string> = {
    'BTCUSD': 'BTCUSDT',
    'ETHUSD': 'ETHUSDT',
    'SOLUSD': 'SOLUSDT',
    'DOGEUSD': 'DOGEUSDT',
    'XRPUSD': 'XRPUSDT',
    'ADAUSD': 'ADAUSDT',
    'AVAXUSD': 'AVAXUSDT',
    'DOTUSD': 'DOTUSDT',
    'LINKUSD': 'LINKUSDT',
    'LTCUSD': 'LTCUSDT',
    'XAUUSD': 'PAXGUSDT',
    'XAGUSD': 'XAGUSDT',
    'WTIUSD': 'WTIUSDT',
  };
  return mapping[sym] || sym;
};

/** Risk-based lot sizing: risk% of balance divided by (SL distance x contract size). */
export const calculateRiskBasedLotSize = (
  balance: number,
  riskPercentage: number,
  stopLossDistance: number,
  contractSize: number,
): number => {
  const riskAmount = (balance * riskPercentage) / 100;
  const calculated = riskAmount / (stopLossDistance * contractSize);
  return Math.max(0.01, parseFloat(calculated.toFixed(2)));
};

/** Realized PnL for a closed position. */
export const calculatePnL = (
  type: TradeType,
  entryPrice: number,
  exitPrice: number,
  contractSize: number,
  lotSize: number,
): number => {
  const diff = type.includes('BUY') ? exitPrice - entryPrice : entryPrice - exitPrice;
  return diff * contractSize * lotSize;
};

/**
 * Applies a realized PnL / deposit / withdrawal to the bot balances.
 * Only the account type that "owns" the change is affected, and the active
 * account's balance/equity is refreshed to match.
 */
export const applyBalanceChange = (botState: BotState, realizedPnL: number, isReal: boolean): BotState => {
  const nextPaperBalance = isReal ? botState.paperBalance : botState.paperBalance + realizedPnL;
  const nextRealBalance = isReal ? botState.realBalance + realizedPnL : botState.realBalance;
  const isRealAccount = botState.accountType === AccountType.REAL;

  return {
    ...botState,
    paperBalance: nextPaperBalance,
    realBalance: nextRealBalance,
    balance: isRealAccount ? nextRealBalance : nextPaperBalance,
    paperEquity: nextPaperBalance,
    realEquity: nextRealBalance,
    equity: isRealAccount ? nextRealBalance : nextPaperBalance,
  };
};
