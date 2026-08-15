import React, { useState, useEffect, useRef } from 'react';
import { storageService } from './services/storageService';
import WalletModal from './components/WalletModal';
import Navigation from './components/Navigation';
import LoginScreen from './components/LoginScreen';

import DashboardView from './components/views/DashboardView';
import TerminalView from './components/views/TerminalView';
import PortfolioView from './components/views/PortfolioView';
import IntelligenceView from './components/views/IntelligenceView';
import ProfileView from './components/views/ProfileView';
import SubscriptionModal from './components/SubscriptionModal';

import { BotState, Trade, TradeType, RiskSettings, Symbol, View, MarketDetails, Alert, NebulaV5Settings, MarketAnalysis, AccountType, TradingMode, HedgingBotSettings, HFTBotSettings, UserStats, Candle, Transaction, BotStrategy } from './types';
import { INITIAL_BALANCE, ASSETS } from './config/constants';
import { fetchCandles, initializePriceService } from './services/priceService';
import { analyzeNebulaV5 } from './services/nebulaV5Service';
import { analyzeHFTBot } from './services/hftBotService';
import { analyzeMarket, evaluateCustomLogic } from './services/geminiService';
import { aiIntelligenceService } from './services/aiIntelligenceService';
import { applyBalanceChange, calculatePnL, calculateRiskBasedLotSize, mapSymbolToBinance } from './services/orderService';
import { useCloudSync } from './hooks/useCloudSync';
import { useBotLoop } from './hooks/useBotLoop';

import { supabase, clearSupabaseCookies } from './lib/supabase';
import { binanceService } from './services/binanceService';
import { databaseService } from './services/databaseService';
import { billingService } from './services/billingService';
import { apiRequest } from './services/apiClient';

// --- URL routing: every section has its own path so a refresh keeps you on the same page ---
const VIEW_PATHS: Record<View, string> = {
  DASHBOARD: '/',
  TERMINAL: '/terminal',
  INTELLIGENCE: '/analytics',
  ASSISTANT: '/assistant',
  PORTFOLIO: '/portfolio',
  PROFILE: '/profile',
  BUILDER: '/builder',
};

const viewFromPath = (): View => {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  return (Object.keys(VIEW_PATHS) as View[]).find(v => VIEW_PATHS[v] === path) ?? 'DASHBOARD';
};

