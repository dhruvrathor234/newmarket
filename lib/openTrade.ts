import { supabase } from "./supabase";

export async function openTrade(userId: string, asset: string, type: string, lot: number) {
  const { error } = await supabase
    .from("trades")
    .insert([
      {
        user_id: userId,
        symbol: asset, // User snippet had 'asset' but databaseService uses 'symbol'
        type: type,
        lot_size: lot, // User snippet had 'lot' but databaseService uses 'lot_size'
        pnl: 0,
        status: "open",
        open_time: Date.now()
      }
    ]);

  if (error) console.error("Error opening trade:", error);
}
