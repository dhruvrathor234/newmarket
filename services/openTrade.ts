import { supabase } from "./supabase"

export async function openTrade(userId: string, asset: string, type: string, lot: number) {
  const { error } = await supabase
    .from("trades")
    .insert([
      {
        user_id: userId,
        symbol: asset, // Mapping 'asset' to 'symbol'
        type: type,
        lot_size: lot, // Mapping 'lot' to 'lot_size'
        pnl: 0,
        status: "OPEN",
        open_time: Date.now()
      }
    ]);
  if (error) console.error('Error opening trade:', error);
}
