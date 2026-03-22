import { db, auth } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';

export interface UserBillingInfo {
  tradeCount: number;
  netProfit: number;
  unpaidProfitShare: number;
  isServicePaused: boolean;
  lastPaymentDate?: string;
}

export const billingService = {
  subscribeToBillingInfo(userId: string, callback: (info: UserBillingInfo) => void) {
    return onSnapshot(doc(db, 'users', userId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        callback({
          tradeCount: data.tradeCount || 0,
          netProfit: data.netProfit || 0,
          unpaidProfitShare: data.unpaidProfitShare || 0,
          isServicePaused: data.isServicePaused || false,
          lastPaymentDate: data.lastPaymentDate,
        });
      } else {
        // Initialize if not exists
        setDoc(doc(db, 'users', userId), {
          uid: userId,
          email: auth.currentUser?.email || '',
          tradeCount: 0,
          netProfit: 0,
          unpaidProfitShare: 0,
          isServicePaused: false,
        });
      }
    });
  },

  async recordTrade(userId: string, pnl: number) {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: userId,
        email: auth.currentUser?.email || '',
        tradeCount: 1,
        netProfit: pnl,
        unpaidProfitShare: 0,
        isServicePaused: false,
      });
    } else {
      const data = userDoc.data();
      const newTradeCount = (data.tradeCount || 0) + 1;
      const newNetProfit = (data.netProfit || 0) + pnl;
      
      let unpaidProfitShare = data.unpaidProfitShare || 0;
      let isServicePaused = data.isServicePaused || false;

      // If user hits 10 trades, calculate 20% profit share
      if (newTradeCount >= 10 && newNetProfit > 0) {
        unpaidProfitShare = newNetProfit * 0.2;
        // If they haven't paid, pause service
        if (unpaidProfitShare > 0) {
          isServicePaused = true;
        }
      }

      await updateDoc(userRef, {
        tradeCount: newTradeCount,
        netProfit: newNetProfit,
        unpaidProfitShare,
        isServicePaused,
      });
    }
  },

  async processPayment(userId: string, amount: number, method: string, transactionId: string) {
    const userRef = doc(db, 'users', userId);
    
    // Record payment
    await addDoc(collection(db, 'payments'), {
      userId,
      amount,
      method,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      transactionId,
    });

    // Reset billing status
    await updateDoc(userRef, {
      unpaidProfitShare: 0,
      isServicePaused: false,
      lastPaymentDate: new Date().toISOString(),
    });
  }
};
