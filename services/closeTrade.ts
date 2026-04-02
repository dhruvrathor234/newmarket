import { supabase } from "./supabase"

export async function closeTrade(tradeId: string, profit: number) {
  const { error } = await supabase
    .from("trades")
    .update({
      pnl: profit, // Mapping 'profit' to 'pnl' as per existing schema
      status: "CLOSED", // Mapping to existing enum
      close_time: Date.now()
    })
    .eq("id", tradeId);
  if (error) console.error('Error closing trade:', error);
}
