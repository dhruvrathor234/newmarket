import { supabase } from './supabase';
import { Trade, BotState } from '../types';

export const databaseService = {
  // --- PROFILES / BOT STATE ---
  async saveBotState(userId: string, state: BotState) {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        balance: state.balance,
        equity: state.equity,
        paper_balance: state.paperBalance,
        paper_equity: state.paperEquity,
        real_balance: state.realBalance,
        real_equity: state.realEquity,
        last_run_time: state.lastRunTime,
        strategy: state.strategy,
        status_message: state.statusMessage,
        custom_logic: state.customLogic,
        is_running: state.isRunning,
        account_type: state.accountType,
        binance_api_key: state.binanceApiKey,
        binance_api_secret: state.binanceApiSecret,
        is_binance_connected: state.isBinanceConnected,
        trading_mode: state.tradingMode,
        updated_at: new Date().toISOString()
      });
    if (error) console.error('Error saving bot state to Supabase:', error);
  },

  async loadBotState(userId: string): Promise<BotState | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) return null;

    return {
      isRunning: data.is_running,
      strategy: data.strategy,
      balance: data.balance,
      equity: data.equity,
      paperBalance: data.paper_balance || data.balance,
      paperEquity: data.paper_equity || data.equity,
      realBalance: data.real_balance || 0,
      realEquity: data.real_equity || 0,
      lastRunTime: data.last_run_time,
      statusMessage: data.status_message,
      customLogic: data.custom_logic,
      accountType: data.account_type || 'PAPER',
      binanceApiKey: data.binance_api_key,
      binanceApiSecret: data.binance_api_secret,
      isBinanceConnected: data.is_binance_connected || false,
      tradingMode: data.trading_mode || 'SPOT'
    };
  },

  // --- TRADES ---
  async saveTrades(userId: string, trades: Trade[]) {
    if (!trades || trades.length === 0) return;
    
    const tradesToSync = trades.map(t => ({
      id: t.id,
      user_id: userId,
      symbol: t.symbol,
      type: t.type,
      entry_price: t.entryPrice,
      limit_price: t.limitPrice,
      close_price: t.closePrice,
      lot_size: t.lotSize,
      stop_loss: t.stopLoss,
      take_profit: t.takeProfit,
      risk_percentage: t.riskPercentage,
      pnl: t.pnl,
      open_time: t.openTime,
      close_time: t.closeTime,
      status: t.status,
      account_type: t.accountType
    }));

    const { error } = await supabase
      .from('trades')
      .upsert(tradesToSync);

    if (error) console.error('Error saving trades to Supabase:', error);
  },

  async loadTrades(userId: string): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('open_time', { ascending: false });

    if (error || !data) return [];

    return data.map(t => ({
      id: t.id,
      symbol: t.symbol,
      type: t.type,
      entryPrice: t.entry_price,
      limitPrice: t.limit_price,
      closePrice: t.close_price,
      lotSize: t.lot_size,
      stopLoss: t.stop_loss,
      takeProfit: t.take_profit,
      riskPercentage: t.risk_percentage,
      pnl: t.pnl,
      openTime: t.open_time,
      closeTime: t.close_time,
      status: t.status,
      accountType: t.account_type || 'PAPER'
    }));
  },

  // --- LOGS ---
  async saveLogs(userId: string, logs: any[]) {
    if (!logs || logs.length === 0) return;
    const logsToSync = logs.map(l => ({
      id: l.id,
      user_id: userId,
      time: l.time,
      message: l.message,
      type: l.type
    }));

    const { error } = await supabase
      .from('logs')
      .upsert(logsToSync);

    if (error) console.error('Error saving logs to Supabase:', error);
  },

  async loadLogs(userId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('logs')
      .select('*')
      .eq('user_id', userId)
      .order('time', { ascending: false })
      .limit(100);

    if (error || !data) return [];

    return data.map(l => ({
      id: l.id,
      time: l.time,
      message: l.message,
      type: l.type
    })).reverse();
  },

  // --- NEW HELPER METHODS ---
  async updateBalance(userId: string, newBalance: number) {
    const { error } = await supabase
      .from("profiles")
      .update({ balance: newBalance })
      .eq("id", userId);
    if (error) console.error('Error updating balance:', error);
  },

  async closeTrade(tradeId: string, profit: number) {
    const { error } = await supabase
      .from("trades")
      .update({
        pnl: profit,
        status: "CLOSED",
        close_time: Date.now()
      })
      .eq("id", tradeId);
    if (error) console.error('Error closing trade:', error);
  },

  async openTrade(userId: string, asset: string, type: string, lot: number) {
    const { error } = await supabase
      .from("trades")
      .insert([
        {
          user_id: userId,
          symbol: asset,
          type: type,
          lot_size: lot,
          pnl: 0,
          status: "OPEN",
          open_time: Date.now()
        }
      ]);
    if (error) console.error('Error opening trade:', error);
  },

  async saveUser(id: string, email: string) {
    const { error } = await supabase
      .from("profiles")
      .upsert([{ id: id, email: email, balance: 500 }]);
    if (error) console.error('Error saving user:', error);
  }
};
