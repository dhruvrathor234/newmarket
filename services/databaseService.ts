
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, writeBatch, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Trade, BotState, TradingMode, AccountType, TradeType, Symbol } from '../types';

// Sanitizer to convert undefined values to null for Firestore
const sanitize = (data: any): any => {
  if (data === undefined) return null;
  if (data === null) return null;
  if (Array.isArray(data)) return data.map(sanitize);
  if (typeof data === 'object') {
    const clean: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        clean[key] = sanitize(data[key]);
      }
    }
    return clean;
  }
  return data;
};

export const databaseService = {
  // --- REAL-TIME SUBSCRIPTIONS ---
  subscribeToBotState(userId: string, callback: (state: BotState) => void) {
    const docRef = doc(db, 'profiles', userId);
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        callback({
          isRunning: data.isRunning ?? false,
          strategy: data.strategy ?? 'NEBULA_V5',
          balance: data.balance ?? 500,
          equity: data.equity ?? 500,
          paperBalance: data.paperBalance ?? data.balance ?? 500,
          paperEquity: data.paperEquity ?? data.equity ?? 500,
          realBalance: data.realBalance ?? 0,
          realEquity: data.realEquity ?? 0,
          lastRunTime: data.lastRunTime ?? null,
          statusMessage: data.statusMessage ?? '',
          customLogic: data.customLogic ?? '',
          accountType: (data.accountType as AccountType) || AccountType.PAPER,
          tradingMode: (data.tradingMode as TradingMode) || TradingMode.SPOT,
          binanceApiKey: '',
          binanceApiSecret: '',
          isBinanceConnected: false
        });
      }
    }, (error) => {
      if (!error.message?.includes('offline')) {
        console.error("Error subscribing to bot state:", error);
      }
    });
  },

  subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
    const tradesRef = collection(db, 'trades');
    const q = query(tradesRef, where('userId', '==', userId), orderBy('openTime', 'desc'), limit(100));
    return onSnapshot(q, (snap) => {
      const trades = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          symbol: data.symbol as Symbol,
          type: data.type as TradeType,
          entryPrice: data.entryPrice || 0,
          limitPrice: data.limitPrice || null,
          closePrice: data.closePrice || null,
          lotSize: data.lotSize || 0,
          stopLoss: data.stopLoss || null,
          takeProfit: data.takeProfit || null,
          riskPercentage: data.riskPercentage || 0,
          pnl: data.pnl || 0,
          openTime: data.openTime || Date.now(),
          closeTime: data.closeTime || null,
          status: data.status as 'OPEN' | 'CLOSED' | 'PENDING',
          accountType: data.accountType as AccountType,
          binanceOrderId: data.binanceOrderId || null
        };
      });
      callback(trades);
    }, (error) => {
      if (!error.message?.includes('offline')) {
        console.error("Error subscribing to trades:", error);
      }
    });
  },

  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    try {
      const docRef = doc(db, 'profiles', userId);
      const data = sanitize({
        balance: state.balance,
        equity: state.equity,
        strategy: state.strategy,
        statusMessage: state.statusMessage,
        isRunning: state.isRunning,
        lastRunTime: state.lastRunTime,
        customLogic: state.customLogic,
        paperBalance: state.paperBalance,
        paperEquity: state.paperEquity,
        realBalance: state.realBalance,
        realEquity: state.realEquity,
        accountType: state.accountType,
        tradingMode: state.tradingMode,
        updatedAt: serverTimestamp()
      });
      await setDoc(docRef, data, { merge: true });
    } catch (error) {
      console.error('Error saving bot state to Firestore:', error);
    }
  },

  async loadBotState(userId: string): Promise<BotState | null> {
    try {
      const docRef = doc(db, 'profiles', userId);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) return null;
      const data = snap.data();
      
      return {
        isRunning: data.isRunning ?? false,
        strategy: data.strategy ?? 'NEBULA_V5',
        balance: data.balance ?? 500,
        equity: data.equity ?? 500,
        paperBalance: data.paperBalance ?? data.balance ?? 500,
        paperEquity: data.paperEquity ?? data.equity ?? 500,
        realBalance: data.realBalance ?? 0,
        realEquity: data.realEquity ?? 0,
        lastRunTime: data.lastRunTime ?? null,
        statusMessage: data.statusMessage ?? '',
        customLogic: data.customLogic ?? '',
        accountType: (data.accountType as AccountType) || AccountType.PAPER,
        tradingMode: (data.tradingMode as TradingMode) || TradingMode.SPOT,
        binanceApiKey: '',
        binanceApiSecret: '',
        isBinanceConnected: false
      };
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error loading bot state from Firestore:', error);
      }
      return null;
    }
  },

  // --- TRADES ---
  async saveTrades(userId: string, trades: Trade[]) {
    if (!trades || trades.length === 0) return;
    try {
      const batch = writeBatch(db);
      
      trades.forEach(t => {
        const tradeRef = doc(db, 'trades', t.id);
        const data = sanitize({
          ...t,
          userId,
          updatedAt: serverTimestamp()
        });
        batch.set(tradeRef, data, { merge: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error saving trades to Firestore:', error);
    }
  },

  async loadTrades(userId: string): Promise<Trade[]> {
    try {
      const tradesRef = collection(db, 'trades');
      const q = query(tradesRef, where('userId', '==', userId), orderBy('openTime', 'desc'), limit(100));
      const snap = await getDocs(q);
      
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          symbol: data.symbol as Symbol,
          type: data.type as TradeType,
          entryPrice: data.entryPrice || 0,
          limitPrice: data.limitPrice || null,
          closePrice: data.closePrice || null,
          lotSize: data.lotSize || 0,
          stopLoss: data.stopLoss || null,
          takeProfit: data.takeProfit || null,
          riskPercentage: data.riskPercentage || 0,
          pnl: data.pnl || 0,
          openTime: data.openTime || Date.now(),
          closeTime: data.closeTime || null,
          status: data.status as 'OPEN' | 'CLOSED' | 'PENDING',
          accountType: data.accountType as AccountType,
          binanceOrderId: data.binanceOrderId || null
        };
      });
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error loading trades from Firestore:', error);
      }
      return [];
    }
  },

  // --- LOGS ---
  async saveLogs(userId: string, logs: any[]) {
    if (!logs || logs.length === 0) return;
    try {
      const recentLogs = logs.slice(-20); 
      const batch = writeBatch(db);
      
      recentLogs.forEach(log => {
        const logRef = doc(db, 'logs', log.id);
        const data = sanitize({
          ...log,
          userId,
          createdAt: serverTimestamp()
        });
        batch.set(logRef, data, { merge: true });
      });

      await batch.commit();
    } catch (error) {
      console.error('Error saving logs to Firestore:', error);
    }
  },

  async loadLogs(userId: string): Promise<any[]> {
    try {
      const logsRef = collection(db, 'logs');
      const q = query(logsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'), limit(50));
      const snap = await getDocs(q);
      
      return snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          time: data.time || '',
          message: data.message || '',
          type: data.type || 'info'
        };
      }).reverse();
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error loading logs from Firestore:', error);
      }
      return [];
    }
  },

  // --- HELPER METHODS ---
  async updateBalance(userId: string, newBalance: number) {
    try {
      const docRef = doc(db, 'profiles', userId);
      await updateDoc(docRef, { balance: newBalance });
    } catch (error: any) {
       if (!error.message?.includes('offline')) {
        console.warn('Update balance failed, profile might not exist');
       }
    }
  },

  async saveUser(id: string, email: string) {
    try {
      const docRef = doc(db, 'profiles', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const data = sanitize({
          id,
          email,
          balance: 500,
          equity: 500,
          paperBalance: 500,
          paperEquity: 500,
          realBalance: 0,
          realEquity: 0,
          accountType: AccountType.PAPER,
          createdAt: serverTimestamp()
        });
        await setDoc(docRef, data);
      }
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error saving user to Firestore:', error);
      }
    }
  }
};
