
import { BotState, Trade, RiskSettings, Symbol, MarketDetails, ChatMessage } from '../types';
import { INITIAL_BALANCE, ASSETS } from '../config/constants';

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

// In-memory storage to replace localStorage
const memoryStorage: Record<string, string> = {};

export const storageService = {
  // --- USER ---
  loadUser: () => {
    try {
      const saved = memoryStorage[KEYS.USER];
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveUser: (user: any) => {
    memoryStorage[KEYS.USER] = JSON.stringify(user);
  },
  clearUser: () => {
    delete memoryStorage[KEYS.USER];
  },

  // --- BOT STATE ---
  loadBotState: (): BotState | null => {
    try {
      const saved = memoryStorage[KEYS.BOT_STATE];
      if (!saved) return null;
      return JSON.parse(saved);
    } catch (e) { return null; }
  },
  saveBotState: (state: BotState) => {
    memoryStorage[KEYS.BOT_STATE] = JSON.stringify(state);
  },

  // --- TRADES ---
  loadTrades: (): Trade[] => {
    try {
      const saved = memoryStorage[KEYS.TRADES];
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveTrades: (trades: Trade[]) => {
    memoryStorage[KEYS.TRADES] = JSON.stringify(trades);
  },

  // --- PRICES ---
  loadLastPrices: (): Record<Symbol, number> | null => {
    try {
      const saved = memoryStorage[KEYS.LAST_PRICE_CACHE];
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveLastPrices: (prices: Record<Symbol, number>) => {
    memoryStorage[KEYS.LAST_PRICE_CACHE] = JSON.stringify(prices);
  },

  // --- RISK SETTINGS ---
  loadRiskSettings: (): Record<Symbol, RiskSettings> | null => {
    try {
      const saved = memoryStorage[KEYS.RISK_SETTINGS];
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  },
  saveRiskSettings: (settings: Record<Symbol, RiskSettings>) => {
    memoryStorage[KEYS.RISK_SETTINGS] = JSON.stringify(settings);
  },

  // --- ENABLED SYMBOLS ---
  loadEnabledSymbols: (): Set<Symbol> => {
    try {
      const saved = memoryStorage[KEYS.ENABLED_SYMBOLS];
      if (!saved) return new Set(['BTCUSD']);
      const parsedArray = JSON.parse(saved);
      return new Set(parsedArray);
    } catch (e) { return new Set(['BTCUSD']); }
  },
  saveEnabledSymbols: (symbols: Set<Symbol>) => {
    memoryStorage[KEYS.ENABLED_SYMBOLS] = JSON.stringify(Array.from(symbols));
  },

  // --- MISC ---
  loadActiveSymbol: (): Symbol => {
    const saved = memoryStorage[KEYS.ACTIVE_SYMBOL] as Symbol;
    if (saved && ASSETS[saved]) {
        return saved;
    }
    return 'BTCUSD';
  },
  saveActiveSymbol: (sym: Symbol) => {
    memoryStorage[KEYS.ACTIVE_SYMBOL] = sym;
  },

  loadTimeframe: (): string => {
    return memoryStorage[KEYS.TIMEFRAME] || '5m';
  },
  saveTimeframe: (tf: string) => {
    memoryStorage[KEYS.TIMEFRAME] = tf;
  },

  loadLogs: (): any[] => {
    try {
      const saved = memoryStorage[KEYS.LOGS];
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveLogs: (logs: any[]) => {
    const truncated = logs.slice(-100);
    memoryStorage[KEYS.LOGS] = JSON.stringify(truncated);
  },

  // --- CHAT HISTORY ---
  loadChatHistory: (): ChatMessage[] => {
    try {
      const saved = memoryStorage[KEYS.CHAT_HISTORY];
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  },
  saveChatHistory: (messages: ChatMessage[]) => {
    const truncated = messages.slice(-50);
    memoryStorage[KEYS.CHAT_HISTORY] = JSON.stringify(truncated);
  },
  clearChatHistory: () => {
    delete memoryStorage[KEYS.CHAT_HISTORY];
  },

  // --- CUSTOM PROMPT ---
  loadCustomPrompt: (): string => {
    return memoryStorage[KEYS.CUSTOM_PROMPT] || "Buy when price drops 2% in an hour and RSI is below 30.";
  },
  saveCustomPrompt: (prompt: string) => {
    memoryStorage[KEYS.CUSTOM_PROMPT] = prompt;
  },
  
  // Clean reset function
  resetAll: () => {
    // Also clear actual localStorage just in case
    localStorage.clear();
    // Clear memory
    Object.keys(memoryStorage).forEach(key => delete memoryStorage[key]);
    window.location.reload();
  },

  clearSession: () => {
    delete memoryStorage[KEYS.BOT_STATE];
    delete memoryStorage[KEYS.TRADES];
    delete memoryStorage[KEYS.LOGS];
    delete memoryStorage[KEYS.CHAT_HISTORY];
    delete memoryStorage[KEYS.USER];
  }
};
