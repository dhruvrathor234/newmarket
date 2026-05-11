
import { Trade, BotState, TradingMode, AccountType, TradeType, Symbol, Transaction } from '../types';
import { supabase } from '../lib/supabase';

export const databaseService = {
  // --- REAL-TIME SUBSCRIPTIONS ---
  subscribeToBotState(userId: string, callback: (state: BotState) => void) {
    // Initial fetch
    this.loadBotState(userId).then(state => {
      if (state) callback(state);
    });

    // Subscribe to changes
    return supabase
      .channel(`public:users:user_id=eq.${userId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'users', 
        filter: `user_id=eq.${userId}` 
      }, payload => {
        const data = payload.new;
        callback({
          isRunning: data.is_running ?? false,
          strategy: data.strategy ?? 'NEBULA_V5',
          balance: data.balance ?? 500,
          equity: data.equity ?? 500,
          paperBalance: data.paper_balance ?? 500,
          paperEquity: data.paper_equity ?? 500,
          realBalance: data.real_balance ?? 0,
          realEquity: data.real_equity ?? 0,
          lastRunTime: data.last_run_time ?? null,
          statusMessage: data.status_message ?? '',
          customLogic: data.custom_logic ?? '',
          accountType: (data.account_type as AccountType) || AccountType.PAPER,
          tradingMode: (data.trading_mode as TradingMode) || TradingMode.SPOT,
          binanceApiKey: data.binance_api_key ?? '',
          binanceApiSecret: data.binance_api_secret ?? '',
          isBinanceConnected: data.is_binance_connected ?? false,
          mtAccountId: data.mt_account_id ?? '',
          mtMasterPassword: data.mt_master_password ?? '',
          mtServer: data.mt_server ?? '',
          isMtConnected: data.is_mt_connected ?? false,
          connectionType: data.connection_type ?? 'BINANCE',
          isSubscribed: data.is_subscribed ?? false
        });
      })
      .subscribe();
  },

  subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
    // Initial fetch
    this.loadTrades(userId).then(trades => {
      callback(trades);
    });

    // Subscribe to changes
    return supabase
      .channel(`public:trades:user_id=eq.${userId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trades', 
        filter: `user_id=eq.${userId}` 
      }, () => {
        this.loadTrades(userId).then(trades => callback(trades));
      })
      .subscribe();
  },

  // --- TRANSACTIONS ---
  async saveTransaction(userId: string, tx: Transaction) {
    try {
      const { error } = await supabase.from('transactions').insert([{
        id: tx.id,
        user_id: userId,
        amount: tx.amount,
        plan_name: tx.planName,
        method: tx.method,
        status: tx.status,
        created_at: new Date(tx.createdAt).toISOString()
      }]);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  },

  async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map(tx => ({
        id: tx.id,
        amount: tx.amount,
        planName: tx.plan_name,
        method: tx.method,
        status: tx.status,
        createdAt: new Date(tx.created_at).getTime()
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
      return [];
    }
  },

  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    try {
      const { error } = await supabase.from('users').upsert({
        user_id: userId,
        balance: state.balance,
        equity: state.equity,
        paper_balance: state.paperBalance,
        paper_equity: state.paperEquity,
        real_balance: state.realBalance,
        real_equity: state.realEquity,
        account_type: state.accountType,
        strategy: state.strategy,
        trading_mode: state.tradingMode,
        status_message: state.statusMessage,
        is_running: state.isRunning,
        last_run_time: state.lastRunTime,
        custom_logic: state.customLogic,
        binance_api_key: state.binanceApiKey,
        binance_api_secret: state.binanceApiSecret,
        is_binance_connected: state.isBinanceConnected,
        mt_account_id: state.mtAccountId,
        mt_master_password: state.mtMasterPassword,
        mt_server: state.mtServer,
        is_mt_connected: state.isMtConnected,
        connection_type: state.connectionType,
        is_subscribed: state.isSubscribed || false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving bot state:', error);
    }
  },

  async loadBotState(userId: string): Promise<BotState | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      
      return {
        isRunning: data.is_running ?? false,
        strategy: data.strategy ?? 'NEBULA_V5',
        balance: data.balance ?? 500,
        equity: data.equity ?? 500,
        paperBalance: data.paper_balance ?? 500,
        paperEquity: data.paper_equity ?? 500,
        realBalance: data.real_balance ?? 0,
        realEquity: data.real_equity ?? 0,
        lastRunTime: data.last_run_time ?? null,
        statusMessage: data.status_message ?? '',
        customLogic: data.custom_logic ?? '',
        accountType: (data.account_type as AccountType) || AccountType.PAPER,
        tradingMode: (data.trading_mode as TradingMode) || TradingMode.SPOT,
        binanceApiKey: data.binance_api_key ?? '',
        binanceApiSecret: data.binance_api_secret ?? '',
        isBinanceConnected: data.is_binance_connected ?? false,
        mtAccountId: data.mt_account_id ?? '',
        mtMasterPassword: data.mt_master_password ?? '',
        mtServer: data.mt_server ?? '',
        isMtConnected: data.is_mt_connected ?? false,
        connectionType: data.connection_type ?? 'BINANCE',
        isSubscribed: data.is_subscribed ?? false
      };
    } catch (error) {
      console.error('Error loading bot state:', error);
      return null;
    }
  },

  // --- TRADES ---
  async openTrade(userId: string, trade: Trade) {
    try {
      const { error } = await supabase.from('trades').insert([{
        id: trade.id,
        user_id: userId,
        symbol: trade.symbol,
        trade_type: trade.type,
        lot_size: trade.lotSize,
        entry_price: trade.entryPrice,
        status: 'OPEN',
        account_type: trade.accountType,
        open_time: new Date(trade.openTime || Date.now()).toISOString(),
        stop_loss: trade.stopLoss,
        take_profit: trade.takeProfit
      }]);
      if (error) throw error;
    } catch (error) {
      console.error('Error opening trade:', error);
    }
  },

  async closeTrade(userId: string, tradeId: string, closePrice: number, pnl: number) {
    try {
      const { error } = await supabase.from('trades').update({
        close_price: closePrice,
        pnl: pnl,
        status: 'CLOSED',
        close_time: new Date().toISOString()
      }).eq('id', tradeId);
      if (error) throw error;
    } catch (error) {
      console.error('Error closing trade:', error);
    }
  },

  async saveTrades(userId: string, trades: Trade[]) {
    if (!trades || trades.length === 0) return;
    try {
      const supabaseTrades = trades.map(t => ({
        id: t.id,
        user_id: userId,
        symbol: t.symbol,
        trade_type: t.type,
        lot_size: t.lotSize,
        entry_price: t.entryPrice,
        close_price: t.closePrice,
        pnl: t.pnl,
        status: t.status,
        account_type: t.accountType,
        open_time: new Date(t.openTime || Date.now()).toISOString(),
        close_time: t.closeTime ? new Date(t.closeTime).toISOString() : null,
        stop_loss: t.stopLoss,
        take_profit: t.takeProfit
      }));
      const { error } = await supabase.from('trades').upsert(supabaseTrades);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving trades:', error);
    }
  },

  async loadTrades(userId: string): Promise<Trade[]> {
    try {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', userId)
        .order('open_time', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      return (data || []).map(t => ({
        id: t.id,
        symbol: t.symbol as Symbol,
        type: t.trade_type as TradeType,
        entryPrice: t.entry_price || 0,
        limitPrice: t.limit_price || null,
        closePrice: t.close_price || null,
        lotSize: t.lot_size || 0,
        stopLoss: t.stop_loss || null,
        takeProfit: t.take_profit || null,
        riskPercentage: t.risk_percentage || 0,
        pnl: t.pnl || 0,
        openTime: new Date(t.open_time).getTime(),
        closeTime: t.close_time ? new Date(t.close_time).getTime() : null,
        status: t.status as 'OPEN' | 'CLOSED' | 'PENDING',
        accountType: t.account_type as AccountType,
        binanceOrderId: t.binance_order_id || null
      }));
    } catch (error) {
      console.error('Error loading trades:', error);
      return [];
    }
  },

  // --- LOGS ---
  async saveLogs(userId: string, logs: any[]) {
    if (!logs || logs.length === 0) return;
    try {
      const recentLogs = logs.slice(-20).map(log => ({
        id: log.id,
        user_id: userId,
        time: log.time,
        message: log.message,
        type: log.type,
        created_at: new Date().toISOString()
      }));
      
      const { error } = await supabase.from('logs').upsert(recentLogs);
      if (error) throw error;
    } catch (error) {
      console.error('Error saving logs:', error);
    }
  },

  async loadLogs(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      
      return (data || []).map(log => ({
        id: log.id,
        time: log.time,
        message: log.message,
        type: log.type
      })).reverse();
    } catch (error) {
      console.error('Error loading logs:', error);
      return [];
    }
  },

  // --- HELPER METHODS ---
  async updateBalance(userId: string, newBalance: number) {
    try {
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('user_id', userId);
      if (error) throw error;
    } catch (error) {
      console.error('Update balance failed:', error);
    }
  },

  async saveUser(id: string, email: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', id)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (!data) {
        const { error } = await supabase.from('users').insert([{
          user_id: id,
          email: email,
          balance: 500,
          equity: 500,
          paper_balance: 500,
          paper_equity: 500,
          real_balance: 0,
          real_equity: 0,
          account_type: AccountType.PAPER,
          is_subscribed: false,
          created_at: new Date().toISOString()
        }]);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  }
};
