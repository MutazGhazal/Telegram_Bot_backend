import express from 'express';
import TelegramBot from 'node-telegram-bot-api';
import { db } from '../database.js';
import { botManager } from '../services/telegram-bot.js';
import config from '../config.js';
import { decrypt } from '../utils/encryption.js';

const router = express.Router();

const resolveBotIdentity = async (botToken) => {
  try {
    const client = new TelegramBot(botToken, { polling: false });
    const me = await client.getMe();
    return {
      bot_name: me?.first_name || me?.username || 'Telegram Bot',
      bot_username: me?.username || null
    };
  } catch (error) {
    return {
      bot_name: 'Telegram Bot',
      bot_username: null
    };
  }
};

router.post('/create', async (req, res) => {
  try {
    const { bot_token, bot_name, user_id } = req.body;
    let resolvedName = bot_name?.trim();
    let resolvedUsername = null;

    if (!resolvedName) {
      const resolved = await resolveBotIdentity(bot_token);
      resolvedName = resolved.bot_name;
      resolvedUsername = resolved.bot_username;
    }

    const bot = await db.createBot(user_id, {
      bot_token,
      bot_name: resolvedName,
      bot_username: resolvedUsername
    });

    if (!bot) {
      return res.status(400).json({ error: 'فشل إنشاء البوت' });
    }

    await botManager.startBot(bot.id);

    res.json({ success: true, bot });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/my/:userId', async (req, res) => {
  try {
    const bot = await db.getUserBot(req.params.userId);
    res.json(bot || { error: 'لا يوجد بوت' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:botId/status', (req, res) => {
  const { botId } = req.params;
  const running = botManager.isRunning(botId);
  res.json({ running });
});

router.get('/:botId/info', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await db.getBot(botId);
    if (!bot) {
      return res.status(404).json({ error: 'البوت غير موجود' });
    }

    return res.json({
      bot,
      ai: {
        provider: 'openrouter',
        model: config.openrouter.model
      }
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get('/:botId/token', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await db.getBot(botId);
    if (!bot) {
      return res.status(404).json({ error: 'البوت غير موجود' });
    }

    const token = decrypt(bot.bot_token);
    return res.json({ token });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/start', async (req, res) => {
  try {
    const { botId } = req.params;
    const started = await botManager.startBot(botId);

    if (!started) {
      return res.status(400).json({ error: 'تعذر تشغيل البوت' });
    }

    return res.json({ success: true, running: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/stop', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await db.getBot(botId);
    if (!bot) {
      return res.status(404).json({ error: 'البوت غير موجود' });
    }

    const stopped = await botManager.stopBot(botId);
    return res.json({ success: true, running: false, wasRunning: stopped });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/restart', async (req, res) => {
  try {
    const { botId } = req.params;
    const bot = await db.getBot(botId);
    if (!bot) {
      return res.status(404).json({ error: 'البوت غير موجود' });
    }

    await botManager.stopBot(botId);
    const started = await botManager.startBot(botId);
    if (!started) {
      return res.status(400).json({ error: 'تعذر إعادة تشغيل البوت' });
    }

    return res.json({ success: true, running: true });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.delete('/:botId', async (req, res) => {
  try {
    const { botId } = req.params;
    await botManager.stopBot(botId);
    const deleted = await db.deleteBot(botId);

    if (!deleted) {
      return res.status(404).json({ error: 'البوت غير موجود' });
    }

    return res.json({ success: true, bot: deleted });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
