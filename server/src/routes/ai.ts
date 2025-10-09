import { Router } from 'express';
import axios from 'axios';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.1-8b-instant';

// AI Chat
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { messages, attendance_id } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages são obrigatórias' });
    }

    // Get AI memory/instructions
    const memoryResult = await query(
      'SELECT instructions, context FROM ai_memory ORDER BY created_at DESC LIMIT 1'
    );

    const systemPrompt = memoryResult.rows[0]?.instructions || 
      'Você é um assistente virtual prestativo e profissional.';

    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 1000
      },
      {
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const aiMessage = response.data.choices[0].message.content;

    // Save AI response to messages if attendance_id provided
    if (attendance_id) {
      await query(
        `INSERT INTO messages (attendance_id, content, sender_type)
         VALUES ($1, $2, 'ai')`,
        [attendance_id, aiMessage]
      );
    }

    res.json({ message: aiMessage, success: true });
  } catch (error: any) {
    console.error('AI chat error:', error.response?.data || error);
    res.status(500).json({ 
      error: 'Erro ao processar chat com IA',
      details: error.response?.data 
    });
  }
});

// Get AI memory
router.get('/memory', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM ai_memory ORDER BY created_at DESC LIMIT 1'
    );

    res.json({ memory: result.rows[0] || null });
  } catch (error) {
    console.error('Get AI memory error:', error);
    res.status(500).json({ error: 'Erro ao buscar memória da IA' });
  }
});

// Update AI memory
router.put('/memory', authenticateToken, async (req, res) => {
  try {
    const { instructions, context, quick_replies } = req.body;

    const existingResult = await query(
      'SELECT id FROM ai_memory ORDER BY created_at DESC LIMIT 1'
    );

    let result;
    if (existingResult.rows.length > 0) {
      result = await query(
        `UPDATE ai_memory 
         SET instructions = $1, context = $2, quick_replies = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [instructions, context, quick_replies, existingResult.rows[0].id]
      );
    } else {
      result = await query(
        `INSERT INTO ai_memory (instructions, context, quick_replies)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [instructions, context, quick_replies]
      );
    }

    res.json({ memory: result.rows[0] });
  } catch (error) {
    console.error('Update AI memory error:', error);
    res.status(500).json({ error: 'Erro ao atualizar memória da IA' });
  }
});

export default router;
