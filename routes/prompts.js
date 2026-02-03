import express from 'express';
import multer from 'multer';
import pdfParse from 'pdf-parse';
import { db } from '../database.js';
import config from '../config.js';

const router = express.Router();
const upload = multer({ limits: { fileSize: config.limits.maxFileSizeBytes } });

router.post('/:botId/upload', upload.single('file'), async (req, res) => {
  try {
    const { botId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'الملف غير موجود' });
    }

    let text;
    if (file.originalname.endsWith('.pdf')) {
      const pdfData = await pdfParse(file.buffer);
      text = pdfData.text;
    } else {
      text = file.buffer.toString('utf-8');
    }

    const prompt = await db.savePrompt(botId, {
      prompt_text: text,
      file_name: file.originalname,
      file_type: file.mimetype
    });

    res.json({ success: true, prompt });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/:botId', async (req, res) => {
  try {
    const prompt = await db.getPrompt(req.params.botId);
    res.json(prompt || { prompt_text: '' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/:botId', async (req, res) => {
  try {
    const prompt = await db.deactivatePrompt(req.params.botId);
    return res.json({ success: true, prompt });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

export default router;
