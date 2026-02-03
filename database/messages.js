import { supabase } from './client.js';

export async function saveMessage(
  convId,
  msgType,
  content,
  tokens = 0,
  timeMs = 0
) {
  await supabase.from('messages').insert({
    conversation_id: convId,
    message_type: msgType,
    content,
    ai_tokens_used: tokens,
    response_time_ms: timeMs
  });
}
