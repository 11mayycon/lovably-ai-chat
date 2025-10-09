"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const EVO_BASE_URL = process.env.EVO_BASE_URL;
const EVO_API_KEY = process.env.EVO_API_KEY;
// Create WhatsApp instance
router.post('/create-instance', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { instanceName } = req.body;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'instanceName é obrigatório' });
        }
        // Check if instance already exists in database
        const existingInstance = await (0, database_1.query)('SELECT * FROM whatsapp_connections WHERE instance_name = $1', [instanceName]);
        if (existingInstance.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Instância já existe. Use o botão QR Code para reconectar.'
            });
        }
        const response = await axios_1.default.post(`${EVO_BASE_URL}/instance/create`, {
            instanceName,
            token: EVO_API_KEY,
            qrcode: true,
            integration: 'WHATSAPP-BAILEYS'
        }, {
            headers: {
                'Content-Type': 'application/json',
                apikey: EVO_API_KEY
            }
        });
        // Save instance to database
        await (0, database_1.query)(`INSERT INTO whatsapp_connections (instance_name, status, created_at, updated_at) 
       VALUES ($1, $2, NOW(), NOW()) 
       ON CONFLICT (instance_name) 
       DO UPDATE SET status = $2, updated_at = NOW()`, [instanceName, 'created']);
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Create instance error:', error.response?.data || error);
        // Handle specific Evolution API errors
        if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
            return res.status(409).json({
                success: false,
                error: 'Instância já existe. Use o botão QR Code para reconectar.'
            });
        }
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao criar instância'
        });
    }
});
// Get instance status
router.get('/instance-status/:instanceName', auth_1.authenticateToken, async (req, res) => {
    try {
        const { instanceName } = req.params;
        const response = await axios_1.default.get(`${EVO_BASE_URL}/instance/connectionState/${instanceName}`, {
            headers: { apikey: EVO_API_KEY }
        });
        // Update status in database
        const status = response.data.instance?.state === 'open' ? 'connected' : 'disconnected';
        await (0, database_1.query)(`UPDATE whatsapp_connections SET status = $1, updated_at = NOW() WHERE instance_name = $2`, [status, instanceName]);
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Get instance status error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao buscar status da instância'
        });
    }
});
// Get QR Code
router.get('/qrcode/:instanceName', auth_1.authenticateToken, async (req, res) => {
    try {
        const { instanceName } = req.params;
        const response = await axios_1.default.get(`${EVO_BASE_URL}/instance/connect/${instanceName}`, {
            headers: { apikey: EVO_API_KEY }
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Get QR code error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao buscar QR code'
        });
    }
});
// Delete instance
router.delete('/instance/:instanceName', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { instanceName } = req.params;
        const response = await axios_1.default.delete(`${EVO_BASE_URL}/instance/delete/${instanceName}`, {
            headers: { apikey: EVO_API_KEY }
        });
        // Remove from database
        await (0, database_1.query)(`DELETE FROM whatsapp_connections WHERE instance_name = $1`, [instanceName]);
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Delete instance error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao deletar instância'
        });
    }
});
// List all instances
router.get('/instances', auth_1.authenticateToken, async (req, res) => {
    try {
        const response = await axios_1.default.get(`${EVO_BASE_URL}/instance/fetchInstances`, {
            headers: { apikey: EVO_API_KEY }
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('List instances error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao listar instâncias'
        });
    }
});
// Restart instance
router.post('/restart-instance/:instanceName', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { instanceName } = req.params;
        const response = await axios_1.default.put(`${EVO_BASE_URL}/instance/restart/${instanceName}`, {}, {
            headers: { apikey: EVO_API_KEY }
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Restart instance error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao reiniciar instância'
        });
    }
});
// Logout instance
router.post('/logout-instance/:instanceName', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { instanceName } = req.params;
        const response = await axios_1.default.delete(`${EVO_BASE_URL}/instance/logout/${instanceName}`, {
            headers: { apikey: EVO_API_KEY }
        });
        // Update status in database
        await (0, database_1.query)(`UPDATE whatsapp_connections SET status = $1, updated_at = NOW() WHERE instance_name = $2`, ['disconnected', instanceName]);
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Logout instance error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao desconectar instância'
        });
    }
});
// Get connected WhatsApp instance
router.get('/connected-instance', auth_1.authenticateToken, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT instance_name, status FROM whatsapp_connections 
       WHERE status = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`, ['connected']);
        res.json({ success: true, instance: result.rows[0] || null });
    }
    catch (error) {
        console.error('Get connected instance error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar instância conectada' });
    }
});
// Get WhatsApp connections from database
router.get('/contacts', auth_1.authenticateToken, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT id, instance_name, status, created_at, updated_at 
       FROM whatsapp_connections 
       ORDER BY created_at DESC`);
        res.json({ success: true, data: result.rows });
    }
    catch (error) {
        console.error('Get WhatsApp connections error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar conexões WhatsApp' });
    }
});
// Get WhatsApp contacts from Evolution API
router.post('/contacts', auth_1.authenticateToken, async (req, res) => {
    try {
        const { instanceName } = req.body;
        if (!instanceName) {
            return res.status(400).json({ success: false, error: 'instanceName é obrigatório' });
        }
        const response = await axios_1.default.get(`${EVO_BASE_URL}/contact/findContacts/${instanceName}`, {
            headers: { apikey: EVO_API_KEY }
        });
        const contacts = response.data
            .filter((contact) => contact.id && contact.id.includes('@'))
            .map((contact) => ({
            id: contact.id,
            name: contact.pushName || contact.id.split('@')[0],
            phone: contact.id.split('@')[0],
            profilePicUrl: contact.profilePicUrl,
            isGroup: contact.id.includes('@g.us'),
            lastSeen: contact.lastSeen
        }))
            .slice(0, 50);
        res.json({ success: true, contacts, total: contacts.length });
    }
    catch (error) {
        console.error('Get contacts error:', error);
        res.status(500).json({ success: false, error: 'Erro ao buscar contatos' });
    }
});
// Send WhatsApp message
router.post('/send-message', auth_1.authenticateToken, async (req, res) => {
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
        const response = await axios_1.default.post(`${EVO_BASE_URL}/message/sendText/${instanceName}`, payload, {
            headers: {
                'Content-Type': 'application/json',
                apikey: EVO_API_KEY
            }
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Send message error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao enviar mensagem'
        });
    }
});
// Set WhatsApp webhook
router.post('/set-webhook', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { instanceName, webhookUrl } = req.body;
        if (!instanceName || !webhookUrl) {
            return res.status(400).json({ error: 'instanceName e webhookUrl são obrigatórios' });
        }
        const response = await axios_1.default.post(`${EVO_BASE_URL}/webhook/set/${instanceName}`, {
            url: webhookUrl,
            webhook_by_events: true,
            webhook_base64: false,
            events: [
                'MESSAGES_UPSERT',
                'MESSAGES_UPDATE',
                'CONNECTION_UPDATE'
            ]
        }, {
            headers: {
                'Content-Type': 'application/json',
                apikey: EVO_API_KEY
            }
        });
        res.json({ success: true, data: response.data });
    }
    catch (error) {
        console.error('Set webhook error:', error.response?.data || error);
        res.status(500).json({
            success: false,
            error: error.response?.data?.message || 'Erro ao configurar webhook'
        });
    }
});
exports.default = router;