const App: React.FC = () => {
  const safeId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentView, setCurrentView] = useState<View>(() => viewFromPath());
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

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const newLog = {
        id: safeId(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message,
        type
    };
    setLogs(prev => [...prev.slice(-49), newLog]);
  };

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

  const navigateTo = (view: View) => {
    setCurrentView(view);
    const path = VIEW_PATHS[view];
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
  };

  // Keep the view in sync with the browser back/forward buttons
  useEffect(() => {
    const onPopState = () => setCurrentView(viewFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleNavigate = (view: View) => {
    if (view === 'DASHBOARD') {
      navigateTo(view);
      return;
    }
    
    if (!user) {
      requestedViewRef.current = view;
      setShowLogin(true);
      return;
    }

    const restrictedViews: View[] = ['TERMINAL', 'INTELLIGENCE'];
    if (restrictedViews.includes(view) && !botState.isSubscribed) {
      setPendingView(view);
      setIsSubscriptionModalOpen(true);
      addLog(`Access Restricted: ${view} requires an active subscription.`, "warning");
      return;
    }
    
    navigateTo(view);
  };

  const handleCopyTrade = (analysis: MarketAnalysis) => {
    if (userStats?.isLocked) return;
    
    const risk = riskSettings[activeSymbol];
    const asset = ASSETS[activeSymbol];
    const lotSize = calculateRiskBasedLotSize(botState.balance, risk.riskPercentage, risk.stopLossDistance, asset.CONTRACT_SIZE);

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

  const handleSubscriptionSuccess = async (plan: { name: string, price: number, method: string, periodEnd?: string | null }) => {
    // Server recorded the grant; the new expiry is authoritative (null => keep server truth).
    const updatedState = {
      ...botState,
      isSubscribed: true,
      subscriptionPlan: plan.name,
      subscriptionEndsAt: plan.periodEnd ?? botState.subscriptionEndsAt ?? null,
    };
    setBotState(updatedState);
    
    const { data: { session } } = await supabase.auth.getSession();
    if (user && session?.user) {
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
      addLog(`Payment Verified: ${plan.name} (₹${plan.price}) activated via ${plan.method}`, "success");
    }

    setIsSubscriptionModalOpen(false);
    if (pendingView) {
      navigateTo(pendingView);
      setPendingView(null);
    }
  };

  // Keep subscription state in sync with the server (single source of truth).
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiRequest('/api/payments/subscription-status')
      .then(r => r.json())
      .then((status: any) => {
        if (cancelled || !status) return;
        setBotState(prev => {
          const serverEnd = status.periodEnd ?? prev.subscriptionEndsAt ?? null;
          const active = !!serverEnd && new Date(serverEnd).getTime() > Date.now();
          return {
            ...prev,
            subscriptionPlan: status.planName ?? prev.subscriptionPlan ?? null,
            subscriptionBillingCycle: status.billingCycle ?? prev.subscriptionBillingCycle ?? null,
            subscriptionEndsAt: serverEnd,
            isSubscribed: active,
          };
        });
      })
      .catch(() => { /* offline / not configured — keep local state */ });
    return () => { cancelled = true; };
  }, [user?.email]);

  // When the active subscription lapses, lock restricted views and re-prompt for renewal.
  useEffect(() => {
    if (!user) return;
    const checkExpiry = () => {
      const end = botState.subscriptionEndsAt;
      if (end && new Date(end).getTime() <= Date.now() && botState.isSubscribed) {
        setBotState(prev => ({ ...prev, isSubscribed: false }));
        setIsSubscriptionModalOpen(true);
        addLog('Subscription expired. Renew to continue trading.', 'warning');
      }
    };
    checkExpiry();
    const timer = setInterval(checkExpiry, 60_000);
    return () => clearInterval(timer);
  }, [user?.email, botState.subscriptionEndsAt, botState.isSubscribed]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      addLog("Signed out from Supabase auth.", "info");
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      clearSupabaseCookies();
      navigateTo('DASHBOARD');
      addLog("Local session cleared. Protocol reset.", "success");
      // Hard refresh to ensure all states and listeners are cleared
      window.location.href = '/'; 
    }
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
      const realizedPnL = calculatePnL(t.type, t.entryPrice, closePrice, ASSETS[t.symbol].CONTRACT_SIZE, t.lotSize);

      setBotState(prevBot => applyBalanceChange(prevBot, realizedPnL, t.accountType === AccountType.REAL));
      
      addLog(`Position Closed: ${t.symbol} ${t.type} | PnL: $${(realizedPnL || 0).toFixed(2)}`, (realizedPnL || 0) >= 0 ? 'success' : 'warning');
      
      const updatedTrade = { ...t, status: 'CLOSED' as const, closeTime: Date.now(), closePrice, pnl: realizedPnL || 0 };
      
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          databaseService.saveTrades(session.user.id, [updatedTrade]);
          // Record trade for billing/tracking purposes
          billingService.recordTrade(session.user.id, realizedPnL || 0);

          // Save the updated botState (with new balance/equity) to database
          const nextBotState = applyBalanceChange(botState, realizedPnL, t.accountType === AccountType.REAL);
          databaseService.saveBotState(session.user.id, nextBotState);
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

  // Cloud sync: auth listener, subscriptions, debounced persistence
  useCloudSync({
    user,
    isInitialLoad,
    setIsInitialLoad,
    setUser,
    setUserStats,
    setTrades,
    setTransactions,
    setBotState,
    setCurrentView: navigateTo,
    requestedViewRef,
    tradesRef,
    botStateRef,
    nebulaV5SettingsRef,
    hedgingSettingsRef,
    hftSettingsRef,
    botState,
    trades,
    logs,
    nebulaV5Settings,
    hedgingSettings,
    hftSettings,
    addLog,
  });

  // Price tick + auto-bot loop
  useBotLoop({
    activeSymbol,
    riskSettings,
    setMarketDetails,
    setPrices,
    botStateRef,
    tradesRef,
    hedgingSettingsRef,
    onManualOpen: handleManualOpen,
    onManualClose: handleManualClose,
    onAnalyze: triggerAnalysis,
    addLog,
  });

  return (
    <div className="min-h-screen bg-[#0b0c10] text-gray-100 flex flex-col font-sans overflow-hidden">
      <Navigation 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        onOpenLogin={() => setShowLogin(true)}
        userEmail={user?.email || ''} 
        onLogout={handleLogout} 
      />
      
      <main className="flex-1 overflow-hidden relative pt-16">
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
          const isReal = botState.accountType === AccountType.REAL;
          setBotState(applyBalanceChange(botState, realizedPnL, isReal));

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
              databaseService.saveBotState(session.user.id, applyBalanceChange(botState, realizedPnL, isReal));
            }
          });
        }}
      />

      {showLogin && <LoginScreen onLogin={(email) => { setUser({ email }); setShowLogin(false); }} onCancel={() => setShowLogin(false)} />}
    </div>
  );
};

export default App;
