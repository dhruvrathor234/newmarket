import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import {
  BotState, Trade, Transaction, UserStats, View,
  NebulaV5Settings, HedgingBotSettings, HFTBotSettings, AccountType, TradingMode,
} from '../types';
import { INITIAL_BALANCE } from '../config/constants';
import { storageService } from '../services/storageService';
import { supabase } from '../lib/supabase';
import { databaseService } from '../services/databaseService';
import { initializePriceService } from '../services/priceService';

export type LogType = 'info' | 'success' | 'error' | 'warning';

export interface CloudSyncDeps {
  user: { email: string } | null;
  isInitialLoad: boolean;
  setIsInitialLoad: (v: boolean) => void;
  setUser: (u: { email: string } | null) => void;
  setUserStats: (s: UserStats | null) => void;
  setTrades: Dispatch<SetStateAction<Trade[]>>;
  setTransactions: Dispatch<SetStateAction<Transaction[]>>;
  setBotState: Dispatch<SetStateAction<BotState>>;
  setCurrentView: (v: View) => void;
  requestedViewRef: MutableRefObject<View | null>;
  tradesRef: MutableRefObject<Trade[]>;
  botStateRef: MutableRefObject<BotState>;
  nebulaV5SettingsRef: MutableRefObject<NebulaV5Settings>;
  hedgingSettingsRef: MutableRefObject<HedgingBotSettings>;
  hftSettingsRef: MutableRefObject<HFTBotSettings>;
  botState: BotState;
  trades: Trade[];
  logs: any[];
  nebulaV5Settings: NebulaV5Settings;
  hedgingSettings: HedgingBotSettings;
  hftSettings: HFTBotSettings;
  addLog: (message: string, type?: LogType) => void;
}

const createDefaultBotState = (): BotState => ({
  isRunning: false,
  strategy: 'NEBULA_V5',
  balance: INITIAL_BALANCE,
  equity: INITIAL_BALANCE,
  paperBalance: INITIAL_BALANCE,
  paperEquity: INITIAL_BALANCE,
  realBalance: 0,
  realEquity: 0,
  lastRunTime: null,
  statusMessage: 'System Standby',
  customLogic: '',
  accountType: AccountType.PAPER,
  tradingMode: TradingMode.SPOT,
  isBinanceConnected: false,
  isMtConnected: false,
  connectionType: 'BINANCE',
  binanceApiKey: '',
  binanceApiSecret: '',
  mtAccountId: '',
  mtMasterPassword: '',
  mtServer: '',
  isSubscribed: false,
});

/**
 * Owns all Supabase session, subscription, and debounced-persistence effects:
 *  - reacts to auth state changes (login/logout/switch user)
 *  - loads + realtime-subscribes the user's bot state, trades and transactions
 *  - debounced save of bot state/logs back to the cloud
 */
