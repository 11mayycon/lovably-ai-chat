import { Router } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireSupport, AuthRequest } from '../middleware/auth';

const router = Router();

// Get attendances for support user
router.post('/list', authenticateToken, requireSupport, async (req, res) => {
  try {
    const { support_user_id } = req.body;

    if (!support_user_id) {
      return res.status(400).json({ error: 'support_user_id é obrigatório' });
    }

    // Get rooms for support user
    const roomsResult = await query(
      'SELECT id FROM support_rooms WHERE support_user_id = $1',
      [support_user_id]
    );

    if (roomsResult.rows.length === 0) {
      return res.json({ attendances: [] });
    }

    const roomIds = roomsResult.rows.map(r => r.id);

    // Get attendances from those rooms
    const attendancesResult = await query(
      `SELECT a.*, wc.instance_name, wc.phone_number
       FROM attendances a
       LEFT JOIN whatsapp_connections wc ON a.whatsapp_connection_id = wc.id
       WHERE a.room_id = ANY($1) 
       AND a.status IN ('active', 'waiting')
       ORDER BY a.updated_at DESC`,
      [roomIds]
    );

    res.json({ attendances: attendancesResult.rows });
  } catch (error) {
    console.error('Get attendances error:', error);
    res.status(500).json({ error: 'Erro ao buscar atendimentos' });
  }
});

// Get messages for attendance
router.get('/:attendanceId/messages', authenticateToken, async (req, res) => {
  try {
    const { attendanceId } = req.params;

    const result = await query(
      `SELECT * FROM messages 
       WHERE attendance_id = $1 
       ORDER BY created_at ASC`,
      [attendanceId]
    );

    res.json({ messages: result.rows });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Erro ao buscar mensagens' });
  }
});

// Start bot chat
router.post('/start-bot-chat', authenticateToken, async (req, res) => {
  try {
    const { room_id, support_user_id, support_user_name } = req.body;

    if (!room_id || !support_user_id) {
      return res.status(400).json({ error: 'room_id e support_user_id são obrigatórios' });
    }

    // Check for existing bot chat
    const existingResult = await query(
      `SELECT * FROM attendances 
       WHERE room_id = $1 
       AND agent_id = $2 
       AND assigned_to = 'ai' 
       AND status = 'active'
       LIMIT 1`,
      [room_id, support_user_id]
    );

    if (existingResult.rows.length > 0) {
      return res.json({ attendance: existingResult.rows[0] });
    }

    // Create new bot chat attendance
    const newResult = await query(
      `INSERT INTO attendances 
       (room_id, agent_id, client_name, client_phone, assigned_to, status) 
       VALUES ($1, $2, $3, $4, 'ai', 'active') 
       RETURNING *`,
      [room_id, support_user_id, 'AI Assistant', 'bot']
    );

    res.json({ attendance: newResult.rows[0] });
  } catch (error) {
    console.error('Start bot chat error:', error);
    res.status(500).json({ error: 'Erro ao iniciar chat com bot' });
  }
});

export default router;
