import TelegramBot from 'node-telegram-bot-api';
import { db } from '../database.js';
import { decrypt } from '../utils/encryption.js';
import { ai } from './ai-handler.js';

class BotManager {
  constructor() {
    this.bots = new Map();
  }

  async startBot(botId) {
    try {
      if (this.bots.has(botId)) {
        return true;
      }

      const botData = await db.getBot(botId);
      if (!botData) return false;

      const token = decrypt(botData.bot_token);
      const bot = new TelegramBot(token, { polling: true });

      try {
        await bot.deleteWebHook({ drop_pending_updates: true });
      } catch (error) {
        console.warn(`⚠️ Failed to delete webhook for bot ${botId}:`, error?.message || error);
      }

      bot.botId = botId;

      bot.onText(/\/start/, async (msg) => {
        await bot.sendMessage(
          msg.chat.id,
          'مرحباً! 👋 كيف يمكنني مساعدتك؟'
        );
      });

      bot.on('message', async (msg) => {
        if (msg.text && !msg.text.startsWith('/')) {
          await this.handleMessage(bot, msg);
        }
      });

      this.bots.set(botId, bot);
      console.log(`✅ Bot ${botData.bot_name} started`);
      return true;
    } catch (error) {
      console.error(`❌ Error starting bot ${botId}:`, error);
      return false;
    }
  }

  async handleMessage(bot, msg) {
    const botId = bot.botId;
    const userMsg = msg.text;

    await bot.sendChatAction(msg.chat.id, 'typing');

    const conv = await db.getOrCreateConversation(
      botId,
      msg.from.id,
      msg.from.username
    );

    await db.saveMessage(conv.id, 'user', userMsg);

    const promptData = await db.getPrompt(botId);
    const systemPrompt = promptData?.prompt_text || null;

    const { text, tokens, timeMs } = await ai.generate(
      userMsg,
      systemPrompt,
      conv.id
    );

    await db.saveMessage(conv.id, 'bot', text, tokens, timeMs);
    await bot.sendMessage(msg.chat.id, text);
  }

  async stopBot(botId) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stopPolling();
      this.bots.delete(botId);
      return true;
    }
    return false;
  }

  isRunning(botId) {
    return this.bots.has(botId);
  }
}

export const botManager = new BotManager();
