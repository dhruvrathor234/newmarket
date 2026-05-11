
import React, { useState, useEffect, useRef } from 'react';
import { storageService } from './services/storageService';
import WalletModal from './components/WalletModal';
import Navigation from './components/Navigation';
import LoginScreen from './components/LoginScreen';

import DashboardView from './components/views/DashboardView';
import TerminalView from './components/views/TerminalView';
import PortfolioView from './components/views/PortfolioView';
import IntelligenceView from './components/views/IntelligenceView';
import AssistantView from './components/views/AssistantView';
import ProfileView from './components/views/ProfileView';
import SubscriptionModal from './components/SubscriptionModal';

import { BotState, Trade, TradeType, RiskSettings, Symbol, View, MarketDetails, Alert, NebulaV5Settings, MarketAnalysis, AccountType, TradingMode, HedgingBotSettings, HFTBotSettings, UserStats, Candle, Transaction } from './types';
import { INITIAL_BALANCE, ASSETS, CRON_INTERVAL_MS } from './constants';
import { getMarketDetails, fetchCandles, initializePriceService } from './services/priceService';
import { analyzeNebulaV5 } from './services/nebulaV5Service';
import { analyzeHFTBot, calculateHFTLotSize } from './services/hftBotService';
import { analyzeMarket, evaluateCustomLogic } from './services/geminiService';
import { aiIntelligenceService } from './services/aiIntelligenceService';

import { supabase } from './lib/supabase';
import { binanceService } from './services/binanceService';
import { databaseService } from './services/databaseService';
import { billingService } from './services/billingService';

