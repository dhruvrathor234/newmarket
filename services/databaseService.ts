
import { db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, writeBatch, serverTimestamp, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Trade, BotState, TradingMode, AccountType, TradeType, Symbol, Transaction } from '../types';
import { supabase } from '../lib/supabase';

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
          binanceApiKey: data.binanceApiKey ?? '',
          binanceApiSecret: data.binanceApiSecret ?? '',
          isBinanceConnected: data.isBinanceConnected ?? false,
          mtAccountId: data.mtAccountId ?? '',
          mtMasterPassword: data.mtMasterPassword ?? '',
          mtServer: data.mtServer ?? '',
          isMtConnected: data.isMtConnected ?? false,
          connectionType: data.connectionType ?? 'BINANCE',
          isSubscribed: data.isSubscribed ?? false
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

  // --- TRANSACTIONS ---
  async saveTransaction(userId: string, tx: Transaction) {
    try {
      // 1. Firebase
      const txRef = doc(db, 'transactions', tx.id);
      await setDoc(txRef, {
        ...sanitize(tx),
        userId,
        serverTimestamp: serverTimestamp()
      });

      // 2. Supabase
      await supabase.from('transactions').insert([{
        id: tx.id,
        firebase_uid: userId,
        amount: tx.amount,
        plan_name: tx.planName,
        method: tx.method,
        status: tx.status,
        created_at: new Date(tx.createdAt).toISOString()
      }]);
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const q = query(
        collection(db, 'transactions'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Transaction);
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    try {
      // 1. Firestore Save
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
        binanceApiKey: state.binanceApiKey,
        binanceApiSecret: state.binanceApiSecret,
        isBinanceConnected: state.isBinanceConnected,
        mtAccountId: state.mtAccountId,
        mtMasterPassword: state.mtMasterPassword,
        mtServer: state.mtServer,
        isMtConnected: state.isMtConnected,
        connectionType: state.connectionType,
        isSubscribed: state.isSubscribed || false,
        updatedAt: serverTimestamp()
      });
      await setDoc(docRef, data, { merge: true });

      // 2. Supabase Sync
      await supabase.from('users').upsert({
        firebase_uid: userId,
        balance: state.balance,
        paper_balance: state.paperBalance,
        real_balance: state.realBalance,
        account_type: state.accountType,
        strategy: state.strategy,
        connection_type: state.connectionType,
        is_subscribed: state.isSubscribed || false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'firebase_uid' });

    } catch (error) {
      console.error('Error saving bot state:', error);
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
        binanceApiKey: data.binanceApiKey ?? '',
        binanceApiSecret: data.binanceApiSecret ?? '',
        isBinanceConnected: data.isBinanceConnected ?? false,
        mtAccountId: data.mtAccountId ?? '',
        mtMasterPassword: data.mtMasterPassword ?? '',
        mtServer: data.mtServer ?? '',
        isMtConnected: data.isMtConnected ?? false,
        connectionType: data.connectionType ?? 'BINANCE',
        isSubscribed: data.isSubscribed ?? false
      };
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error loading bot state from Firestore:', error);
      }
      return null;
    }
  },

  // --- TRADES ---
  async openTrade(userId: string, trade: Trade) {
    try {
      const docRef = doc(db, 'trades', trade.id);
      const data = sanitize({ ...trade, userId, updatedAt: serverTimestamp() });
      await setDoc(docRef, data);

      await supabase.from('trades').insert([{
        id: trade.id,
        firebase_uid: userId,
        symbol: trade.symbol,
        type: trade.type,
        lot_size: trade.lotSize,
        entry_price: trade.entryPrice,
        status: 'OPEN',
        account_type: trade.accountType,
        open_time: new Date(trade.openTime || Date.now()).toISOString()
      }]);
    } catch (error) {
      console.error('Error opening trade:', error);
    }
  },

  async closeTrade(userId: string, tradeId: string, closePrice: number, pnl: number) {
    try {
      const docRef = doc(db, 'trades', tradeId);
      await updateDoc(docRef, {
        closePrice,
        pnl,
        status: 'CLOSED',
        closeTime: Date.now(),
        updatedAt: serverTimestamp()
      });

      await supabase.from('trades').update({
        close_price: closePrice,
        pnl: pnl,
        status: 'CLOSED',
        close_time: new Date().toISOString()
      }).eq('id', tradeId);
    } catch (error) {
      console.error('Error closing trade:', error);
    }
  },

  async saveTrades(userId: string, trades: Trade[]) {
    if (!trades || trades.length === 0) return;
    try {
      // 1. Firestore Batch
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

      // 2. Supabase Upsert
      const supabaseTrades = trades.map(t => ({
        id: t.id,
        firebase_uid: userId,
        symbol: t.symbol,
        trade_type: t.type,
        lot_size: t.lotSize,
        entry_price: t.entryPrice,
        close_price: t.closePrice,
        pnl: t.pnl,
        status: t.status,
        account_type: t.accountType,
        created_at: new Date(t.openTime || Date.now()).toISOString()
      }));
      await supabase.from('trades').upsert(supabaseTrades);

    } catch (error) {
      console.error('Error saving trades:', error);
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
      await supabase.from('users').update({ balance: newBalance }).eq('firebase_uid', userId);
    } catch (error: any) {
       if (!error.message?.includes('offline')) {
        console.warn('Update balance failed');
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
          isSubscribed: false,
          createdAt: serverTimestamp()
        });
        await setDoc(docRef, data);
        
        // Supabase Entry
        await supabase.from('users').insert([{
          firebase_uid: id,
          email: email,
          balance: 500,
          paper_balance: 500,
          real_balance: 0,
          created_at: new Date().toISOString()
        }]);
      }
    } catch (error: any) {
      if (!error.message?.includes('offline')) {
        console.error('Error saving user to Firestore:', error);
      }
    }
  }
};
