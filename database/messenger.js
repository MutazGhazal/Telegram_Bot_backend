import { supabase } from './client.js';

export async function saveMessengerSession(botId, data) {
  const payload = {
    bot_id: botId,
    page_id: data.page_id || null,
    page_access_token: data.page_access_token || null,
    webhook_url: data.webhook_url || null,
    status: data.status || 'connected',
    last_connected_at: data.last_connected_at || new Date().toISOString()
  };

  const { data: session, error } = await supabase
    .from('messenger_sessions')
    .upsert(payload, { onConflict: 'bot_id' })
    .select()
    .single();

  return error ? null : session;
}

export async function getMessengerSession(botId) {
  const { data, error } = await supabase
    .from('messenger_sessions')
    .select('*')
    .eq('bot_id', botId)
    .single();

  return error ? null : data;
}

export async function getMessengerSessionByPage(pageId) {
  const { data, error } = await supabase
    .from('messenger_sessions')
    .select('*')
    .eq('page_id', pageId)
    .single();

  return error ? null : data;
}

export async function updateMessengerStatus(botId, status) {
  const { data, error } = await supabase
    .from('messenger_sessions')
    .update({ status })
    .eq('bot_id', botId)
    .select()
    .single();

  return error ? null : data;
}

export async function deleteMessengerSession(botId) {
  const { data, error } = await supabase
    .from('messenger_sessions')
    .delete()
    .eq('bot_id', botId)
    .select()
    .single();

  return error ? null : data;
}
