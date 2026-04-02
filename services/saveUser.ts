import { supabase } from "./supabase"

export async function saveUser(id: string, email: string) {
  const { error } = await supabase
    .from("profiles") // Using 'profiles' as it's the existing table for users
    .upsert([{ id: id, email: email, balance: 500 }]);
  if (error) console.error('Error saving user:', error);
}
