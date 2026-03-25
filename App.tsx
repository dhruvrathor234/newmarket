
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
import SubscriptionView from './components/views/SubscriptionView';

import { BotState, Trade, TradeType, RiskSettings, Symbol, View, MarketDetails, Alert, NebulaV5Settings, MarketAnalysis, AccountType, TradingMode, HedgingBotSettings, HFTBotSettings, UserStats } from './types';
import { INITIAL_BALANCE, ASSETS, CRON_INTERVAL_MS } from './constants';
import { getMarketDetails, fetchCandles } from './services/priceService';
import { analyzeNebulaV5 } from './services/nebulaV5Service';
import { analyzeHFTBot, calculateHFTLotSize } from './services/hftBotService';
import { analyzeMarket, evaluateCustomLogic } from './services/geminiService';

import { auth, db } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, addDoc, updateDoc, onSnapshot, query, where, orderBy } from 'firebase/firestore';
import { binanceService } from './services/binanceService';
import { databaseService } from './services/databaseService';

const App: React.FC = () => {
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [showLogin, setShowLogin] = useState(false);
  const [requestedView, setRequestedView] = useState<View | null>(null);

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
    return saved || {
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
      isBinanceConnected: false
    };
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
    magicNumber: 12345,
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

  const recordTradeToFirestore = async (trade: Trade, realizedPnL: number) => {
    if (!auth.currentUser || trade.accountType !== AccountType.REAL) return;

    try {
      const tradeData = {
        userId: auth.currentUser.uid,
        symbol: trade.symbol,
        type: trade.type,
        entryPrice: trade.entryPrice,
        exitPrice: trade.closePrice || 0,
        quantity: trade.lotSize,
        profit: realizedPnL,
        fees: Math.abs(realizedPnL * 0.001), // Simplified fee estimation
        timestamp: new Date().toISOString(),
        status: 'CLOSED'
      };

      await addDoc(collection(db, 'trades'), tradeData);

      // Update User Stats
      const statsRef = doc(db, 'user_stats', auth.currentUser.uid);
      const statsSnap = await getDoc(statsRef);
      if (statsSnap.exists()) {
        const currentStats = statsSnap.data() as UserStats;
        const newTotalProfit = currentStats.totalProfit + realizedPnL;
        // Fee is 20% of net profit. If net profit is negative, fee owed is 0.
        const newTotalFeesOwed = Math.max(0, newTotalProfit * 0.2);
        const newAmountOwed = Math.max(0, newTotalFeesOwed - currentStats.totalFeesPaid);
        
        // Soft lock if user owes more than $5 (example threshold)
        const isLocked = newAmountOwed > 5;

        await updateDoc(statsRef, {
          totalProfit: newTotalProfit,
          totalFeesOwed: newTotalFeesOwed,
          amountOwed: newAmountOwed,
          isLocked: isLocked,
          lastUpdated: Date.now()
        });
      }
    } catch (error) {
      console.error("Error recording trade to Firestore:", error);
    }
  };

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

  useEffect(() => {
    let unsubStats: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser && firebaseUser.emailVerified) {
        setUser({ email: firebaseUser.email || '' });
        
        try {
          // Fetch or Initialize User Stats
          const statsRef = doc(db, 'user_stats', firebaseUser.uid);
          const statsSnap = await getDoc(statsRef);
          
          if (statsSnap.exists()) {
            setUserStats(statsSnap.data() as UserStats);
          } else {
            const initialStats: UserStats = {
              userId: firebaseUser.uid,
              totalProfit: 0,
              totalFeesOwed: 0,
              totalFeesPaid: 0,
              amountOwed: 0,
              isLocked: false,
              subscriptionActive: false,
              trialStart: new Date().toISOString(),
              trialEnd: new Date(Date.now() - 1000).toISOString(), // Set to past so it's not active by default
              lastUpdated: Date.now()
            };
            await setDoc(statsRef, initialStats);
            setUserStats(initialStats);
          }

          // Listen for real-time updates to stats (e.g. when payment is made)
          unsubStats = onSnapshot(statsRef, (doc) => {
            if (doc.exists()) {
              setUserStats(doc.data() as UserStats);
            }
          }, (error) => {
            console.error("Firestore Stats Stream Error:", error);
            if (error.message.includes("offline")) {
              addLog("Cloud link unstable. Operating in local mode.", "warning");
            }
          });
        } catch (error: any) {
          console.error("Firestore Initialization Error:", error);
          if (error.message.includes("offline")) {
            addLog("Cloud terminal offline. Check your connection.", "error");
          }
        }

        if (requestedViewRef.current) {
          setCurrentView(requestedViewRef.current);
          requestedViewRef.current = null;
        }
      } else {
        setUser(null);
        setUserStats(null);
        setIsInitialLoad(true);
        if (unsubStats) {
          unsubStats();
          unsubStats = null;
        }
      }
    });
    return () => {
      unsubscribe();
      if (unsubStats) unsubStats();
    };
  }, []);

  // Load data from Supabase when user logs in
  useEffect(() => {
    const loadCloudData = async () => {
      if (user && auth.currentUser && isInitialLoad) {
        try {
          const uid = auth.currentUser!.uid;
          addLog("Connecting to cloud terminal...", "info");
          
          const [dbBotState, dbTrades, dbLogs] = await Promise.all([
            databaseService.loadBotState(uid),
            databaseService.loadTrades(uid),
            databaseService.loadLogs(uid)
          ]);

          if (dbBotState) {
            setBotState(dbBotState);
          } else {
            // First time user on this cloud, initialize their profile
            await databaseService.saveUser(uid, auth.currentUser!.email || "");
            await databaseService.saveBotState(uid, botState);
          }
          
          if (dbTrades && dbTrades.length > 0) setTrades(dbTrades);
          if (dbLogs && dbLogs.length > 0) setLogs(dbLogs);
          
          setIsInitialLoad(false);
          addLog("Cloud synchronization complete.", "success");
        } catch (error) {
          console.error("Supabase sync error:", error);
          addLog("Cloud sync link unstable. Retrying...", "warning");
          // Don't set isInitialLoad to false yet, let it retry or stay local
        }
      }
    };
    loadCloudData();
  }, [user, isInitialLoad, auth.currentUser]);

  // Save data to Supabase (Debounced)
  useEffect(() => { 
    tradesRef.current = trades; 
    botStateRef.current = botState;
    nebulaV5SettingsRef.current = nebulaV5Settings;
    hedgingSettingsRef.current = hedgingSettings;
    hftSettingsRef.current = hftSettings;
    
    storageService.saveTrades(trades);
    storageService.saveBotState(botState);
    storageService.saveLogs(logs);

    // Sync to Supabase if logged in and initial load is done
    if (user && auth.currentUser && !isInitialLoad) {
      const timeoutId = setTimeout(() => {
        const uid = auth.currentUser!.uid;
        databaseService.saveTrades(uid, trades);
        databaseService.saveBotState(uid, botState);
        databaseService.saveLogs(uid, logs);
        databaseService.updateBalance(uid, botState.balance);
      }, 2000); // 2 second debounce to prevent spamming
      
      return () => clearTimeout(timeoutId);
    }
  }, [trades, botState, nebulaV5Settings, hedgingSettings, logs, user, isInitialLoad]);

  const addLog = (message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info') => {
    const newLog = {
        id: crypto.randomUUID(),
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

    // Subscription Access Control
    if (view === 'INTELLIGENCE' || view === 'ASSISTANT') {
      const now = new Date();
      const trialEnd = userStats?.trialEnd ? new Date(userStats.trialEnd) : null;
      const subExpiry = userStats?.subscriptionExpiry ? new Date(userStats.subscriptionExpiry) : null;
      const isSubActive = userStats?.subscriptionActive || false;

      const hasTrial = trialEnd && now < trialEnd;
      const hasSub = isSubActive && subExpiry && now < subExpiry;

      if (!hasTrial && !hasSub) {
        addLog("Access Denied: Subscription required for AI features.", "warning");
        setCurrentView('SUBSCRIPTION');
        return;
      }
    }

    setCurrentView(view);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
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

  const handleManualOpen = async (type: TradeType, lots: number, slDist: number, tpDist: number, limitPrice?: number, overrideDetails?: MarketDetails, leverage?: number) => {
    const sym = activeSymbol;
    const details = overrideDetails || marketDetails[sym];
    const fillPrice = limitPrice || (type === TradeType.BUY ? details.ask : details.bid);
    
    // Safety check for SL/TP price levels instead of just distance
    let sl = 0;
    let tp = 0;

    // If distances are provided, calculate based on entry
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
      if (!botState.isBinanceConnected || !botState.binanceApiKey || !botState.binanceApiSecret) {
        addLog("Real Trading Failed: Binance not connected.", "error");
        return;
      }

      try {
        addLog(`Executing REAL ${isLimit ? 'LIMIT ' : ''}${type} order on Binance...`, "info");
        const binanceSymbol = mapSymbolToBinance(sym);
        const side = type === TradeType.BUY ? 'BUY' : 'SELL';
        
        // For real account, lots is already the asset quantity from OrderPanel
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
        return; // Don't add to local trades if real execution failed
      }
    }

    const newTrade: Trade = { 
        id: crypto.randomUUID(), 
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
    addLog(`Order Placed: ${tradeType} ${lots} lot ${sym} @ ${fillPrice.toFixed(2)}`, 'info');
  };

  const handleManualClose = async (tradeId: string, overridePrice?: number) => {
    const trade = tradesRef.current.find(t => t.id === tradeId);
    if (!trade) return;

    // REAL TRADING CLOSURE
    if (trade.accountType === AccountType.REAL && trade.status === 'OPEN') {
      if (!botState.isBinanceConnected || !botState.binanceApiKey || !botState.binanceApiSecret) {
        addLog("Real Closing Failed: Binance not connected.", "error");
        return;
      }

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
        // We'll still close it locally to avoid UI mismatch, but warn the user
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
      
      addLog(`Position Closed: ${t.symbol} ${t.type} | PnL: $${realizedPnL.toFixed(2)}`, realizedPnL >= 0 ? 'success' : 'warning');
      
      const updatedTrade = { ...t, status: 'CLOSED' as const, closeTime: Date.now(), closePrice, pnl: realizedPnL };
      recordTradeToFirestore(updatedTrade, realizedPnL);

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
        const candles = await fetchCandles(activeSymbol, '1m'); // HFT usually works on low timeframes
        const spread = marketDetails[activeSymbol].ask - marketDetails[activeSymbol].bid;
        const point = 0.00001;
        const spreadInPoints = Math.round(spread / point);
        result = analyzeHFTBot(candles, activeSymbol, hftSettingsRef.current, spreadInPoints);
    }

    if (result) {
        setLastAnalysis(result);
        addLog(`${strategy} analysis complete. Decision: ${result.decision}`, 'info');
        if (result.reasoning) addLog(`AI reasoning: ${result.reasoning.substring(0, 60)}...`, 'info');
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
        // HEDGING BOT STRATEGY
        if (currentBotState.strategy === 'HEDGING_BOT') {
          const hSettings = hedgingSettingsRef.current;
          const hState = hedgingStateRef.current;
          const symbolTrades = tradesRef.current.filter(t => t.symbol === activeSymbol && t.status === 'OPEN');
          const currentOpenCount = symbolTrades.length;
          const bid = newMarketDetails[activeSymbol].bid;
          const ask = newMarketDetails[activeSymbol].ask;
          const point = 0.00001; // Assuming 5 decimal places for Gold/Forex, adjust if needed

          // Detect if any trade was just closed (manual, TP, SL)
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

          // Pause logic
          if (hState.tradingPaused) {
            if (now - hState.lastCloseTime < hSettings.waitAfterCloseSec * 1000) {
              // Still paused
            } else {
              hState.tradingPaused = false;
              addLog(`Hedging Bot: Cooldown finished. Resuming...`, 'info');
            }
          }

          if (!hState.tradingPaused) {
            // Check Net Profit Target
            if (currentOpenCount >= hSettings.netProfitTriggerAfterTrades) {
              const netProfit = symbolTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
              if (netProfit >= hSettings.profitTargetUSD) {
                addLog(`Hedging Bot: Profit target reached ($${netProfit.toFixed(2)}). Closing all.`, 'success');
                symbolTrades.forEach(t => handleManualClose(t.id, newPrices[t.symbol]));
                hState.tradingPaused = true;
                hState.lastCloseTime = now;
                hState.buyTriggered = false;
                hState.sellTriggered = false;
                hState.waitingForBuyTouch = false;
                hState.waitingForSellTouch = false;
                hState.lastOpenPositions = 0;
              }
            }

            // Execution Logic
            if (currentOpenCount === 0) {
              const buyPrice = ask;
              const sellPrice = buyPrice - hSettings.distancePips * point;
              const sl = buyPrice - hSettings.stopLossPips * point;
              const tp = buyPrice + hSettings.takeProfitPips * point;

              handleManualOpen(TradeType.BUY, hSettings.initialLot, sl, tp, undefined, newMarketDetails[activeSymbol]);
              hState.entryBuyPrice = buyPrice;
              hState.entrySellPrice = sellPrice;
              hState.fixedSL = sl;
              hState.fixedTP = tp;
              hState.buyTriggered = true;
              hState.sellTriggered = false;
              hState.waitingForSellTouch = true;
              hState.waitingForBuyTouch = false;
              addLog(`Hedging Bot: Initial sequence started with BUY.`, 'info');
            } else {
              const lastLot = hSettings.initialLot * Math.pow(hSettings.lotMultiplier, currentOpenCount);

              if (hState.buyTriggered && hState.waitingForSellTouch && bid <= hState.entrySellPrice) {
                handleManualOpen(TradeType.SELL, lastLot, hState.fixedTP, hState.fixedSL, undefined, newMarketDetails[activeSymbol]);
                hState.sellTriggered = true;
                hState.buyTriggered = false;
                hState.waitingForSellTouch = false;
                hState.waitingForBuyTouch = true;
                addLog(`Hedging Bot: Hedge SELL triggered at ${bid.toFixed(2)}`, 'info');
              } else if (hState.sellTriggered && hState.waitingForBuyTouch && ask >= hState.entryBuyPrice) {
                handleManualOpen(TradeType.BUY, lastLot, hState.fixedSL, hState.fixedTP, undefined, newMarketDetails[activeSymbol]);
                hState.buyTriggered = true;
                hState.sellTriggered = false;
                hState.waitingForBuyTouch = false;
                hState.waitingForSellTouch = true;
                addLog(`Hedging Bot: Hedge BUY triggered at ${ask.toFixed(2)}`, 'info');
              }
            }
          }
        } else if (now - lastAnalysisTimeRef.current > CRON_INTERVAL_MS) {
          // Shared strategy execution logic (Existing bots)
          lastAnalysisTimeRef.current = now;
          const analysis = await triggerAnalysis();
          
          if (analysis && analysis.decision !== TradeType.HOLD) {
            const openTrades = tradesRef.current.filter(t => t.symbol === activeSymbol && t.status === 'OPEN');
            const hasBuy = openTrades.some(t => t.type === TradeType.BUY);
            const hasSell = openTrades.some(t => t.type === TradeType.SELL);

            const executeTrade = () => {
              const risk = riskSettings[activeSymbol];
              const asset = ASSETS[activeSymbol];
              const point = 0.00001;
              
              let lotSize: number;
              let finalSL: number;
              let finalTP: number;

              if (currentBotState.strategy === 'HFT_BOT') {
                const hft = hftSettingsRef.current;
                lotSize = calculateHFTLotSize(currentBotState.balance, hft, newPrices[activeSymbol]);
                finalSL = hft.stopLoss * point;
                finalTP = 0; // HFT uses trailing stop
              } else {
                const riskAmount = (currentBotState.balance * risk.riskPercentage) / 100;
                const calculatedLotSize = riskAmount / (risk.stopLossDistance * asset.CONTRACT_SIZE);
                lotSize = analysis.customParams?.lotSize || Math.max(0.01, parseFloat(calculatedLotSize.toFixed(2)));
                
                finalSL = risk.stopLossDistance;
                finalTP = risk.takeProfitDistance;

                if (analysis.customParams?.stopLoss) {
                  finalSL = Math.abs(analysis.customParams.stopLoss - newPrices[activeSymbol]);
                }
                if (analysis.customParams?.takeProfit) {
                  finalTP = Math.abs(analysis.customParams.takeProfit - newPrices[activeSymbol]);
                }
              }

              handleManualOpen(analysis.decision, lotSize, finalSL, finalTP, undefined, newMarketDetails[activeSymbol]);
              setBotState(prev => ({ ...prev, statusMessage: `AI Bot Executed: ${analysis.decision}` }));
            };

            if (analysis.decision === TradeType.BUY) {
              // Close any open sells first (Auto-Switch)
              const sellsToClose = openTrades.filter(t => t.type === TradeType.SELL);
              if (sellsToClose.length > 0) {
                addLog(`Bot: SELL signal reversed to BUY. Closing open positions.`, 'info');
                sellsToClose.forEach(t => handleManualClose(t.id, newPrices[t.symbol]));
              }
              
              if (!hasBuy) {
                executeTrade();
              }
            } else if (analysis.decision === TradeType.SELL) {
              // Close any open buys first (Auto-Switch)
              const buysToClose = openTrades.filter(t => t.type === TradeType.BUY);
              if (buysToClose.length > 0) {
                addLog(`Bot: BUY signal reversed to SELL. Closing open positions.`, 'info');
                buysToClose.forEach(t => handleManualClose(t.id, newPrices[t.symbol]));
              }

              if (!hasSell) {
                executeTrade();
              }
            }
          }
        }
      }

      let paperBalanceAdjustment = 0;
      let realBalanceAdjustment = 0;
      let paperOpenPnL = 0;
      let realOpenPnL = 0;

      setTrades(prev => {
        const updatedTrades = prev.map(t => {
          if (t.status === 'PENDING') {
              const price = newPrices[t.symbol];
              if (t.type === TradeType.LIMIT_BUY && price <= (t.limitPrice || 0)) {
                  addLog(`Limit Order Executed: ${t.symbol} BUY @ ${price.toFixed(2)}`, 'success');
                  return { ...t, status: 'OPEN', entryPrice: price, openTime: Date.now() };
              }
              if (t.type === TradeType.LIMIT_SELL && price >= (t.limitPrice || 0)) {
                  addLog(`Limit Order Executed: ${t.symbol} SELL @ ${price.toFixed(2)}`, 'success');
                  return { ...t, status: 'OPEN', entryPrice: price, openTime: Date.now() };
              }
          }
          if (t.status === 'OPEN') {
              const price = newPrices[t.symbol];
              const diff = t.type.includes('BUY') ? price - t.entryPrice : t.entryPrice - price;
              const currentPnL = diff * ASSETS[t.symbol].CONTRACT_SIZE * t.lotSize;
              
              let updatedTrade = { ...t, pnl: currentPnL };

              // Trailing Stop logic for HFT Bot
              if (currentBotState.strategy === 'HFT_BOT') {
                const hft = hftSettingsRef.current;
                const point = 0.00001;
                const trailingStart = hft.maxTrailing * point;
                
                if (t.type === TradeType.BUY) {
                  const profit = price - t.entryPrice;
                  if (profit > trailingStart) {
                    const newSL = price - trailingStart;
                    if (!t.stopLoss || newSL > t.stopLoss) {
                      updatedTrade.stopLoss = newSL;
                    }
                  }
                } else if (t.type === TradeType.SELL) {
                  const profit = t.entryPrice - price;
                  if (profit > trailingStart) {
                    const newSL = price + trailingStart;
                    if (!t.stopLoss || newSL < t.stopLoss) {
                      updatedTrade.stopLoss = newSL;
                    }
                  }
                }
              }

              if (updatedTrade.stopLoss && ((updatedTrade.type.includes('BUY') && price <= updatedTrade.stopLoss) || (updatedTrade.type.includes('SELL') && price >= updatedTrade.stopLoss))) {
                 addLog(`STOP LOSS HIT: ${updatedTrade.symbol} @ ${price.toFixed(2)}`, 'error');
                 if (updatedTrade.accountType === AccountType.REAL) realBalanceAdjustment += currentPnL;
                 else paperBalanceAdjustment += currentPnL;
                 const closedTrade = { ...updatedTrade, status: 'CLOSED' as const, closeTime: Date.now(), closePrice: price };
                 recordTradeToFirestore(closedTrade, currentPnL);
                 return closedTrade;
              }
              if (updatedTrade.takeProfit && ((updatedTrade.type.includes('BUY') && price >= updatedTrade.takeProfit) || (updatedTrade.type.includes('SELL') && price <= updatedTrade.takeProfit))) {
                 addLog(`TAKE PROFIT HIT: ${updatedTrade.symbol} @ ${price.toFixed(2)}`, 'success');
                 if (updatedTrade.accountType === AccountType.REAL) realBalanceAdjustment += currentPnL;
                 else paperBalanceAdjustment += currentPnL;
                 const closedTrade = { ...updatedTrade, status: 'CLOSED' as const, closeTime: Date.now(), closePrice: price };
                 recordTradeToFirestore(closedTrade, currentPnL);
                 return closedTrade;
              }
              
              if (updatedTrade.accountType === AccountType.REAL) realOpenPnL += currentPnL;
              else paperOpenPnL += currentPnL;
              return updatedTrade;
          }
          return t;
        });
        return updatedTrades;
      });

      setBotState(prev => {
        const nextPaperBalance = prev.paperBalance + paperBalanceAdjustment;
        const nextRealBalance = prev.realBalance + realBalanceAdjustment;
        const nextPaperEquity = nextPaperBalance + paperOpenPnL;
        const nextRealEquity = nextRealBalance + realOpenPnL;

        return { 
          ...prev, 
          paperBalance: nextPaperBalance,
          paperEquity: nextPaperEquity,
          realBalance: nextRealBalance,
          realEquity: nextRealEquity,
          balance: prev.accountType === AccountType.REAL ? nextRealBalance : nextPaperBalance,
          equity: prev.accountType === AccountType.REAL ? nextRealEquity : nextPaperEquity
        };
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [activeSymbol, user]);

  const handleAddAlert = (price: number, type: 'ABOVE' | 'BELOW') => {
      setAlerts(prev => [...prev, { id: crypto.randomUUID(), symbol: activeSymbol, price, type, createdAt: Date.now() }]);
      addLog(`Price Alert Set: ${activeSymbol} ${type} ${price}`, 'info');
  };

  // Fetch real Binance balance periodically
  useEffect(() => {
    if (botState.isBinanceConnected && botState.binanceApiKey && botState.binanceApiSecret) {
      const fetchRealBalance = async () => {
        try {
          const balance = await binanceService.getBalance(botState.binanceApiKey!, botState.binanceApiSecret!, botState.tradingMode);
          setBotState(prev => ({
            ...prev,
            realBalance: balance,
            // If we're in real mode, update the active balance too
            balance: prev.accountType === AccountType.REAL ? balance : prev.balance
          }));
        } catch (error) {
          console.error("Error fetching Binance balance:", error);
        }
      };

      fetchRealBalance();
      const interval = setInterval(fetchRealBalance, 10000); // Fetch every 10 seconds
      return () => clearInterval(interval);
    }
  }, [botState.isBinanceConnected, botState.binanceApiKey, botState.binanceApiSecret, botState.tradingMode]);

  const handleSetAccountType = (type: AccountType) => {
    setBotState(prev => {
      const nextBalance = type === AccountType.REAL ? prev.realBalance : prev.paperBalance;
      const nextEquity = type === AccountType.REAL ? prev.realEquity : prev.paperEquity;
      return { 
        ...prev, 
        accountType: type,
        balance: nextBalance,
        equity: nextEquity
      };
    });
    
    // Trigger immediate balance fetch if switching to REAL
    if (type === AccountType.REAL && botState.isBinanceConnected && botState.binanceApiKey && botState.binanceApiSecret) {
      binanceService.getBalance(botState.binanceApiKey, botState.binanceApiSecret, botState.tradingMode)
        .then(balance => {
          setBotState(prev => ({
            ...prev,
            realBalance: balance,
            balance: prev.accountType === AccountType.REAL ? balance : prev.balance
          }));
        })
        .catch(err => console.error("Immediate balance fetch failed:", err));
    }
    
    addLog(`Account switched to: ${type}`, 'info');
  };

  const handleSetTradingMode = (mode: TradingMode) => {
    setBotState(prev => ({ ...prev, tradingMode: mode }));
    addLog(`Trading mode switched to: ${mode}`, 'info');
    
    // Ensure activeSymbol is valid for the new mode
    const asset = ASSETS[activeSymbol];
    if (botState.accountType === AccountType.REAL) {
      if (asset.CATEGORY !== 'CRYPTO' || (asset.MODES && !asset.MODES.includes(mode))) {
        setActiveSymbol('BTCUSD');
      }
      
      // Trigger immediate balance fetch if in REAL mode
      if (botState.isBinanceConnected && botState.binanceApiKey && botState.binanceApiSecret) {
        binanceService.getBalance(botState.binanceApiKey, botState.binanceApiSecret, mode)
          .then(balance => {
            setBotState(prev => ({
              ...prev,
              realBalance: balance,
              balance: prev.accountType === AccountType.REAL ? balance : prev.balance
            }));
          })
          .catch(err => console.error("Immediate balance fetch failed (mode switch):", err));
      }
    }
  };

  const handleConnectBinance = async (apiKey: string, apiSecret: string) => {
    try {
      addLog("Connecting to Binance...", "info");
      
      // Fetch balance first to verify keys
      try {
        const balance = await binanceService.getBalance(apiKey, apiSecret, botState.tradingMode);
        
        const updatedState = { 
          ...botState, 
          binanceApiKey: apiKey, 
          binanceApiSecret: apiSecret, 
          isBinanceConnected: true,
          realBalance: balance,
          balance: botState.accountType === AccountType.REAL ? balance : botState.paperBalance,
          realEquity: balance
        };
        
        setBotState(updatedState);
        
        if (user && auth.currentUser) {
          await databaseService.saveBotState(auth.currentUser.uid, updatedState);
        }
        
        addLog(`Binance Real Account Connected! Balance: ${balance} USD`, "success");
      } catch (e: any) {
        console.error("Initial balance fetch failed:", e);
        addLog(`Failed to connect Binance: ${e.message || "Invalid API keys or network error"}`, "error");
        
        // Ensure we don't show as connected if it failed
        setBotState(prev => ({ ...prev, isBinanceConnected: false }));
      }
    } catch (error) {
      addLog("An unexpected error occurred during connection.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-black text-slate-200">
      <Navigation 
        currentView={currentView} 
        onNavigate={handleNavigate} 
        userEmail={user?.email} 
        onLogout={handleLogout} 
      />
      
      <WalletModal 
        isOpen={walletModal.isOpen} 
        type={walletModal.type} 
        currentBalance={botState.balance} 
        onClose={() => setWalletModal(p => ({ ...p, isOpen: false }))} 
        onConfirm={a => { setBotState(p => ({...p, balance: p.balance + (walletModal.type === 'deposit' ? a : -a)})); addLog(`${walletModal.type === 'deposit' ? 'Deposit' : 'Withdrawal'} of $${a} completed.`, 'success'); }} 
      />

      {showLogin && <LoginScreen onLogin={(email) => { setShowLogin(false); }} onCancel={() => setShowLogin(false)} />}
      
      <main className="min-h-screen pt-16 relative">
        <div className={currentView === 'DASHBOARD' ? 'block' : 'hidden'}>
          <DashboardView botState={botState} trades={trades} prices={prices} marketDetails={marketDetails} activeSymbol={activeSymbol} onNavigate={handleNavigate} onSelectSymbol={setActiveSymbol} />
        </div>
        
        <div className={currentView === 'TERMINAL' ? 'block' : 'hidden'}>
          <TerminalView 
            symbol={activeSymbol} prices={prices} trades={trades} marketDetails={marketDetails} riskSettings={riskSettings[activeSymbol]} balance={botState.balance} botState={botState}
            onRiskUpdate={s => setRiskSettings(p => ({ ...p, [activeSymbol]: s }))} onManualTrade={handleManualOpen} onCloseTrade={handleManualClose} onUpdateTrade={handleUpdateTrade}
            isBotActive={botState.isRunning} onToggleBot={() => { const next = !botState.isRunning; setBotState(p => ({...p, isRunning: next})); addLog(`Bot ${next ? 'Started' : 'Stopped'}.`, next ? 'success' : 'warning'); }} isAnalyzing={isAnalyzing} onAnalyze={triggerAnalysis} activeStrategy={botState.strategy} 
            onSetStrategy={s => { setBotState(p => ({...p, strategy: s})); addLog(`Strategy changed to: ${s}`, 'info'); }} selectedTimeframe={nebulaV5Settings.timeframe} onSetTimeframe={(tf) => setNebulaV5Settings(p => ({...p, timeframe: tf}))} onOpenDeposit={() => setWalletModal({ isOpen: true, type: 'deposit' })} onOpenWithdraw={() => setWalletModal({ isOpen: true, type: 'withdraw' })}
            onSelectSymbol={setActiveSymbol} alerts={alerts} onAddAlert={handleAddAlert} onRemoveAlert={id => setAlerts(p => p.filter(a => a.id !== id))}
            nebulaV5Settings={nebulaV5Settings} onUpdateNebulaV5Settings={setNebulaV5Settings} logs={logs}
            hedgingSettings={hedgingSettings} onUpdateHedgingSettings={setHedgingSettings}
            hftSettings={hftSettings} onUpdateHFTSettings={setHftSettings}
            onUpdateCustomLogic={(logic) => setBotState(p => ({ ...p, customLogic: logic }))}
            onSetAccountType={handleSetAccountType}
            onSetTradingMode={handleSetTradingMode}
            onConnectBinance={handleConnectBinance}
            isLocked={userStats?.isLocked}
          />
        </div>

        <div className={currentView === 'PORTFOLIO' ? 'block' : 'hidden'}>
          <PortfolioView trades={trades} prices={prices} onCloseTrade={handleManualClose} onUpdateTrade={handleUpdateTrade} accountType={botState.accountType} />
        </div>

        <div className={currentView === 'INTELLIGENCE' ? 'block' : 'hidden'}>
          <IntelligenceView activeSymbol={activeSymbol} analysis={lastAnalysis} isAnalyzing={isAnalyzing} onAnalyze={triggerAnalysis} logs={logs} activeStrategy={botState.strategy} />
        </div>

        <div className={currentView === 'ASSISTANT' ? 'block' : 'hidden'}>
          <AssistantView activeSymbol={activeSymbol} marketDetails={marketDetails[activeSymbol]} />
        </div>

        <div className={currentView === 'PROFILE' ? 'block' : 'hidden'}>
          {user && <ProfileView userEmail={user.email} botState={botState} onConnectBinance={handleConnectBinance} userStats={userStats} />}
        </div>

        <div className={currentView === 'SUBSCRIPTION' ? 'block' : 'hidden'}>
          {user && (
            <SubscriptionView 
              userStats={userStats}
              onSuccess={() => {
                addLog("Access granted to Nebula protocols.", "success");
                setCurrentView('TERMINAL');
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
};
export default App;
