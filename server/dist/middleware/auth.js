"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireSupport = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
        req.userRole = decoded.role;
        next();
    }
    catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (req.userRole !== 'admin' && req.userRole !== 'super_admin') {
        return res.status(403).json({ error: 'Acesso negado: requer permissão de admin' });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireSupport = (req, res, next) => {
    if (!['admin', 'super_admin', 'support'].includes(req.userRole || '')) {
        return res.status(403).json({ error: 'Acesso negado: requer permissão de suporte' });
    }
    next();
};
exports.requireSupport = requireSupport;
