
export type Symbol = 
  | 'XAUUSD' | 'XAGUSD' | 'WTIUSD'
  | 'BTCUSD' | 'ETHUSD' | 'SOLUSD' | 'DOGEUSD' | 'XRPUSD' | 'ADAUSD' | 'AVAXUSD' | 'DOTUSD' | 'LINKUSD' | 'LTCUSD';

export type AssetCategory = 'CRYPTO' | 'FOREX' | 'COMMODITIES';

export enum TradeType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
  LIMIT_BUY = 'LIMIT_BUY',
  LIMIT_SELL = 'LIMIT_SELL'
}

export type View = 'DASHBOARD' | 'TERMINAL' | 'BUILDER' | 'INTELLIGENCE' | 'PORTFOLIO' | 'ASSISTANT' | 'PROFILE';
export type BotStrategy = 'SENTIMENT' | 'TECHNICAL_V2' | 'NEBULA_V5' | 'NEBULA_V6' | 'CUSTOM_AI' | 'HEDGING_BOT' | 'HFT_BOT';
export type BacktestStrategy = BotStrategy;
export enum AccountType {
  PAPER = 'PAPER',
  REAL = 'REAL'
}

export enum TradingMode {
  SPOT = 'SPOT',
  FUTURES = 'FUTURES',
  MARGIN = 'MARGIN'
}

export interface ChartMarker {
  time: number;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  text: string;
}

export interface MarketDetails {
  price: number;
  bid: number;
  ask: number;
  high: number;
  low: number;
  volume: number;
  change24h: number;
  change24hPercent: number;
  category: AssetCategory;
}

export interface Alert {
  id: string;
  symbol: Symbol;
  price: number;
  type: 'ABOVE' | 'BELOW';
  createdAt: number;
}

export interface UserStats {
  userId: string;
  totalProfit: number;
  totalFeesOwed: number;
  totalFeesPaid: number;
  amountOwed: number;
  isLocked: boolean;
  lastUpdated: number;
}

export interface Trade {
  id: string;
  symbol: Symbol;
  type: TradeType;
  entryPrice: number;
  limitPrice?: number;
  closePrice?: number;
  lotSize: number;
  stopLoss: number;
  takeProfit?: number;
  riskPercentage: number;
  pnl?: number;
  openTime: number;
  closeTime?: number;
  status: 'OPEN' | 'CLOSED' | 'PENDING';
  accountType: AccountType;
  binanceOrderId?: string;
}

export interface BotState {
  isRunning: boolean;
  strategy: BotStrategy; 
  balance: number;
  equity: number;
  paperBalance: number;
  paperEquity: number;
  realBalance: number;
  realEquity: number;
  lastRunTime: number | null;
  statusMessage: string;
  customLogic?: string;
  accountType: AccountType;
  tradingMode: TradingMode;
  binanceApiKey?: string;
  binanceApiSecret?: string;
  isBinanceConnected?: boolean;
}

export interface RiskSettings {
  riskPercentage: number;
  stopLossDistance: number;
  takeProfitDistance: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: string;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface NewsSource {
  title: string;
  url: string;
}

export interface TechnicalIndicators {
  rsi: number;
  pivotState: number;
  maCrossover: 'BULLISH' | 'BEARISH';
  trend: 'UP' | 'DOWN';
}

export interface MarketAnalysis {
  symbol: Symbol;
  timestamp: number;
  decision: TradeType;
  sentimentScore: number;
  sentimentCategory: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reasoning: string;
  sources: NewsSource[];
  strategy: BotStrategy;
  suggestedSL?: number;
  technical?: TechnicalIndicators;
  customParams?: {
    lotSize?: number;
    stopLoss?: number;
    takeProfit?: number;
  };
}

export interface EconomicEvent {
  time: string;
  currency: string;
  event: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  forecast: string;
  previous: string;
}

export interface BacktestScenario {
  id: string;
  date: string;
  headline: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  priceChange: number;
  simulatedPnL: number;
}

export interface NebulaV5Settings {
  basisType: 'ALMA' | 'TEMA' | 'HullMA';
  basisLen: number;
  pivotPeriod: number;
  offsetSigma: number;
  offsetALMA: number;
  timeframe: string;
}

export interface BacktestTrade {
  id: string;
  type: TradeType;
  entryPrice: number;
  exitPrice: number;
  entryTime: number;
  exitTime: number;
  pnl: number;
  pnlPercentage: number;
  status: 'WIN' | 'LOSS';
}

export interface BacktestReport {
  totalTrades: number;
  winRate: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;
  avgTrade: number;
  trades: BacktestTrade[];
}

export interface HedgingBotSettings {
  initialLot: number;
  lotMultiplier: number;
  distancePips: number;
  takeProfitPips: number;
  stopLossPips: number;
  waitAfterCloseSec: number;
  netProfitTriggerAfterTrades: number;
  profitTargetUSD: number;
}

export interface HFTBotSettings {
  magicNumber: number;
  slippage: number;
  startHour: number;
  endHour: number;
  lotType: 'FIXED' | 'BALANCE_PCT' | 'EQUITY_PCT' | 'FREE_MARGIN_PCT';
  fixedLot: number;
  riskPercent: number;
  delta: number;
  maxDistance: number;
  stopLoss: number;
  maxTrailing: number;
  maxSpread: number;
}
