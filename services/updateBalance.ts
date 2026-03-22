import { supabase } from "./supabase"

export async function updateBalance(userId: string, newBalance: number) {
  const { error } = await supabase
    .from("profiles")
    .update({ balance: newBalance })
    .eq("id", userId);
  if (error) console.error('Error updating balance:', error);
}
