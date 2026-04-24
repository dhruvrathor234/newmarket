
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, writeBatch, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Trade, BotState, TradingMode, AccountType, TradeType, Symbol } from '../types';

export const databaseService = {
  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    try {
      const docRef = doc(db, 'profiles', userId);
      await setDoc(docRef, {
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
      }, { merge: true });
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
        isRunning: data.isRunning,
        strategy: data.strategy,
        balance: data.balance,
        equity: data.equity,
        paperBalance: data.paperBalance ?? data.balance,
        paperEquity: data.paperEquity ?? data.equity,
        realBalance: data.realBalance ?? data.balance,
        realEquity: data.realEquity ?? data.equity,
        lastRunTime: data.lastRunTime,
        statusMessage: data.statusMessage,
        customLogic: data.customLogic,
        accountType: (data.accountType as AccountType) || AccountType.PAPER,
        tradingMode: (data.tradingMode as TradingMode) || TradingMode.SPOT,
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
      const batch = writeBatch(db);
      
      // We only sync recent or relevant trades to avoid hitting limits if there are thousands
      // For this app, we'll sync the ones provided
      trades.forEach(t => {
        const tradeRef = doc(db, 'trades', t.id);
        batch.set(tradeRef, {
          ...t,
          userId,
          updatedAt: serverTimestamp()
        }, { merge: true });
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
          entryPrice: data.entryPrice,
          limitPrice: data.limitPrice,
          closePrice: data.closePrice,
          lotSize: data.lotSize,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          riskPercentage: data.riskPercentage,
          pnl: data.pnl,
          openTime: data.openTime,
          closeTime: data.closeTime,
          status: data.status as 'OPEN' | 'CLOSED' | 'PENDING',
          accountType: data.accountType as AccountType,
          binanceOrderId: data.binanceOrderId
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
      // Logs are usually high volume, we might want to cap them
      const recentLogs = logs.slice(-20); // Only sync last 20 logs to cloud
      const batch = writeBatch(db);
      
      recentLogs.forEach(log => {
        const logRef = doc(db, 'logs', log.id);
        batch.set(logRef, {
          ...log,
          userId,
          createdAt: serverTimestamp()
        }, { merge: true });
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
          time: data.time,
          message: data.message,
          type: data.type
        };
      }).reverse();
    } catch (error) {
      console.error('Error loading logs from Firestore:', error);
      return [];
    }
  },

  // --- HELPER METHODS ---
  async updateBalance(userId: string, newBalance: number) {
    try {
      const docRef = doc(db, 'profiles', userId);
      await updateDoc(docRef, { balance: newBalance });
    } catch (error) {
       // Profile might not exist yet if called early
       console.warn('Update balance failed, profile might not exist');
    }
  },

  async saveUser(id: string, email: string) {
    try {
      const docRef = doc(db, 'profiles', id);
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        await setDoc(docRef, {
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
      }
    } catch (error) {
      console.error('Error saving user to Firestore:', error);
    }
  }
};
