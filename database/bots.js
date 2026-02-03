import { supabase } from './client.js';
import { encrypt } from '../utils/encryption.js';

export async function createBot(userId, data) {
  const { data: bot, error } = await supabase
    .from('user_bots')
    .insert({
      user_id: userId,
      bot_token: encrypt(data.bot_token),
      bot_name: data.bot_name,
      bot_username: data.bot_username || null
    })
    .select()
    .single();

  return error ? null : bot;
}

export async function getBot(botId) {
  const { data, error } = await supabase
    .from('user_bots')
    .select('*')
    .eq('id', botId)
    .single();

  return error ? null : data;
}

export async function getUserBot(userId) {
  const { data, error } = await supabase
    .from('user_bots')
    .select('*')
    .eq('user_id', userId)
    .single();

  return error ? null : data;
}

export async function deleteBot(botId) {
  const { data, error } = await supabase
    .from('user_bots')
    .delete()
    .eq('id', botId)
    .select()
    .single();

  return error ? null : data;
}
