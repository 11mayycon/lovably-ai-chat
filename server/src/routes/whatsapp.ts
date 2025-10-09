import { Router } from 'express';
import axios from 'axios';
import { query } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';

const router = Router();
const EVO_BASE_URL = process.env.EVO_BASE_URL;
const EVO_API_KEY = process.env.EVO_API_KEY;

// Get connected WhatsApp instance
router.get('/connected-instance', authenticateToken, async (req, res) => {
  try {
    const result = await query(
      `SELECT instance_name, status FROM whatsapp_connections 
       WHERE status = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      ['connected']
    );

    res.json({ success: true, instance: result.rows[0] || null });
  } catch (error) {
    console.error('Get connected instance error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar instância conectada' });
  }
});

// Get WhatsApp contacts
router.post('/contacts', authenticateToken, async (req, res) => {
  try {
    const { instanceName } = req.body;

    if (!instanceName) {
      return res.status(400).json({ success: false, error: 'instanceName é obrigatório' });
    }

    const response = await axios.get(
      `${EVO_BASE_URL}/contact/findContacts/${instanceName}`,
      {
        headers: { apikey: EVO_API_KEY }
      }
    );

    const contacts = response.data
      .filter((contact: any) => contact.id && contact.id.includes('@'))
      .map((contact: any) => ({
        id: contact.id,
        name: contact.pushName || contact.id.split('@')[0],
        phone: contact.id.split('@')[0],
        profilePicUrl: contact.profilePicUrl,
        isGroup: contact.id.includes('@g.us'),
        lastSeen: contact.lastSeen
      }))
      .slice(0, 50);

    res.json({ success: true, contacts, total: contacts.length });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({ success: false, error: 'Erro ao buscar contatos' });
  }
});

// Send WhatsApp message
router.post('/send-message', authenticateToken, async (req, res) => {
  try {
    const { phoneNumber, message, instanceName } = req.body;

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'phoneNumber e message são obrigatórios' });
    }

    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const number = `${formattedPhone}@s.whatsapp.net`;

    const payload = {
      number,
      text: message
    };

    const response = await axios.post(
      `${EVO_BASE_URL}/message/sendText/${instanceName}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: EVO_API_KEY
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Send message error:', error.response?.data || error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Erro ao enviar mensagem' 
    });
  }
});

// Set WhatsApp webhook
router.post('/set-webhook', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { instanceName, webhookUrl } = req.body;

    if (!instanceName || !webhookUrl) {
      return res.status(400).json({ error: 'instanceName e webhookUrl são obrigatórios' });
    }

    const response = await axios.post(
      `${EVO_BASE_URL}/webhook/set/${instanceName}`,
      {
        url: webhookUrl,
        webhook_by_events: true,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'MESSAGES_UPDATE',
          'CONNECTION_UPDATE'
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          apikey: EVO_API_KEY
        }
      }
    );

    res.json({ success: true, data: response.data });
  } catch (error: any) {
    console.error('Set webhook error:', error.response?.data || error);
    res.status(500).json({ 
      success: false, 
      error: error.response?.data?.message || 'Erro ao configurar webhook' 
    });
  }
});

export default router;
