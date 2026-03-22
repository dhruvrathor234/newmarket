
import { BotState, Trade, RiskSettings, Symbol, MarketDetails, ChatMessage } from '../types';
import { INITIAL_BALANCE, ASSETS } from '../constants';

const KEYS = {
  USER: 'nebula_user',
  BOT_STATE: 'nebula_bot_state',
  TRADES: 'nebula_trades',
  RISK_SETTINGS: 'nebula_risk_settings',
  ENABLED_SYMBOLS: 'nebula_enabled_symbols',
  ACTIVE_SYMBOL: 'nebula_active_symbol',
  LOGS: 'nebula_logs',
  TIMEFRAME: 'nebula_timeframe',
  LAST_PRICE_CACHE: 'nebula_price_cache',
  CHAT_HISTORY: 'nebula_chat_history',
  CUSTOM_PROMPT: 'nebula_custom_prompt'
};

export const storageService = {
  // --- USER ---
  loadUser: () => {
    try {
      const saved = localStorage.getItem(KEYS.USER);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveUser: (user: any) => {
    localStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  clearUser: () => {
    localStorage.removeItem(KEYS.USER);
  },

  // --- BOT STATE ---
  loadBotState: (): BotState | null => {
    try {
      const saved = localStorage.getItem(KEYS.BOT_STATE);
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (e) { return null; }
  },
  saveBotState: (state: BotState) => {
    localStorage.setItem(KEYS.BOT_STATE, JSON.stringify(state));
  },

  // --- TRADES ---
  loadTrades: (): Trade[] => {
    try {
      const saved = localStorage.getItem(KEYS.TRADES);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveTrades: (trades: Trade[]) => {
    localStorage.setItem(KEYS.TRADES, JSON.stringify(trades));
  },

  // --- PRICES ---
  loadLastPrices: (): Record<Symbol, number> | null => {
    try {
      const saved = localStorage.getItem(KEYS.LAST_PRICE_CACHE);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveLastPrices: (prices: Record<Symbol, number>) => {
    localStorage.setItem(KEYS.LAST_PRICE_CACHE, JSON.stringify(prices));
  },

  // --- RISK SETTINGS ---
  loadRiskSettings: (): Record<Symbol, RiskSettings> | null => {
    try {
      const saved = localStorage.getItem(KEYS.RISK_SETTINGS);
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveRiskSettings: (settings: Record<Symbol, RiskSettings>) => {
    localStorage.setItem(KEYS.RISK_SETTINGS, JSON.stringify(settings));
  },

  // --- ENABLED SYMBOLS ---
  loadEnabledSymbols: (): Set<Symbol> => {
    try {
      const saved = localStorage.getItem(KEYS.ENABLED_SYMBOLS);
      if (!saved) return new Set(['BTCUSD']);
      const parsedArray = JSON.parse(saved);
      return new Set(parsedArray);
    } catch (e) { return new Set(['BTCUSD']); }
  },
  saveEnabledSymbols: (symbols: Set<Symbol>) => {
    localStorage.setItem(KEYS.ENABLED_SYMBOLS, JSON.stringify(Array.from(symbols)));
  },

  // --- MISC ---
  loadActiveSymbol: (): Symbol => {
    const saved = localStorage.getItem(KEYS.ACTIVE_SYMBOL) as Symbol;
    if (saved && ASSETS[saved]) {
        return saved;
    }
    return 'BTCUSD';
  },
  saveActiveSymbol: (sym: Symbol) => {
    localStorage.setItem(KEYS.ACTIVE_SYMBOL, sym);
  },

  loadTimeframe: (): string => {
    return localStorage.getItem(KEYS.TIMEFRAME) || '5m';
  },
  saveTimeframe: (tf: string) => {
    localStorage.setItem(KEYS.TIMEFRAME, tf);
  },

  loadLogs: (): any[] => {
    try {
      const saved = localStorage.getItem(KEYS.LOGS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveLogs: (logs: any[]) => {
    const truncated = logs.slice(-100);
    localStorage.setItem(KEYS.LOGS, JSON.stringify(truncated));
  },

  // --- CHAT HISTORY ---
  loadChatHistory: (): ChatMessage[] => {
    try {
      const saved = localStorage.getItem(KEYS.CHAT_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveChatHistory: (messages: ChatMessage[]) => {
    const truncated = messages.slice(-50);
    localStorage.setItem(KEYS.CHAT_HISTORY, JSON.stringify(truncated));
  },
  clearChatHistory: () => {
    localStorage.removeItem(KEYS.CHAT_HISTORY);
  },

  // --- CUSTOM PROMPT ---
  loadCustomPrompt: (): string => {
    return localStorage.getItem(KEYS.CUSTOM_PROMPT) || "Buy when price drops 2% in an hour and RSI is below 30.";
  },
  saveCustomPrompt: (prompt: string) => {
    localStorage.setItem(KEYS.CUSTOM_PROMPT, prompt);
  },
  
  // Clean reset function
  resetAll: () => {
    localStorage.clear();
    window.location.reload();
  }
};
