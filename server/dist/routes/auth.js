"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Signup
router.post('/signup', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;
        // Verificar se usuário já existe
        const existingUser = await (0, database_1.query)('SELECT id FROM profiles WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email já cadastrado' });
        }
        // Hash da senha
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Criar usuário
        const userResult = await (0, database_1.query)(`INSERT INTO profiles (email, full_name, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name`, [email, full_name, hashedPassword]);
        const user = userResult.rows[0];
        // Criar role padrão
        await (0, database_1.query)('INSERT INTO user_roles (user_id, role) VALUES ($1, $2)', [user.id, 'user']);
        // Gerar token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role: 'user' }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            },
            token
        });
    }
    catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Erro ao criar conta' });
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Buscar usuário
        const userResult = await (0, database_1.query)('SELECT id, email, full_name, password_hash FROM profiles WHERE email = $1', [email]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }
        const user = userResult.rows[0];
        // Verificar senha
        const validPassword = await bcryptjs_1.default.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }
        // Buscar role
        const roleResult = await (0, database_1.query)('SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1', [user.id]);
        const role = roleResult.rows[0]?.role || 'user';
        // Gerar token
        const token = jsonwebtoken_1.default.sign({ userId: user.id, role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name
            },
            token,
            role
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro ao fazer login' });
    }
});
// Get current user
router.get('/me', async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: 'Token não fornecido' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        const userResult = await (0, database_1.query)('SELECT id, email, full_name, created_at FROM profiles WHERE id = $1', [decoded.userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        const roleResult = await (0, database_1.query)('SELECT role FROM user_roles WHERE user_id = $1', [decoded.userId]);
        res.json({
            user: userResult.rows[0],
            role: roleResult.rows[0]?.role || 'user'
        });
    }
    catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Erro ao buscar usuário' });
    }
});
exports.default = router;
