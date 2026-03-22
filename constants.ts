
import { Symbol, AssetCategory, TradingMode } from './types';

export const INITIAL_BALANCE = 50000; // USD
export const CRON_INTERVAL_MS = 2000; // Run analysis every 2 seconds for instant execution
export const PRICE_TICK_INTERVAL_MS = 1000; // Update chart price every second

interface AssetInfo {
  NAME: string;
  INITIAL_PRICE: number;
  CONTRACT_SIZE: number;
  PIP_VALUE: number; 
  DEFAULT_STOP_LOSS: number;
  DEFAULT_TAKE_PROFIT: number;
  SPREAD: number;
  CATEGORY: AssetCategory;
  MODES?: TradingMode[];
}

export const ASSETS: Record<Symbol, AssetInfo> = {
  // --- COMMODITIES ---
  XAUUSD: {
    NAME: "Gold",
    INITIAL_PRICE: 2650.00,
    CONTRACT_SIZE: 100, // 1 Lot = 100 Ounces
    PIP_VALUE: 0.01, 
    DEFAULT_STOP_LOSS: 5.00,
    DEFAULT_TAKE_PROFIT: 15.00,
    SPREAD: 0.40,
    CATEGORY: 'COMMODITIES'
  },
  // Added missing XAGUSD and WTIUSD
  XAGUSD: {
    NAME: "Silver",
    INITIAL_PRICE: 31.50,
    CONTRACT_SIZE: 5000,
    PIP_VALUE: 0.01,
    DEFAULT_STOP_LOSS: 0.50,
    DEFAULT_TAKE_PROFIT: 1.50,
    SPREAD: 0.02,
    CATEGORY: 'COMMODITIES'
  },
  WTIUSD: {
    NAME: "WTI Crude Oil",
    INITIAL_PRICE: 72.50,
    CONTRACT_SIZE: 1000,
    PIP_VALUE: 0.01,
    DEFAULT_STOP_LOSS: 1.00,
    DEFAULT_TAKE_PROFIT: 3.00,
    SPREAD: 0.03,
    CATEGORY: 'COMMODITIES'
  },
  // --- CRYPTO (Matched to Binance) ---
  BTCUSD: {
    NAME: "Bitcoin",
    INITIAL_PRICE: 97500.00,
    CONTRACT_SIZE: 1, // 1 Lot = 1 BTC
    PIP_VALUE: 1, 
    DEFAULT_STOP_LOSS: 500.00,
    DEFAULT_TAKE_PROFIT: 1000.00,
    SPREAD: 10.00,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES, TradingMode.MARGIN]
  },
  ETHUSD: {
    NAME: "Ethereum",
    INITIAL_PRICE: 2850.00,
    CONTRACT_SIZE: 10, 
    PIP_VALUE: 1, 
    DEFAULT_STOP_LOSS: 25.00,
    DEFAULT_TAKE_PROFIT: 50.00,
    SPREAD: 2.00,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES, TradingMode.MARGIN]
  },
  SOLUSD: {
    NAME: "Solana",
    INITIAL_PRICE: 165.00,
    CONTRACT_SIZE: 100,
    PIP_VALUE: 1, 
    DEFAULT_STOP_LOSS: 2.00,
    DEFAULT_TAKE_PROFIT: 5.00,
    SPREAD: 0.15,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES, TradingMode.MARGIN]
  },
  DOGEUSD: {
    NAME: "Dogecoin",
    INITIAL_PRICE: 0.28,
    CONTRACT_SIZE: 10000,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 0.01,
    DEFAULT_TAKE_PROFIT: 0.02,
    SPREAD: 0.0001,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  XRPUSD: {
    NAME: "Ripple",
    INITIAL_PRICE: 2.45,
    CONTRACT_SIZE: 1000,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 0.05,
    DEFAULT_TAKE_PROFIT: 0.10,
    SPREAD: 0.001,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  ADAUSD: {
    NAME: "Cardano",
    INITIAL_PRICE: 0.75,
    CONTRACT_SIZE: 1000,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 0.02,
    DEFAULT_TAKE_PROFIT: 0.05,
    SPREAD: 0.001,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  AVAXUSD: {
    NAME: "Avalanche",
    INITIAL_PRICE: 32.50,
    CONTRACT_SIZE: 100,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 1.00,
    DEFAULT_TAKE_PROFIT: 2.00,
    SPREAD: 0.05,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  DOTUSD: {
    NAME: "Polkadot",
    INITIAL_PRICE: 6.20,
    CONTRACT_SIZE: 100,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 0.20,
    DEFAULT_TAKE_PROFIT: 0.50,
    SPREAD: 0.02,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  LINKUSD: {
    NAME: "Chainlink",
    INITIAL_PRICE: 14.50,
    CONTRACT_SIZE: 100,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 0.50,
    DEFAULT_TAKE_PROFIT: 1.00,
    SPREAD: 0.03,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  },
  LTCUSD: {
    NAME: "Litecoin",
    INITIAL_PRICE: 105.00,
    CONTRACT_SIZE: 10,
    PIP_VALUE: 1,
    DEFAULT_STOP_LOSS: 2.00,
    DEFAULT_TAKE_PROFIT: 4.00,
    SPREAD: 0.10,
    CATEGORY: 'CRYPTO',
    MODES: [TradingMode.SPOT, TradingMode.FUTURES]
  }
};

export const SIMULATION_DISCLAIMER = "This is a PAPER TRADING simulation. No real money is involved.";
