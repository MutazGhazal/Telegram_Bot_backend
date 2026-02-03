import express from 'express';
import { supabase } from '../database.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) throw error;

    res.json({
      success: true,
      user: { id: data.user.id, email: data.user.email }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    res.json({
      success: true,
      user: { id: data.user.id, email: data.user.email },
      token: data.session.access_token
    });
  } catch (error) {
    res.status(401).json({ error: 'خطأ في البيانات' });
  }
});

export default router;
