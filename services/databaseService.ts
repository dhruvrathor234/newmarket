
import { db } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { Trade, BotState, TradingMode, AccountType, TradeType, Symbol } from '../types';

export const databaseService = {
  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    try {
      const stateRef = doc(db, 'bot_state', userId);
      await setDoc(stateRef, {
        userId,
        isRunning: state.isRunning,
        strategy: state.strategy,
        balance: state.balance,
        equity: state.equity,
        statusMessage: state.statusMessage,
        lastRunTime: state.lastRunTime,
        customLogic: state.customLogic,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (error) {
      console.error('Error saving bot state to Firestore:', error);
    }
  },

  async loadBotState(userId: string): Promise<BotState | null> {
    try {
      const stateRef = doc(db, 'bot_state', userId);
      const snap = await getDoc(stateRef);
      
      if (!snap.exists()) return null;
      
      const data = snap.data();
      return {
        isRunning: data.isRunning,
        strategy: data.strategy,
        balance: data.balance,
        equity: data.equity,
        paperBalance: data.balance,
        paperEquity: data.equity,
        realBalance: data.balance,
        realEquity: data.equity,
        lastRunTime: data.lastRunTime,
        statusMessage: data.statusMessage,
        customLogic: data.customLogic,
        accountType: AccountType.PAPER,
        tradingMode: TradingMode.SPOT,
        binanceApiKey: '',
        binanceApiSecret: '',
        isBinanceConnected: false
      };
    } catch (error) {
      console.error('Error loading bot state from Firestore:', error);
      return null;
    }
  },

  // --- TRADES ---
  async saveTrades(userId: string, trades: Trade[]) {
    if (!trades || trades.length === 0) return;
    
    try {
      const batch = trades.map(async (t) => {
        const tradeData = {
          userId,
          symbol: t.symbol,
          type: t.type,
          entryPrice: t.entryPrice,
          limitPrice: t.limitPrice || null,
          closePrice: t.closePrice || null,
          lotSize: t.lotSize,
          stopLoss: t.stopLoss || null,
          takeProfit: t.takeProfit || null,
          riskPercentage: t.riskPercentage || 0,
          pnl: t.pnl || 0,
          openTime: t.openTime,
          closeTime: t.closeTime || null,
          status: t.status,
          timestamp: new Date().toISOString() // For ordering
        };
        
        // Use addDoc for new trades, or we could use a specific ID if we have one
        // For simplicity, we'll just add them as new records if they don't have an ID
        if (t.id && t.id.length > 20) { // Assuming it's a firestore ID
           await setDoc(doc(db, 'trades', t.id), tradeData, { merge: true });
        } else {
           await addDoc(collection(db, 'trades'), tradeData);
        }
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error saving trades to Firestore:', error);
    }
  },

  async loadTrades(userId: string): Promise<Trade[]> {
    try {
      const tradesRef = collection(db, 'trades');
      const q = query(tradesRef, where('userId', '==', userId), orderBy('openTime', 'desc'));
      const snap = await getDocs(q);
      
      return snap.docs.map(doc => {
        const t = doc.data();
        return {
          id: doc.id,
          symbol: t.symbol as Symbol,
          type: t.type as TradeType,
          entryPrice: t.entryPrice,
          limitPrice: t.limitPrice,
          closePrice: t.closePrice,
          lotSize: t.lotSize,
          stopLoss: t.stopLoss,
          takeProfit: t.takeProfit,
          riskPercentage: t.riskPercentage,
          pnl: t.pnl,
          openTime: t.openTime,
          closeTime: t.closeTime,
          status: t.status as 'OPEN' | 'CLOSED' | 'PENDING',
          accountType: AccountType.PAPER
        };
      });
    } catch (error) {
      console.error('Error loading trades from Firestore:', error);
      return [];
    }
  },

  // --- LOGS ---
  async saveLogs(userId: string, logs: any[]) {
    if (!logs || logs.length === 0) return;
    
    try {
      const batch = logs.map(async (l) => {
        const logData = {
          userId,
          time: l.time,
          message: l.message,
          type: l.type,
          timestamp: new Date().toISOString()
        };
        
        if (l.id && l.id.length > 20) {
          await setDoc(doc(db, 'logs', l.id), logData, { merge: true });
        } else {
          await addDoc(collection(db, 'logs'), logData);
        }
      });
      
      await Promise.all(batch);
    } catch (error) {
      console.error('Error saving logs to Firestore:', error);
    }
  },

  async loadLogs(userId: string): Promise<any[]> {
    try {
      const logsRef = collection(db, 'logs');
      const q = query(logsRef, where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(100));
      const snap = await getDocs(q);
      
      return snap.docs.map(doc => {
        const l = doc.data();
        return {
          id: doc.id,
          time: l.time,
          message: l.message,
          type: l.type
        };
      }).reverse();
    } catch (error) {
      console.error('Error loading logs from Firestore:', error);
      return [];
    }
  },

  // --- NEW HELPER METHODS ---
  async updateBalance(userId: string, newBalance: number) {
    try {
      const stateRef = doc(db, 'bot_state', userId);
      await updateDoc(stateRef, { balance: newBalance });
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  },

  async closeTrade(tradeId: string, profit: number) {
    try {
      const tradeRef = doc(db, 'trades', tradeId);
      await updateDoc(tradeRef, {
        pnl: profit,
        status: "CLOSED",
        closeTime: Date.now()
      });
    } catch (error) {
      console.error('Error closing trade:', error);
    }
  },

  async openTrade(userId: string, asset: string, type: string, lot: number) {
    try {
      await addDoc(collection(db, 'trades'), {
        userId,
        symbol: asset,
        type,
        lotSize: lot,
        pnl: 0,
        status: "OPEN",
        openTime: Date.now(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error opening trade:', error);
    }
  },

  async saveUser(id: string, email: string) {
    try {
      const stateRef = doc(db, 'bot_state', id);
      const snap = await getDoc(stateRef);
      if (!snap.exists()) {
        await setDoc(stateRef, {
          userId: id,
          balance: 500,
          equity: 500,
          isRunning: false,
          strategy: 'NEBULA_V5',
          statusMessage: 'System Standby',
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }
};
