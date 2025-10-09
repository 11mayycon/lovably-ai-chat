"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
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
                let attendance = await (0, database_1.query)(`SELECT id FROM attendances 
           WHERE client_phone = $1 AND status = 'active'
           LIMIT 1`, [phone]);
                if (attendance.rows.length === 0) {
                    // Create new attendance
                    const result = await (0, database_1.query)(`INSERT INTO attendances 
             (client_phone, client_name, initial_message, status, assigned_to)
             VALUES ($1, $2, $3, 'waiting', 'ai')
             RETURNING id`, [phone, phone, content]);
                    attendance = result;
                }
                // Save message
                await (0, database_1.query)(`INSERT INTO messages (attendance_id, content, sender_type)
           VALUES ($1, $2, 'client')`, [attendance.rows[0].id, content]);
            }
        }
        else if (event.event === 'connection.update') {
            // Update connection status
            const { state, instance } = event.data;
            await (0, database_1.query)(`UPDATE whatsapp_connections 
         SET status = $1, updated_at = NOW()
         WHERE instance_name = $2`, [state === 'open' ? 'connected' : 'disconnected', instance]);
        }
        res.json({ success: true });
    }
    catch (error) {
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
        switch (event.event) {
            case 'qrcode.updated':
                await (0, database_1.query)(`UPDATE whatsapp_connections 
           SET qr_code = $1, updated_at = NOW()
           WHERE instance_name = $2`, [event.data.qrcode, event.instance]);
                break;
            case 'connection.update':
                await (0, database_1.query)(`UPDATE whatsapp_connections 
           SET status = $1, updated_at = NOW()
           WHERE instance_name = $2`, [event.data.state, event.instance]);
                break;
            case 'messages.upsert':
                const message = event.data;
                if (message && message.key) {
                    const { remoteJid, fromMe, id } = message.key;
                    const messageContent = message.message?.conversation ||
                        message.message?.extendedTextMessage?.text ||
                        message.message?.imageMessage?.caption ||
                        'Mensagem de mídia';
                    // Determinar tipo de mensagem
                    let messageType = 'text';
                    if (message.message?.imageMessage)
                        messageType = 'image';
                    else if (message.message?.audioMessage)
                        messageType = 'audio';
                    else if (message.message?.videoMessage)
                        messageType = 'video';
                    else if (message.message?.documentMessage)
                        messageType = 'document';
                    // Buscar instância no banco
                    const instanceResult = await (0, database_1.query)('SELECT id FROM whatsapp_connections WHERE instance_name = $1', [event.instance]);
                    if (instanceResult.rows.length > 0) {
                        const instanceId = instanceResult.rows[0].id;
                        // Buscar ou criar contato
                        let contactResult = await (0, database_1.query)('SELECT id FROM whatsapp_contacts WHERE instance_id = $1 AND phone_number = $2', [instanceId, remoteJid.split('@')[0]]);
                        if (contactResult.rows.length === 0) {
                            // Criar novo contato
                            contactResult = await (0, database_1.query)(`INSERT INTO whatsapp_contacts (instance_id, phone_number, name, status)
                 VALUES ($1, $2, $3, 'active')
                 RETURNING id`, [instanceId, remoteJid.split('@')[0], message.pushName || 'Desconhecido']);
                        }
                        const contactId = contactResult.rows[0].id;
                        // Salvar mensagem
                        await (0, database_1.query)(`INSERT INTO whatsapp_messages 
               (instance_id, contact_id, message_id, content, message_type, direction, from_me)
               VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                            instanceId,
                            contactId,
                            id,
                            messageContent,
                            messageType,
                            fromMe ? 'outgoing' : 'incoming',
                            fromMe
                        ]);
                        // Se não é nossa mensagem, criar ou atualizar atendimento
                        if (!fromMe) {
                            let attendanceResult = await (0, database_1.query)(`SELECT id FROM attendances 
                 WHERE client_phone = $1 AND status IN ('active', 'waiting')
                 ORDER BY created_at DESC
                 LIMIT 1`, [remoteJid.split('@')[0]]);
                            if (attendanceResult.rows.length === 0) {
                                // Criar novo atendimento
                                await (0, database_1.query)(`INSERT INTO attendances 
                   (client_phone, client_name, initial_message, status, assigned_to)
                   VALUES ($1, $2, $3, 'waiting', 'ai')`, [remoteJid.split('@')[0], message.pushName || 'Desconhecido', messageContent]);
                            }
                            else {
                                // Atualizar atendimento existente
                                await (0, database_1.query)(`UPDATE attendances 
                   SET updated_at = NOW()
                   WHERE id = $1`, [attendanceResult.rows[0].id]);
                            }
                        }
                    }
                }
                break;
            case 'contacts.upsert':
                if (event.data && Array.isArray(event.data)) {
                    const instanceResult = await (0, database_1.query)('SELECT id FROM whatsapp_connections WHERE instance_name = $1', [event.instance]);
                    if (instanceResult.rows.length > 0) {
                        const instanceId = instanceResult.rows[0].id;
                        for (const contact of event.data) {
                            await (0, database_1.query)(`INSERT INTO whatsapp_contacts (instance_id, phone_number, name, status)
                 VALUES ($1, $2, $3, 'active')
                 ON CONFLICT (instance_id, phone_number) 
                 DO UPDATE SET name = $3, updated_at = NOW()`, [instanceId, contact.id.split('@')[0], contact.name || contact.id.split('@')[0]]);
                        }
                    }
                }
                break;
            default:
                console.log('Evento não tratado:', event.event);
        }
        res.json({ success: true });
    }
    catch (error) {
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
    }
    catch (error) {
        console.error('Stripe webhook error:', error);
        res.status(500).json({ error: 'Erro ao processar webhook' });
    }
});
exports.default = router;
