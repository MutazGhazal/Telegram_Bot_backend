import { supabase } from './client.js';

export async function getInstagramSession(botId) {
  const { data, error } = await supabase
    .from('instagram_sessions')
    .select('*')
    .eq('bot_id', botId)
    .single();

  return error ? null : data;
}

export async function deleteInstagramSession(botId) {
  const { data, error } = await supabase
    .from('instagram_sessions')
    .delete()
    .eq('bot_id', botId)
    .select()
    .single();

  return error ? null : data;
}
