import { Router } from 'express';
import { query } from '../config/database';
import { authenticateToken, requireAdmin, AuthRequest } from '../middleware/auth';
import { wwebManager } from '../services/wweb-client';

const router = Router();

// Initialize WhatsApp session (Generate QR Code)
router.post('/init-session', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    // Verificar se já está conectado
    const status = await wwebManager.getStatus(adminId);
    if (status.connected) {
      return res.json({ 
        success: true, 
        message: 'WhatsApp já está conectado',
        phoneNumber: status.phoneNumber
      });
    }

    // Inicializar nova sessão e gerar QR Code
    const qrCode = await wwebManager.initializeSession(adminId);
    
    res.json({ 
      success: true, 
      qrCode,
      message: 'QR Code gerado. Escaneie com seu WhatsApp.'
    });
  } catch (error: any) {
    console.error('Init session error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao inicializar sessão WhatsApp' 
    });
  }
});

// Get session status
router.get('/status', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const status = await wwebManager.getStatus(adminId);
    res.json({ success: true, data: status });
  } catch (error: any) {
    console.error('Get status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar status da sessão' 
    });
  }
});

// Get QR Code (if still waiting)
router.get('/qrcode', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const status = await wwebManager.getStatus(adminId);
    
    if (status.qrCode) {
      res.json({ success: true, qrCode: status.qrCode });
    } else {
      res.json({ 
        success: false, 
        message: 'QR Code não disponível. Inicie uma nova sessão ou aguarde.' 
      });
    }
  } catch (error: any) {
    console.error('Get QR code error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar QR code' 
    });
  }
});

// Disconnect WhatsApp
router.post('/disconnect', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    await wwebManager.disconnect(adminId);
    res.json({ success: true, message: 'WhatsApp desconectado com sucesso' });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao desconectar WhatsApp' 
    });
  }
});

// Get chats (similar to Evolution API /chat/getChats)
router.get('/chats', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId || req.query.adminId as string;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Admin ID não fornecido' });
    }

    const chats = await wwebManager.getChats(adminId);
    res.json({ success: true, data: chats });
  } catch (error: any) {
    console.error('Get chats error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar conversas' 
    });
  }
});

// Get messages from a specific chat
router.get('/messages/:chatId', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId || req.query.adminId as string;
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Admin ID não fornecido' });
    }

    const messages = await wwebManager.getMessages(adminId, chatId, limit);
    res.json({ success: true, data: messages });
  } catch (error: any) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar mensagens' 
    });
  }
});

// Get contacts
router.get('/contacts', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId || req.query.adminId as string;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Admin ID não fornecido' });
    }

    const contacts = await wwebManager.getContacts(adminId);
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    console.error('Get contacts error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao buscar contatos' 
    });
  }
});

// Send WhatsApp message
router.post('/send-message', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId || req.body.adminId;
    const { phoneNumber, message } = req.body;

    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Admin ID não fornecido' });
    }

    if (!phoneNumber || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'phoneNumber e message são obrigatórios' 
      });
    }

    const formattedPhone = phoneNumber.replace(/\D/g, '');
    const response = await wwebManager.sendMessage(adminId, formattedPhone, message);

    res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao enviar mensagem' 
    });
  }
});

// Restore session on server startup
router.post('/restore-session', authenticateToken, requireAdmin, async (req: AuthRequest, res) => {
  try {
    const adminId = req.user?.userId;
    
    if (!adminId) {
      return res.status(401).json({ success: false, error: 'Usuário não autenticado' });
    }

    const qrCode = await wwebManager.restoreSession(adminId);
    
    if (qrCode) {
      res.json({ 
        success: true, 
        message: 'Sessão restaurada. Escaneie o QR Code.',
        qrCode
      });
    } else {
      res.json({ 
        success: true, 
        message: 'Sessão restaurada com sucesso' 
      });
    }
  } catch (error: any) {
    console.error('Restore session error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Erro ao restaurar sessão' 
    });
  }
});

export default router;
