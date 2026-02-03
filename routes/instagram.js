import express from 'express';
import { db } from '../database.js';

const router = express.Router();

router.get('/:botId', async (req, res) => {
  try {
    const session = await db.getInstagramSession(req.params.botId);
    res.json(session || { status: 'disconnected' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/:botId/reset', async (req, res) => {
  try {
    const session = await db.deleteInstagramSession(req.params.botId);
    return res.json({ success: true, session });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
