import { useEffect, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ASSETS, CRON_INTERVAL_MS } from '../config/constants';
import { getMarketDetails } from '../services/priceService';
import { calculateRiskBasedLotSize } from '../services/orderService';
import { TradeType, Symbol, RiskSettings, BotState, Trade, HedgingBotSettings, MarketDetails, MarketAnalysis } from '../types';

type LogType = 'info' | 'success' | 'error' | 'warning';

export interface BotLoopDeps {
  activeSymbol: Symbol;
  riskSettings: Record<Symbol, RiskSettings>;
  setMarketDetails: Dispatch<SetStateAction<Record<Symbol, MarketDetails>>>;
  setPrices: Dispatch<SetStateAction<Record<Symbol, number>>>;
  botStateRef: MutableRefObject<BotState>;
  tradesRef: MutableRefObject<Trade[]>;
  hedgingSettingsRef: MutableRefObject<HedgingBotSettings>;
  onManualOpen: (type: TradeType, lots: number, slDist: number, tpDist: number, limitPrice?: number, overrideDetails?: MarketDetails, leverage?: number, symbolOverride?: Symbol) => void;
  onManualClose: (tradeId: string, overridePrice?: number) => void;
  onAnalyze: () => Promise<MarketAnalysis | null>;
  addLog: (message: string, type?: LogType) => void;
}

/**
 * Runs every second:
 *  - refreshes market details / prices for all assets
 *  - drives the hedging bot state machine
 *  - triggers strategy analysis on the CRON interval when the bot is running
 */
export const useBotLoop = (deps: BotLoopDeps) => {
  const {
    activeSymbol, riskSettings, setMarketDetails, setPrices,
    botStateRef, tradesRef, hedgingSettingsRef,
    onManualOpen, onManualClose, onAnalyze, addLog,
  } = deps;

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
    lastOpenPositions: 0,
  });

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
            symbolTrades.forEach(t => onManualClose(t.id, newPrices[t.symbol]));
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
            addLog('Hedging Bot: Ready for new cycle.', 'success');
          }

          if (currentOpenCount === 0) {
            hState.entryBuyPrice = ask + (hSettings.distancePips * 0.00001);
            hState.entrySellPrice = bid - (hSettings.distancePips * 0.00001);
            hState.waitingForBuyTouch = true;
            hState.waitingForSellTouch = true;
            hState.buyTriggered = false;
            hState.sellTriggered = false;
            hState.lastOpenPositions = 1;

            onManualOpen(TradeType.BUY, hSettings.initialLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
            onManualOpen(TradeType.SELL, hSettings.initialLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
          } else if (currentOpenCount > 0) {
            const lastTrade = symbolTrades[symbolTrades.length - 1];
            if (bid <= hState.entrySellPrice && hState.waitingForSellTouch && !hState.sellTriggered) {
              const nextLot = lastTrade.lotSize * hSettings.lotMultiplier;
              onManualOpen(TradeType.SELL, nextLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
              hState.sellTriggered = true;
              hState.waitingForSellTouch = false;
              hState.waitingForBuyTouch = true;
              hState.entryBuyPrice = ask + (hSettings.distancePips * 0.00001);
            } else if (ask >= hState.entryBuyPrice && hState.waitingForBuyTouch && !hState.buyTriggered) {
              const nextLot = lastTrade.lotSize * hSettings.lotMultiplier;
              onManualOpen(TradeType.BUY, nextLot, hSettings.stopLossPips * 0.00001, hSettings.takeProfitPips * 0.00001);
              hState.buyTriggered = true;
              hState.waitingForBuyTouch = false;
              hState.waitingForSellTouch = true;
              hState.entrySellPrice = bid - (hSettings.distancePips * 0.00001);
            }

            const totalPnL = symbolTrades.reduce((acc, t) => acc + t.pnl, 0);
            if (currentOpenCount >= hSettings.netProfitTriggerAfterTrades && totalPnL >= hSettings.profitTargetUSD) {
              addLog(`Hedging Bot: Profit target $${hSettings.profitTargetUSD} reached ($${totalPnL.toFixed(2)}). Closing cycle.`, 'success');
              symbolTrades.forEach(t => onManualClose(t.id, newPrices[t.symbol]));
              hState.tradingPaused = true;
              hState.lastCloseTime = now;
            }
          }
        } else if (now - lastAnalysisTimeRef.current > CRON_INTERVAL_MS) {
          lastAnalysisTimeRef.current = now;
          onAnalyze().then(analysis => {
            if (analysis && (analysis.decision === TradeType.BUY || analysis.decision === TradeType.SELL)) {
              const risk = riskSettings[activeSymbol];
              const asset = ASSETS[activeSymbol];
              const lotSize = calculateRiskBasedLotSize(
                currentBotState.balance,
                risk.riskPercentage,
                risk.stopLossDistance,
                asset.CONTRACT_SIZE,
              );
              onManualOpen(analysis.decision, lotSize, risk.stopLossDistance, risk.takeProfitDistance);
            }
          });
        }
      }
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbol]);
};
