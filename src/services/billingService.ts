
import { supabase } from '../lib/supabase';

export interface UserBillingInfo {
  tradeCount: number;
  netProfit: number;
  unpaidProfitShare: number;
  isServicePaused: boolean;
  lastPaymentDate?: string;
}

export const billingService = {
  subscribeToBillingInfo(userId: string, callback: (info: UserBillingInfo) => void) {
    // Initial fetch
    supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single()
      .then(({ data }) => {
        if (data) {
          callback({
            tradeCount: data.trade_count || 0,
            netProfit: data.net_profit || 0,
            unpaidProfitShare: data.unpaid_profit_share || 0,
            isServicePaused: data.is_service_paused || false,
            lastPaymentDate: data.last_payment_date,
          });
        }
      });

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
          tradeCount: data.trade_count || 0,
          netProfit: data.net_profit || 0,
          unpaidProfitShare: data.unpaid_profit_share || 0,
          isServicePaused: data.is_service_paused || false,
          lastPaymentDate: data.last_payment_date,
        });
      })
      .subscribe();
  },

  async recordTrade(userId: string, pnl: number) {
    const { data, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
    
    if (!data) {
      await supabase.from('users').insert([{
        user_id: userId,
        trade_count: 1,
        net_profit: pnl,
        unpaid_profit_share: 0,
        is_service_paused: false,
      }]);
    } else {
      const newTradeCount = (data.trade_count || 0) + 1;
      const newNetProfit = (data.net_profit || 0) + pnl;
      
      let unpaidProfitShare = data.unpaid_profit_share || 0;
      let isServicePaused = data.is_service_paused || false;

      // If user hits 10 trades, calculate 20% profit share
      if (newTradeCount >= 10 && newNetProfit > 0) {
        unpaidProfitShare = newNetProfit * 0.2;
        if (unpaidProfitShare > 0) {
          isServicePaused = true;
        }
      }

      await supabase
        .from('users')
        .update({
          trade_count: newTradeCount,
          net_profit: newNetProfit,
          unpaid_profit_share: unpaidProfitShare,
          is_service_paused: isServicePaused,
        })
        .eq('user_id', userId);
    }
  },

  async processPayment(userId: string, amount: number, method: string, transactionId: string) {
    // Record payment
    const { error: paymentError } = await supabase.from('payments').insert([{
      user_id: userId,
      amount,
      method,
      status: 'COMPLETED',
      created_at: new Date().toISOString(),
      transaction_id: transactionId,
    }]);

    if (paymentError) throw paymentError;

    // Reset billing status
    await supabase
      .from('users')
      .update({
        unpaid_profit_share: 0,
        is_service_paused: false,
        last_payment_date: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }
};

