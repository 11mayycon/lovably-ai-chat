import { Router } from 'express';
import { query } from '../config/database';

const router = Router();

// WhatsApp webhook handler
router.post('/whatsapp', async (req, res) => {
  try {
    const event = req.body;

    console.log('WhatsApp webhook received:', JSON.stringify(event, null, 2));

    // Handle different event types
    if (event.event === 'messages.upsert') {
      const message = event.data;
      
      // Process incoming message
      if (message.key.fromMe === false) {
        const phone = message.key.remoteJid.split('@')[0];
        const content = message.message?.conversation || 
                       message.message?.extendedTextMessage?.text || '';

        // Find or create attendance
        let attendance = await query(
          `SELECT id FROM attendances 
           WHERE client_phone = $1 AND status = 'active'
           LIMIT 1`,
          [phone]
        );

        if (attendance.rows.length === 0) {
          // Create new attendance
          const result = await query(
            `INSERT INTO attendances 
             (client_phone, client_name, initial_message, status, assigned_to)
             VALUES ($1, $2, $3, 'waiting', 'ai')
             RETURNING id`,
            [phone, phone, content]
          );
          attendance = result;
        }

        // Save message
        await query(
          `INSERT INTO messages (attendance_id, content, sender_type)
           VALUES ($1, $2, 'client')`,
          [attendance.rows[0].id, content]
        );
      }
    } else if (event.event === 'connection.update') {
      // Update connection status
      const { state, instance } = event.data;
      
      await query(
        `UPDATE whatsapp_connections 
         SET status = $1, updated_at = NOW()
         WHERE instance_name = $2`,
        [state === 'open' ? 'connected' : 'disconnected', instance]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// Evolution API webhook handler
router.post('/evolution', async (req, res) => {
  try {
    const event = req.body;
    console.log('Evolution webhook received:', JSON.stringify(event, null, 2));

    // Handle Evolution-specific events
    if (event.event === 'qrcode.updated') {
      await query(
        `UPDATE whatsapp_connections 
         SET qr_code = $1, updated_at = NOW()
         WHERE instance_name = $2`,
        [event.data.qrcode, event.instance]
      );
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Evolution webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

// Stripe webhook handler
router.post('/stripe', async (req, res) => {
  try {
    const event = req.body;
    
    console.log('Stripe webhook received:', event.type);

    // Handle Stripe events
    switch (event.type) {
      case 'checkout.session.completed':
        // Handle successful payment
        break;
      case 'customer.subscription.updated':
        // Handle subscription update
        break;
      case 'customer.subscription.deleted':
        // Handle subscription cancellation
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

export default router;
