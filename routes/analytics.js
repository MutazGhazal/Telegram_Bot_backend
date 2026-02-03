import express from 'express';
import { supabase } from '../database.js';

const router = express.Router();

router.get('/:botId/stats', async (req, res) => {
  try {
    const { botId } = req.params;

    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true })
      .eq('bot_id', botId);

    res.json({
      total_messages: msgCount || 0,
      total_conversations: convCount || 0
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
