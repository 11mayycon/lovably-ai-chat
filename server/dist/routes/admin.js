"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Create admin
router.post('/create', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email e senha são obrigatórios' });
        }
        // Check if user exists
        const existingUser = await (0, database_1.query)('SELECT id FROM profiles WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const userResult = await (0, database_1.query)(`INSERT INTO profiles (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name`, [email, full_name, hashedPassword]);
        const newUser = userResult.rows[0];
        // Add admin role
        await (0, database_1.query)('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [newUser.id, 'admin']);
        res.status(201).json({
            success: true,
            user: newUser
        });
    }
    catch (error) {
        console.error('Create admin error:', error);
        res.status(500).json({ error: 'Erro ao criar administrador' });
    }
});
// Delete admin
router.delete('/:userId', auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { userId } = req.params;
        // Don't allow deleting self
        if (userId === req.userId) {
            return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
        }
        await (0, database_1.query)('DELETE FROM profiles WHERE id = $1', [userId]);
        res.json({ success: true });
    }
    catch (error) {
        console.error('Delete admin error:', error);
        res.status(500).json({ error: 'Erro ao deletar administrador' });
    }
});
// Create first admin (public endpoint - only works if no admins exist)
router.post('/first', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        // Check if any admin exists
        const adminCheck = await (0, database_1.query)('SELECT COUNT(*) as count FROM user_roles WHERE role = $1', ['admin']);
        if (parseInt(adminCheck.rows[0].count) > 0) {
            return res.status(403).json({ error: 'Administrador já existe no sistema' });
        }
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        const userResult = await (0, database_1.query)(`INSERT INTO profiles (email, full_name, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name`, [email, full_name, hashedPassword]);
        const newUser = userResult.rows[0];
        await (0, database_1.query)('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [newUser.id, 'super_admin']);
        res.status(201).json({
            success: true,
            user: newUser
        });
    }
    catch (error) {
        console.error('Create first admin error:', error);
        res.status(500).json({ error: 'Erro ao criar primeiro administrador' });
    }
});
exports.default = router;
