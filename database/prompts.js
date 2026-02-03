import { supabase } from './client.js';

export async function savePrompt(botId, data) {
  await supabase
    .from('bot_prompts')
    .update({ is_active: false })
    .eq('bot_id', botId);

  const { data: prompt, error } = await supabase
    .from('bot_prompts')
    .insert({
      bot_id: botId,
      prompt_text: data.prompt_text,
      file_name: data.file_name,
      file_type: data.file_type,
      is_active: true
    })
    .select()
    .single();

  return error ? null : prompt;
}

export async function getPrompt(botId) {
  const { data, error } = await supabase
    .from('bot_prompts')
    .select('*')
    .eq('bot_id', botId)
    .eq('is_active', true)
    .single();

  return error ? null : data;
}

export async function deactivatePrompt(botId) {
  const { data, error } = await supabase
    .from('bot_prompts')
    .update({ is_active: false })
    .eq('bot_id', botId)
    .eq('is_active', true)
    .select()
    .maybeSingle();

  return error ? null : data;
}
