import { supabase } from './client.js';

export async function getOrCreateConversation(
  botId,
  tgUserId,
  username = null
) {
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('bot_id', botId)
    .eq('telegram_user_id', tgUserId)
    .is('ended_at', null)
    .maybeSingle();

  if (data) return data;

  const { data: created } = await supabase
    .from('conversations')
    .insert({
      bot_id: botId,
      telegram_user_id: tgUserId,
      telegram_username: username
    })
    .select()
    .single();

  return created;
}