export const useCloudSync = (deps: CloudSyncDeps) => {
  const {
    user, isInitialLoad, setIsInitialLoad, setUser, setUserStats, setTrades,
    setTransactions, setBotState, setCurrentView, requestedViewRef,
    tradesRef, botStateRef, nebulaV5SettingsRef, hedgingSettingsRef, hftSettingsRef,
    botState, trades, logs, nebulaV5Settings, hedgingSettings, hftSettings, addLog,
  } = deps;

  const resetState = () => {
    storageService.clearSession();
    const defaults = createDefaultBotState();
    setBotState(defaults);
    setTrades([]);
    setTransactions([]);
    storageService.saveBotState(defaults);
  };

  const lastUidRef = useRef<string | null>(null);

  // --- AUTH STATE LISTENER ---
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const supabaseUser = session?.user;

      if (supabaseUser) {
        if (lastUidRef.current && lastUidRef.current !== supabaseUser.id) {
          resetState();
          setIsInitialLoad(true);
        }
        lastUidRef.current = supabaseUser.id;
        setUser({ email: supabaseUser.email || '' });
        initializePriceService(); // Start services only after login

        try {
          // Fetch or Initialize User Stats from Supabase
          const { data: stats } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', supabaseUser.id)
            .single();

          if (stats) {
            setUserStats({
              userId: stats.user_id,
              totalProfit: stats.total_profit,
              totalFeesOwed: stats.total_fees_owed,
              totalFeesPaid: stats.total_fees_paid,
              amountOwed: stats.amount_owed,
              isLocked: stats.is_locked,
              lastUpdated: stats.last_updated,
            });
          } else {
            const initialStats: UserStats = {
              userId: supabaseUser.id,
              totalProfit: 0,
              totalFeesOwed: 0,
              totalFeesPaid: 0,
              amountOwed: 0,
              isLocked: false,
              lastUpdated: Date.now(),
            };
            await supabase.from('user_stats').insert([{
              user_id: initialStats.userId,
              total_profit: initialStats.totalProfit,
              total_fees_owed: initialStats.totalFeesOwed,
              total_fees_paid: initialStats.totalFeesPaid,
              amount_owed: initialStats.amountOwed,
              is_locked: initialStats.isLocked,
              last_updated: initialStats.lastUpdated,
            }]);
            setUserStats(initialStats);
          }

          // Real-time subscription to user stats
          const channel = supabase
            .channel(`user_stats:${supabaseUser.id}`)
            .on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'user_stats',
              filter: `user_id=eq.${supabaseUser.id}`,
            }, payload => {
              const data = payload.new;
              setUserStats({
                userId: data.user_id,
                totalProfit: data.total_profit,
                totalFeesOwed: data.total_fees_owed,
                totalFeesPaid: data.total_fees_paid,
                amountOwed: data.amount_owed,
                isLocked: data.is_locked,
                lastUpdated: data.last_updated,
              });
            })
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (error: any) {
          console.error('Supabase Initialization Error:', error);
        }

        if (requestedViewRef.current) {
          setCurrentView(requestedViewRef.current);
          requestedViewRef.current = null;
        }
      } else {
        setUser(null);
        setUserStats(null);
        resetState();
        setIsInitialLoad(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- LOAD AND SUBSCRIBE TO DATA WHEN USER LOGS IN ---
  useEffect(() => {
    let unsubscribeBot: (() => void) | null = null;
    let unsubscribeTrades: (() => void) | null = null;

    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (user && currentUser && isInitialLoad) {
        try {
          const uid = currentUser.id;
          addLog('Establishing live cloud link...', 'info');

          // Initial existence check and save if new user
          const initialBotState = await databaseService.loadBotState(uid);
          if (!initialBotState) {
            await databaseService.saveUser(uid, currentUser.email || '');
            await databaseService.saveBotState(uid, botState);
            addLog('Cloud profile initialized.', 'success');
          } else {
            setBotState(initialBotState);
          }

          // Initial trades load
          const initialTrades = await databaseService.loadTrades(uid);
          if (initialTrades.length > 0) setTrades(initialTrades);

          // Initial transactions load
          const initialTx = await databaseService.getTransactions(uid);
          if (initialTx.length > 0) setTransactions(initialTx);

          // Subscribe for real-time updates
          unsubscribeBot = databaseService.subscribeToBotState(uid, (newState) => {
            setBotState(prev => {
              if (JSON.stringify(prev) === JSON.stringify(newState)) return prev;
              return { ...prev, ...newState };
            });
          });

          unsubscribeTrades = databaseService.subscribeToTrades(uid, (newTrades) => {
            setTrades(prev => {
              if (JSON.stringify(prev) === JSON.stringify(newTrades)) return prev;
              return newTrades;
            });
          });

          setIsInitialLoad(false);
          addLog('Real-time cloud synchronization active.', 'success');
        } catch (error) {
          console.error('Cloud subscription error:', error);
          addLog('Live link failed. operating in offline cache.', 'warning');
        }
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeBot) unsubscribeBot();
      if (unsubscribeTrades) unsubscribeTrades();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialLoad]);

  // --- DEBOUNCED LOCAL + CLOUD PERSISTENCE ---
  useEffect(() => {
    tradesRef.current = trades;
    botStateRef.current = botState;
    nebulaV5SettingsRef.current = nebulaV5Settings;
    hedgingSettingsRef.current = hedgingSettings;
    hftSettingsRef.current = hftSettings;

    storageService.saveTrades(trades);
    storageService.saveBotState(botState);
    storageService.saveLogs(logs);

    if (user && !isInitialLoad) {
      const timeoutId = setTimeout(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          databaseService.saveLogs(session.user.id, logs);
          databaseService.saveBotState(session.user.id, botState);
        }
      }, 3000);

      return () => clearTimeout(timeoutId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, botState, nebulaV5Settings, hedgingSettings, logs, user, isInitialLoad]);
};
