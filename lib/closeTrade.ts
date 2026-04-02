import { supabase } from "./supabase";

export async function closeTrade(tradeId: string, profit: number) {
  const { error } = await supabase
    .from("trades")
    .update({
      pnl: profit, // The user snippet had 'profit' but databaseService uses 'pnl'
      status: "closed",
      close_time: Date.now()
    })
    .eq("id", tradeId);

  if (error) console.error("Error closing trade:", error);
}