const App: React.FC = () => {
  const safeId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [showLogin, setShowLogin] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [pendingView, setPendingView] = useState<View | null>(null);

  const requestedViewRef = useRef<View | null>(null);

  const [activeSymbol, setActiveSymbol] = useState<Symbol>(() => {
    const saved = storageService.loadActiveSymbol();
    return (saved && ASSETS[saved]) ? saved : 'XAUUSD';
  });
  const [trades, setTrades] = useState<Trade[]>(() => storageService.loadTrades());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<MarketAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [logs, setLogs] = useState<any[]>(() => storageService.loadLogs());
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  
  const [botState, setBotState] = useState<BotState>(() => {
    const saved = storageService.loadBotState();
    const defaults: BotState = {
      isRunning: false,
      strategy: 'NEBULA_V5',
      balance: INITIAL_BALANCE,
      equity: INITIAL_BALANCE,
      paperBalance: INITIAL_BALANCE,
      paperEquity: INITIAL_BALANCE,
      realBalance: 0,
      realEquity: 0,
      lastRunTime: null,
      statusMessage: "System Standby",
      customLogic: "",
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
      isSubscribed: false
    };
    return saved ? { ...defaults, ...saved } : defaults;
  });

  const [nebulaV5Settings, setNebulaV5Settings] = useState<NebulaV5Settings>({
    basisType: 'ALMA',
    basisLen: 2,
    pivotPeriod: 5,
    offsetSigma: 5,
    offsetALMA: 0.85,
    timeframe: '5m'
  });

  const [hedgingSettings, setHedgingSettings] = useState<HedgingBotSettings>({
    initialLot: 0.02,
    lotMultiplier: 2.0,
    distancePips: 400,
    takeProfitPips: 400,
    stopLossPips: 600,
    waitAfterCloseSec: 60,
    netProfitTriggerAfterTrades: 5,
    profitTargetUSD: 5.0
  });

  const resetState = () => {
    storageService.clearSession();
    const defaults: BotState = {
      isRunning: false,
      strategy: 'NEBULA_V5',
      balance: INITIAL_BALANCE,
      equity: INITIAL_BALANCE,
      paperBalance: INITIAL_BALANCE,
      paperEquity: INITIAL_BALANCE,
      realBalance: 0,
      realEquity: 0,
      lastRunTime: null,
      statusMessage: "System Standby",
      customLogic: "",
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
      isSubscribed: false
    };
    setBotState(defaults);
    setTrades([]);
    setTransactions([]);
    storageService.saveBotState(defaults);
  };
  const [hftSettings, setHftSettings] = useState<HFTBotSettings>({
    slippage: 1,
    startHour: 0,
    endHour: 24,
    lotType: 'FIXED',
    fixedLot: 0.01,
    riskPercent: 1.0,
    delta: 50,
    maxDistance: 500,
    stopLoss: 100,
    maxTrailing: 100,
    maxSpread: 20
  });

  const [prices, setPrices] = useState<Record<Symbol, number>>(() => {
    const initial: any = {};
    (Object.keys(ASSETS) as Symbol[]).forEach(sym => { initial[sym] = ASSETS[sym].INITIAL_PRICE; });
    return initial;
  });

  const [marketDetails, setMarketDetails] = useState<Record<Symbol, MarketDetails>>(() => {
    const initial: any = {};
    (Object.keys(ASSETS) as Symbol[]).forEach(sym => {
      const price = ASSETS[sym].INITIAL_PRICE;
      initial[sym] = { price, bid: price, ask: price, high: price, low: price, volume: 0, change24h: 0, change24hPercent: 0, category: ASSETS[sym].CATEGORY };
    });
    return initial;
  });

  const [riskSettings, setRiskSettings] = useState<Record<Symbol, RiskSettings>>(() => {
    const initial: any = {};
    (Object.keys(ASSETS) as Symbol[]).forEach(sym => {
      initial[sym] = { riskPercentage: 1.0, stopLossDistance: ASSETS[sym].DEFAULT_STOP_LOSS, takeProfitDistance: ASSETS[sym].DEFAULT_TAKE_PROFIT };
    });
    return initial;
  });

  const [walletModal, setWalletModal] = useState<{ isOpen: boolean; type: 'deposit' | 'withdraw' }>({ isOpen: false, type: 'deposit' });
  const tradesRef = useRef(trades);
  const botStateRef = useRef(botState);
  const nebulaV5SettingsRef = useRef(nebulaV5Settings);
  const hedgingSettingsRef = useRef(hedgingSettings);
  const hftSettingsRef = useRef(hftSettings);
  const lastAnalysisTimeRef = useRef(0);
  const hedgingStateRef = useRef({
    tradingPaused: false,
    lastCloseTime: 0,
    entryBuyPrice: 0,
    entrySellPrice: 0,
    buyTriggered: false,
    sellTriggered: false,
    waitingForBuyTouch: false,
    waitingForSellTouch: false,
    fixedSL: 0,
    fixedTP: 0,
    lastOpenPositions: 0
  });

  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      console.error("[Global Error]", event.error || event.message);
      if (event.message.includes("Script error")) {
        console.warn("Script error detected. This is often due to cross-origin issues or blocked scripts.");
      }
    };
    window.addEventListener('error', handleGlobalError);
    return () => window.removeEventListener('error', handleGlobalError);
  }, []);

  const handleSetStrategy = (strategy: BotStrategy) => {
    setBotState(prev => ({ ...prev, strategy }));
  };

  const handleToggleBot = () => {
    setBotState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleSetTimeframe = (timeframe: string) => {
    setNebulaV5Settings(prev => ({ ...prev, timeframe }));
  };

  const handleRiskUpdate = (settings: RiskSettings) => {
    setRiskSettings(prev => ({ ...prev, [activeSymbol]: settings }));
  };

  const handleAddAlert = (price: number, type: 'ABOVE' | 'BELOW') => {
    const newAlert: Alert = { id: safeId(), symbol: activeSymbol, price, type, createdAt: Date.now() };
    setAlerts(prev => [...prev, newAlert]);
    addLog(`Alert Set: ${activeSymbol} ${type} ${price}`, 'info');
  };

  const handleRemoveAlert = (id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  const handleUpdateCustomLogic = (logic: string) => {
    setBotState(prev => ({ ...prev, customLogic: logic }));
  };

  const handleSetAccountType = (type: AccountType) => {
    setBotState(prev => ({ 
      ...prev, 
      accountType: type,
      balance: type === AccountType.REAL ? prev.realBalance : prev.paperBalance,
      equity: type === AccountType.REAL ? prev.realEquity : prev.paperEquity
    }));
  };

  const handleSetTradingMode = (mode: TradingMode) => {
    setBotState(prev => ({ ...prev, tradingMode: mode }));
  };

  const handleConnectBinance = (apiKey: string, apiSecret: string) => {
    const updated = { ...botState, binanceApiKey: apiKey, binanceApiSecret: apiSecret, isBinanceConnected: true };
    setBotState(updated);
    addLog("Binance Core Linked Successfully.", "success");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) databaseService.saveBotState(session.user.id, updated);
    });
  };

  const handleConnectMetaTrader = (accountId: string, masterPassword: string, server: string) => {
    const updated = { ...botState, mtAccountId: accountId, mtMasterPassword: masterPassword, mtServer: server, isMtConnected: true, connectionType: 'METATRADER' as const };
    setBotState(updated);
    addLog("MetaTrader Engine Linked.", "success");
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) databaseService.saveBotState(session.user.id, updated);
    });
  };

  const lastUidRef = useRef<string | null>(null);
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
          const { data: stats, error: statsError } = await supabase
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
              lastUpdated: stats.last_updated
            });
          } else {
            const initialStats: UserStats = {
              userId: supabaseUser.id,
              totalProfit: 0,
              totalFeesOwed: 0,
              totalFeesPaid: 0,
              amountOwed: 0,
              isLocked: false,
              lastUpdated: Date.now()
            };
            await supabase.from('user_stats').insert([{
              user_id: initialStats.userId,
              total_profit: initialStats.totalProfit,
              total_fees_owed: initialStats.totalFeesOwed,
              total_fees_paid: initialStats.totalFeesPaid,
              amount_owed: initialStats.amountOwed,
              is_locked: initialStats.isLocked,
              last_updated: initialStats.lastUpdated
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
              filter: `user_id=eq.${supabaseUser.id}` 
            }, payload => {
              const data = payload.new;
              setUserStats({
                userId: data.user_id,
                totalProfit: data.total_profit,
                totalFeesOwed: data.total_fees_owed,
                totalFeesPaid: data.total_fees_paid,
                amountOwed: data.amount_owed,
                isLocked: data.is_locked,
                lastUpdated: data.last_updated
              });
            })
            .subscribe();

          return () => {
            supabase.removeChannel(channel);
          };
        } catch (error: any) {
          console.error("Supabase Initialization Error:", error);
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
  }, []);

  // Load and Subscribe to data from Supabase when user logs in
  useEffect(() => {
    let unsubscribeBot: (() => void) | null = null;
    let unsubscribeTrades: (() => void) | null = null;

    const setupSubscriptions = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const currentUser = session?.user;

      if (user && currentUser && isInitialLoad) {
        try {
          const uid = currentUser.id;
          addLog("Establishing live cloud link...", "info");
          
          // Initial existence check and save if new user
          const initialBotState = await databaseService.loadBotState(uid);
          if (!initialBotState) {
            await databaseService.saveUser(uid, currentUser.email || "");
            await databaseService.saveBotState(uid, botState);
            addLog("Cloud profile initialized.", "success");
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
          addLog("Real-time cloud synchronization active.", "success");
        } catch (error) {
          console.error("Cloud subscription error:", error);
          addLog("Live link failed. operating in offline cache.", "warning");
        }
      }
    };

    setupSubscriptions();

    return () => {
      if (unsubscribeBot) unsubscribeBot();
      if (unsubscribeTrades) unsubscribeTrades();
    };
  }, [user, isInitialLoad]);

  // Sync data to Cloud (Debounced) - Only for logs and local persistence
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
        }
      }, 5000); 
      
      return () => clearTimeout(timeoutId);
    }
  }, [trades, botState, nebulaV5Settings, hedgingSettings, logs, user, isInitialLoad]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const newLog = {
        id: safeId(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

  const handleNavigate = (view: View) => {
    if (view === 'DASHBOARD') {
      setCurrentView(view);
      return;
    }
    
    if (!user) {
      requestedViewRef.current = view;
      setShowLogin(true);
      return;
    }

    const restrictedViews: View[] = ['TERMINAL', 'ASSISTANT', 'INTELLIGENCE'];
    if (restrictedViews.includes(view) && !botState.isSubscribed) {
      setPendingView(view);
      setIsSubscriptionModalOpen(true);
      addLog(`Access Restricted: ${view} requires an active subscription.`, "warning");
      return;
    }
    
    setCurrentView(view);
  };

  const handleCopyTrade = (analysis: MarketAnalysis) => {
    if (userStats?.isLocked) return;
    
    const risk = riskSettings[activeSymbol];
    const asset = ASSETS[activeSymbol];
    const riskAmount = (botState.balance * risk.riskPercentage) / 100;
    const calculatedLotSize = riskAmount / (risk.stopLossDistance * asset.CONTRACT_SIZE);
    const lotSize = Math.max(0.01, parseFloat(calculatedLotSize.toFixed(2)));

    let finalSL = risk.stopLossDistance;
    let finalTP = risk.takeProfitDistance;

    if (analysis.customParams?.stopLoss) {
      finalSL = Math.abs(analysis.customParams.stopLoss - prices[activeSymbol]);
    }
    if (analysis.customParams?.takeProfit) {
      finalTP = Math.abs(analysis.customParams.takeProfit - prices[activeSymbol]);
    }

    handleManualOpen(analysis.decision, lotSize, finalSL, finalTP);
    addLog(`AI Signal Copied: ${analysis.decision} on ${activeSymbol}`, 'success');
  };

  useEffect(() => {
    const updateCandles = async () => {
      try {
        const data = await fetchCandles(activeSymbol, nebulaV5Settings.timeframe);
        setCandles(data);
      } catch (error) {
        console.error("Error fetching candles for AI:", error);
      }
    };
    updateCandles();
    const interval = setInterval(updateCandles, 30000);
    return () => clearInterval(interval);
  }, [activeSymbol, nebulaV5Settings.timeframe]);

  const handleSubscriptionSuccess = async (plan: { name: string, price: number, method: string }) => {
    const safeId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    const updatedState = { ...botState, isSubscribed: true };
    setBotState(updatedState);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (user && session?.user) {
      databaseService.saveBotState(session.user.id, updatedState);
      
      const transaction: Transaction = {
        id: `TX-${safeId().substring(0,8).toUpperCase()}`,
        amount: plan.price,
        planName: plan.name,
        method: plan.method,
        status: 'COMPLETED',
        createdAt: Date.now()
      };
      
      databaseService.saveTransaction(session.user.id, transaction);
      setTransactions(prev => [transaction, ...prev]);
      addLog(`Payment Verified: ${plan.name} ($${plan.price}) activated via ${plan.method}`, "success");
    }

    setIsSubscriptionModalOpen(false);
    if (pendingView) {
      setCurrentView(pendingView);
      setPendingView(null);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentView('DASHBOARD');
      addLog("Signed out from Nebulamarket protocol.", "info");
    } catch (error) {
      addLog("Sign out failed: Link unstable.", "error");
    }
  };

  const mapSymbolToBinance = (sym: Symbol): string => {
    const mapping: Record<string, string> = {
      'BTCUSD': 'BTCUSDT',
      'ETHUSD': 'ETHUSDT',
      'SOLUSD': 'SOLUSDT',
      'DOGEUSD': 'DOGEUSDT',
      'XRPUSD': 'XRPUSDT',
      'ADAUSD': 'ADAUSDT',
      'AVAXUSD': 'AVAXUSDT',
      'DOTUSD': 'DOTUSDT',
      'LINKUSD': 'LINKUSDT',
      'LTCUSD': 'LTCUSDT',
      'XAUUSD': 'PAXGUSDT',
      'XAGUSD': 'XAGUSDT',
      'WTIUSD': 'WTIUSDT'
    };
    return mapping[sym] || sym;
  };

  const handleManualOpen = async (type: TradeType, lots: number, slDist: number, tpDist: number, limitPrice?: number, overrideDetails?: MarketDetails, leverage?: number, symbolOverride?: Symbol) => {
    const sym = symbolOverride || activeSymbol;
    const details = overrideDetails || marketDetails[sym];
    const fillPrice = limitPrice || (type === TradeType.BUY ? details.ask : details.bid);
    
    let sl = 0;
    let tp = 0;

    if (slDist > 0) {
        sl = type.includes('BUY') ? fillPrice - slDist : fillPrice + slDist;
    }
    if (tpDist > 0) {
        tp = type.includes('BUY') ? fillPrice + tpDist : fillPrice - tpDist;
    }

    const isLimit = !!limitPrice;
    const tradeType = isLimit ? (type === TradeType.BUY ? TradeType.LIMIT_BUY : TradeType.LIMIT_SELL) : type;

    let binanceOrderId: string | undefined;

    // REAL TRADING EXECUTION
    if (botState.accountType === AccountType.REAL) {
      if (botState.connectionType === 'BINANCE') {
        if (!botState.isBinanceConnected || !botState.binanceApiKey || !botState.binanceApiSecret) {
          addLog("Real Trading Failed: Binance not connected.", "error");
          return;
        }

        try {
          addLog(`Executing REAL ${isLimit ? 'LIMIT ' : ''}${type} order on Binance...`, "info");
          const binanceSymbol = mapSymbolToBinance(sym);
          const side = type === TradeType.BUY ? 'BUY' : 'SELL';
          const quantity = lots.toString();
          
          const order = await binanceService.placeOrder(
            botState.binanceApiKey,
            botState.binanceApiSecret,
            binanceSymbol,
            side,
            quantity,
            botState.tradingMode,
            isLimit ? 'LIMIT' : 'MARKET',
            limitPrice?.toString(),
            leverage
          );
          
          binanceOrderId = order.orderId?.toString();
          addLog(`Binance Order Executed: ID ${binanceOrderId}`, "success");
        } catch (error: any) {
          addLog(`Binance Order Failed: ${error.message}`, "error");
          return;
        }
      }
    }

    const newTrade: Trade = { 
        id: safeId(), 
        symbol: sym, 
        type: tradeType, 
        entryPrice: fillPrice, 
        limitPrice,
        lotSize: lots, 
        stopLoss: sl, 
        takeProfit: tp, 
        riskPercentage: 1, 
        openTime: isLimit ? 0 : Date.now(), 
        status: isLimit ? 'PENDING' : 'OPEN', 
        pnl: 0,
        accountType: botState.accountType,
        binanceOrderId
    };
    setTrades(prev => [...prev, newTrade]);
    const safePrice = (fillPrice || 0).toFixed(2);
    addLog(`Order Placed: ${tradeType} ${lots} lot ${sym} @ ${safePrice}`, 'info');
    
    const { data: { session } } = await supabase.auth.getSession();
    if (user && session?.user) {
      databaseService.saveTrades(session.user.id, [newTrade]);
      databaseService.saveBotState(session.user.id, botState);
    }
  };

  const handleManualClose = async (tradeId: string, overridePrice?: number) => {
    const trade = tradesRef.current.find(t => t.id === tradeId);
    if (!trade) return;

    if (trade.accountType === AccountType.REAL && trade.status === 'OPEN') {
      if (botState.connectionType === 'BINANCE') {
        try {
          addLog(`Closing REAL position on Binance for ${trade.symbol}...`, "info");
          const binanceSymbol = mapSymbolToBinance(trade.symbol);
          const side = trade.type.includes('BUY') ? 'SELL' : 'BUY';
          const quantity = (trade.lotSize * ASSETS[trade.symbol].CONTRACT_SIZE).toString();

          await binanceService.placeOrder(
            botState.binanceApiKey,
            botState.binanceApiSecret,
            binanceSymbol,
            side,
            quantity,
            botState.tradingMode,
            'MARKET'
          );
          addLog(`Binance Position Closed successfully.`, "success");
        } catch (error: any) {
          addLog(`Binance Closing Failed: ${error.message}`, "error");
        }
      }
    }

    setTrades(prev => {
      const t = prev.find(x => x.id === tradeId);
      if (!t) return prev;
      
      const closePrice = overridePrice || prices[t.symbol];
      const diff = t.type.includes('BUY') ? closePrice - t.entryPrice : t.entryPrice - closePrice;
      const realizedPnL = diff * ASSETS[t.symbol].CONTRACT_SIZE * t.lotSize;

      setBotState(prevBot => {
        const isReal = t.accountType === AccountType.REAL;
        const nextPaperBalance = isReal ? prevBot.paperBalance : prevBot.paperBalance + realizedPnL;
        const nextRealBalance = isReal ? prevBot.realBalance + realizedPnL : prevBot.realBalance;
        
        return { 
          ...prevBot, 
          paperBalance: nextPaperBalance,
          realBalance: nextRealBalance,
          balance: prevBot.accountType === AccountType.REAL ? nextRealBalance : nextPaperBalance
        };
      });
      
      addLog(`Position Closed: ${t.symbol} ${t.type} | PnL: $${(realizedPnL || 0).toFixed(2)}`, (realizedPnL || 0) >= 0 ? 'success' : 'warning');
      
      const updatedTrade = { ...t, status: 'CLOSED' as const, closeTime: Date.now(), closePrice, pnl: realizedPnL || 0 };
      
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          databaseService.saveTrades(session.user.id, [updatedTrade]);
          // Record trade for billing/tracking purposes
          billingService.recordTrade(session.user.id, realizedPnL || 0);
        }
      });

      return prev.map(x => x.id === tradeId ? updatedTrade : x);
    });
  };

  const handleUpdateTrade = (tradeId: string, newSL: number, newTP: number) => {
    setTrades(prev => prev.map(t => (t.id === tradeId ? { ...t, stopLoss: newSL, takeProfit: newTP } : t)));
    addLog(`Trade Updated: SL/TP Modified for ID ${tradeId.substring(0,8)}`, 'info');
  };

  const triggerAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    
    const strategy = botStateRef.current.strategy;
    let result: MarketAnalysis | null = null;

    if (strategy === 'SENTIMENT') {
        addLog(`Starting neural scan for ${activeSymbol}...`, 'info');
        setBotState(prev => ({ ...prev, statusMessage: "Scanning Global News..." }));
        result = await analyzeMarket(activeSymbol);
    } else if (strategy === 'CUSTOM_AI') {
        addLog(`Evaluating Custom Logic for ${activeSymbol}...`, 'info');
        setBotState(prev => ({ ...prev, statusMessage: "Compiling Logic..." }));
        result = await evaluateCustomLogic(activeSymbol, prices[activeSymbol], botStateRef.current.customLogic || '');
    } else if (strategy === 'NEBULA_V5') {
        addLog(`Running Nebula V5 Algorithm for ${activeSymbol}...`, 'info');
        setBotState(prev => ({ ...prev, statusMessage: "Computing Pivots..." }));
        const candles = await fetchCandles(activeSymbol, nebulaV5SettingsRef.current.timeframe);
        result = analyzeNebulaV5(candles, activeSymbol, nebulaV5SettingsRef.current);
    } else if (strategy === 'HFT_BOT') {
        addLog(`Running HFT Bot Logic for ${activeSymbol}...`, 'info');
        setBotState(prev => ({ ...prev, statusMessage: "Analyzing Market Speed..." }));
        const candles = await fetchCandles(activeSymbol, '1m'); 
        const spread = marketDetails[activeSymbol].ask - marketDetails[activeSymbol].bid;
        const point = 0.00001;
        const spreadInPoints = Math.round(spread / point);
        result = analyzeHFTBot(candles, activeSymbol, hftSettingsRef.current, spreadInPoints);
    } else if (strategy === 'AI_INTELLIGENCE') {
        addLog(`Deep AI Intelligence analysis for ${activeSymbol}...`, 'info');
        setBotState(prev => ({ ...prev, statusMessage: "Gemini Deep Scan..." }));
        const candles = await fetchCandles(activeSymbol, nebulaV5SettingsRef.current.timeframe);
        result = await aiIntelligenceService.analyzeMarket(activeSymbol, candles, nebulaV5SettingsRef.current.timeframe);
    }

    if (result) {
        setLastAnalysis(result);
        addLog(`${strategy} analysis complete. Decision: ${result.decision}`, 'info');
    }

    setIsAnalyzing(false);
    return result;
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      const newMarketDetails: any = {};
      const newPrices: any = {};
      
      (Object.keys(ASSETS) as Symbol[]).forEach(sym => {
        const details = getMarketDetails(sym);
        newMarketDetails[sym] = details;
        newPrices[sym] = details.price;
      });
      
      setMarketDetails(newMarketDetails);
      setPrices(newPrices);

      const now = Date.now();
      const currentBotState = botStateRef.current;
      
      if (currentBotState.isRunning) {
        if (currentBotState.strategy === 'HEDGING_BOT') {
          const hSettings = hedgingSettingsRef.current;
          const hState = hedgingStateRef.current;
          const symbolTrades = tradesRef.current.filter(t => t.symbol === activeSymbol && t.status === 'OPEN');
          const currentOpenCount = symbolTrades.length;
          const bid = newMarketDetails[activeSymbol].bid;
          const ask = newMarketDetails[activeSymbol].ask;

          if (hState.lastOpenPositions > 0 && currentOpenCount < hState.lastOpenPositions && !hState.tradingPaused) {
            addLog(`Hedging Bot: Trade closure detected. Closing all remaining positions.`, 'warning');
            symbolTrades.forEach(t => handleManualClose(t.id, newPrices[t.symbol]));
            hState.tradingPaused = true;
            hState.lastCloseTime = now;
            hState.buyTriggered = false;
            hState.sellTriggered = false;
            hState.waitingForBuyTouch = false;
            hState.waitingForSellTouch = false;
            hState.lastOpenPositions = 0;
          }
          hState.lastOpenPositions = currentOpenCount;

          if (hState.tradingPaused) {
            if (now - hState.lastCloseTime < hSettings.waitAfterCloseSec * 1000) return;
            hState.tradingPaused = false;
            addLog("Hedging Bot: Ready for new cycle.", "success");
          }

          if (currentOpenCount === 0) {
            hState.entryBuyPrice = ask + (hSettings.distancePips * 0.00001);
            hState.entrySellPrice = bid - (hSettings.distancePips * 0.00001);
            hState.waitingForBuyTouch = true;
            hState.waitingForSellTouch = true;
            hState.buyTriggered = false;
            hState.sellTriggered = false;
            hState.lastOpenPositions = 1; 

            handleManualOpen(TradeType.BUY, hSettings.initialLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
            handleManualOpen(TradeType.SELL, hSettings.initialLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
          } else if (currentOpenCount > 0) {
            const lastTrade = symbolTrades[symbolTrades.length - 1];
            if (bid <= hState.entrySellPrice && hState.waitingForSellTouch && !hState.sellTriggered) {
              const nextLot = lastTrade.lotSize * hSettings.lotMultiplier;
              handleManualOpen(TradeType.SELL, nextLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
              hState.sellTriggered = true;
              hState.waitingForSellTouch = false;
              hState.waitingForBuyTouch = true;
              hState.entryBuyPrice = ask + (hSettings.distancePips * 0.00001);
            } else if (ask >= hState.entryBuyPrice && hState.waitingForBuyTouch && !hState.buyTriggered) {
              const nextLot = lastTrade.lotSize * hSettings.lotMultiplier;
              handleManualOpen(TradeType.BUY, nextLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
              hState.buyTriggered = true;
              hState.waitingForBuyTouch = false;
              hState.waitingForSellTouch = true;
              hState.entrySellPrice = bid - (hSettings.distancePips * 0.00001);
            }

            const totalPnL = symbolTrades.reduce((acc, t) => acc + t.pnl, 0);
            if (currentOpenCount >= hSettings.netProfitTriggerAfterTrades && totalPnL >= hSettings.profitTargetUSD) {
              addLog(`Hedging Bot: Profit target $${hSettings.profitTargetUSD} reached ($${totalPnL.toFixed(2)}). Closing cycle.`, 'success');
              symbolTrades.forEach(t => handleManualClose(t.id, newPrices[t.symbol]));
              hState.tradingPaused = true;
              hState.lastCloseTime = now;
            }
          }
        } else if (now - lastAnalysisTimeRef.current > CRON_INTERVAL_MS) {
            lastAnalysisTimeRef.current = now;
            triggerAnalysis().then(analysis => {
                if (analysis && (analysis.decision === TradeType.BUY || analysis.decision === TradeType.SELL)) {
                    const risk = riskSettings[activeSymbol];
                    const asset = ASSETS[activeSymbol];
                    const riskAmount = (currentBotState.balance * risk.riskPercentage) / 100;
                    const calculatedLotSize = riskAmount / (risk.stopLossDistance * asset.CONTRACT_SIZE);
                    const lotSize = Math.max(0.01, parseFloat(calculatedLotSize.toFixed(2)));
                    handleManualOpen(analysis.decision, lotSize, risk.stopLossDistance, risk.takeProfitDistance);
                }
            });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSymbol]);

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100 flex flex-col font-sans overflow-hidden">
      <Navigation currentView={currentView} onNavigate={handleNavigate} userEmail={user?.email || ''} onLogout={handleLogout} />
      
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#3b82f615,transparent_50%)] pointer-events-none"></div>
        {currentView === 'DASHBOARD' && (
          <DashboardView 
            botState={botState}
            trades={trades}
            prices={prices}
            marketDetails={marketDetails}
            activeSymbol={activeSymbol}
            onNavigate={handleNavigate} 
            onSelectSymbol={setActiveSymbol}
          />
        )}
        {currentView === 'TERMINAL' && (
          <TerminalView 
            symbol={activeSymbol}
            prices={prices}
            marketDetails={marketDetails}
            trades={trades}
            riskSettings={riskSettings[activeSymbol]}
            balance={botState.balance}
            botState={botState}
            onRiskUpdate={handleRiskUpdate}
            onManualTrade={handleManualOpen}
            onCloseTrade={handleManualClose}
            onUpdateTrade={handleUpdateTrade}
            isBotActive={botState.isRunning}
            onToggleBot={handleToggleBot}
            isAnalyzing={isAnalyzing}
            onAnalyze={triggerAnalysis}
            activeStrategy={botState.strategy}
            onSetStrategy={handleSetStrategy}
            selectedTimeframe={nebulaV5Settings.timeframe}
            onSetTimeframe={handleSetTimeframe}
            onOpenDeposit={() => setWalletModal({ isOpen: true, type: 'deposit' })}
            onOpenWithdraw={() => setWalletModal({ isOpen: true, type: 'withdraw' })}
            onSelectSymbol={setActiveSymbol}
            alerts={alerts.filter(a => a.symbol === activeSymbol)}
            onAddAlert={handleAddAlert}
            onRemoveAlert={handleRemoveAlert}
            nebulaV5Settings={nebulaV5Settings}
            onUpdateNebulaV5Settings={setNebulaV5Settings}
            hedgingSettings={hedgingSettings}
            onUpdateHedgingSettings={setHedgingSettings}
            hftSettings={hftSettings}
            onUpdateHFTSettings={setHftSettings}
            logs={logs}
            onUpdateCustomLogic={handleUpdateCustomLogic}
            onSetAccountType={handleSetAccountType}
            onSetTradingMode={handleSetTradingMode}
            onConnectBinance={handleConnectBinance}
            onConnectMetaTrader={handleConnectMetaTrader}
            onCopyTrade={handleCopyTrade}
            lastAnalysis={lastAnalysis}
            candles={candles}
            isLocked={userStats?.isLocked}
          />
        )}
        {currentView === 'PORTFOLIO' && (
          <PortfolioView 
            trades={trades} 
            prices={prices}
            onCloseTrade={handleManualClose}
            onUpdateTrade={handleUpdateTrade}
            accountType={botState.accountType}
            balance={botState.balance} 
            equity={botState.equity} 
          />
        )}
        {currentView === 'INTELLIGENCE' && (
          <IntelligenceView 
            activeSymbol={activeSymbol}
            analysis={lastAnalysis}
            isAnalyzing={isAnalyzing}
            onAnalyze={triggerAnalysis}
            logs={logs}
            activeStrategy={botState.strategy}
          />
        )}
        {currentView === 'ASSISTANT' && <AssistantView activeSymbol={activeSymbol} marketDetails={marketDetails[activeSymbol]} trades={trades} />}
        {currentView === 'PROFILE' && (
          <ProfileView 
            userEmail={user?.email || ''} 
            botState={botState} 
            userStats={userStats}
            transactions={transactions}
            onConnectBinance={(apiKey, apiSecret) => {
              const updatedState = { ...botState, binanceApiKey: apiKey, binanceApiSecret: apiSecret, isBinanceConnected: true };
              setBotState(updatedState);
              supabase.auth.getSession().then(({ data: { session } }) => {
                if (session?.user) {
                  databaseService.saveBotState(session.user.id, updatedState);
                }
              });
              addLog("Binance API keys synchronized successfully.", "success");
            }}
            onLogout={handleLogout}
          />
        )}
      </main>

      <SubscriptionModal 
        isOpen={isSubscriptionModalOpen} 
        onClose={() => setIsSubscriptionModalOpen(false)} 
        onSuccess={handleSubscriptionSuccess}
      />

      <WalletModal 
        isOpen={walletModal.isOpen}
        type={walletModal.type}
        onClose={() => setWalletModal({ ...walletModal, isOpen: false })}
        balance={botState.balance}
        accountType={botState.accountType}
        onTransaction={(amount) => {
          const realizedPnL = walletModal.type === 'deposit' ? amount : -amount;
          setBotState(prev => {
             const isReal = prev.accountType === AccountType.REAL;
             const nextPaperBalance = isReal ? prev.paperBalance : prev.paperBalance + realizedPnL;
             const nextRealBalance = isReal ? prev.realBalance + realizedPnL : prev.realBalance;
             return { ...prev, paperBalance: nextPaperBalance, realBalance: nextRealBalance, balance: isReal ? nextRealBalance : nextPaperBalance };
          });
          const transaction: Transaction = {
            id: `TX-${safeId().substring(0,8).toUpperCase()}`,
            amount,
            planName: walletModal.type === 'deposit' ? 'Wallet Deposit' : 'Wallet Withdrawal',
            method: 'EXTERNAL_WALLET',
            status: 'COMPLETED',
            createdAt: Date.now()
          };
          setTransactions(prev => [transaction, ...prev]);
          addLog(`${walletModal.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of $${amount} successful.`, "success");
          
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              databaseService.saveTransaction(session.user.id, transaction);
              databaseService.saveBotState(session.user.id, botState);
            }
          });
        }}
      />

      {showLogin && <LoginScreen onLogin={(email) => { setUser({ email }); setShowLogin(false); }} onCancel={() => setShowLogin(false)} />}
    </div>
  );
};

export default App;
