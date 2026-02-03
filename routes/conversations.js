import express from 'express';
import { supabase } from '../database.js';

const router = express.Router();

router.get('/:botId/list', async (req, res) => {
  try {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('bot_id', req.params.botId)
      .order('started_at', { ascending: false });

    res.json(data || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:convId/messages', async (req, res) => {
  try {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', req.params.convId)
      .order('created_at');

    res.json(data || []);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
