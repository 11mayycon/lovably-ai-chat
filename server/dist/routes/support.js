"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Get all support rooms
router.get('/rooms', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const result = await (0, database_1.query)(`SELECT sr.*, 
              p.full_name as admin_name,
              (SELECT COUNT(*) FROM room_members WHERE room_id = sr.id) as member_count
       FROM support_rooms sr
       LEFT JOIN profiles p ON sr.admin_owner_id = p.id
       ORDER BY sr.created_at DESC`);
        res.json({ rooms: result.rows });
    }
    catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Erro ao buscar salas' });
    }
});
// Create support room
router.post('/rooms', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { name, description, max_members } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'Nome da sala é obrigatório' });
        }
        const result = await (0, database_1.query)(`INSERT INTO support_rooms (name, description, max_members, admin_owner_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`, [name, description, max_members || 10, req.userId]);
        res.status(201).json({ room: result.rows[0] });
    }
    catch (error) {
        console.error('Create room error:', error);
        res.status(500).json({ error: 'Erro ao criar sala' });
    }
});
// Delete support room
router.delete('/rooms/:roomId', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { roomId } = req.params;
        await (0, database_1.query)('DELETE FROM support_rooms WHERE id = $1', [roomId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete room error:', error);
        res.status(500).json({ error: 'Erro ao deletar sala' });
    }
});
// Support login
router.post('/login', async (req, res) => {
    try {
        const { matricula } = req.body;
        if (!matricula) {
            return res.status(400).json({ error: 'Matrícula é obrigatória' });
        }
        const result = await (0, database_1.query)(`SELECT id, full_name, email, matricula, is_active
       FROM support_users
       WHERE matricula = $1 AND is_active = true`, [matricula]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Matrícula não encontrada ou inativa' });
        }
        res.json({ user: result.rows[0] });
    }
    catch (error) {
        console.error('Support login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});
exports.default = router;
