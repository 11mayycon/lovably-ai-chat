"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const whatsapp_1 = __importDefault(require("./routes/whatsapp"));
const attendances_1 = __importDefault(require("./routes/attendances"));
const support_1 = __importDefault(require("./routes/support"));
const ai_1 = __importDefault(require("./routes/ai"));
const admin_1 = __importDefault(require("./routes/admin"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const database_1 = require("./config/database");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rotas
app.use('/api/auth', auth_1.default);
app.use('/api/whatsapp', whatsapp_1.default);
app.use('/api/attendances', attendances_1.default);
app.use('/api/support', support_1.default);
app.use('/api/ai', ai_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/webhooks', webhooks_1.default);
// Health check
app.get('/health', async (req, res) => {
    try {
        await database_1.pool.query('SELECT NOW()');
        res.json({ status: 'OK', database: 'connected' });
    }
    catch (error) {
        res.status(500).json({ status: 'ERROR', database: 'disconnected' });
    }
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Database: ${process.env.DATABASE_URL?.split('@')[1]}`);
});
