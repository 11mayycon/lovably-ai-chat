import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/database';

const router = Router();

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    // Verificar se usuário já existe
    const existingUser = await query(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const userResult = await query(
      `INSERT INTO profiles (email, full_name, password_hash) 
       VALUES ($1, $2, $3) 
       RETURNING id, email, full_name`,
      [email, full_name, hashedPassword]
    );

    const user = userResult.rows[0];

    // Criar role padrão
    await query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [user.id, 'user']
    );

    // Gerar token
    const token = jwt.sign(
      { userId: user.id, role: 'user' },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      token
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Erro ao criar conta' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuário
    const userResult = await query(
      'SELECT id, email, full_name, password_hash FROM profiles WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    const user = userResult.rows[0];

    // Verificar senha
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha inválidos' });
    }

    // Buscar role
    const roleResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1 LIMIT 1',
      [user.id]
    );

    const role = roleResult.rows[0]?.role || 'user';

    // Gerar token
    const token = jwt.sign(
      { userId: user.id, role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      token,
      role
    });
  } catch (error) {
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

    const userResult = await query(
      'SELECT id, email, full_name, created_at FROM profiles WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const roleResult = await query(
      'SELECT role FROM user_roles WHERE user_id = $1',
      [decoded.userId]
    );

    res.json({
      user: userResult.rows[0],
      role: roleResult.rows[0]?.role || 'user'
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

export default router;
