import { supabase } from './database/client.js';
import { createBot, getBot, getUserBot, deleteBot } from './database/bots.js';
import { savePrompt, getPrompt, deactivatePrompt } from './database/prompts.js';
import { saveMessage } from './database/messages.js';
import { getOrCreateConversation } from './database/conversations.js';

export { supabase };

export const db = {
  createBot,
  getBot,
  getUserBot,
  deleteBot,
  savePrompt,
  getPrompt,
  deactivatePrompt,
  saveMessage,
  getOrCreateConversation
};
