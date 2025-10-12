import { Client, LocalAuth, MessageMedia } from 'whatsapp-web.js';
import QRCode from 'qrcode';
import { query } from '../config/database';
import path from 'path';

interface WhatsAppSession {
  adminId: string;
  client: Client;
  qrCode: string | null;
  isReady: boolean;
  phoneNumber: string | null;
}

class WWebClientManager {
  private sessions: Map<string, WhatsAppSession> = new Map();
  private sessionsPath = path.join(__dirname, '../../.wwebjs_auth');

  async initializeSession(adminId: string): Promise<string | null> {
    try {
      // Verificar se já existe sessão ativa
      if (this.sessions.has(adminId)) {
        const session = this.sessions.get(adminId)!;
        if (session.isReady) {
          return null; // Já conectado
        }
      }

      // Criar novo cliente
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: adminId,
          dataPath: this.sessionsPath
        }),
        puppeteer: {
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
          ]
        }
      });

      const session: WhatsAppSession = {
        adminId,
        client,
        qrCode: null,
        isReady: false,
        phoneNumber: null
      };

      this.sessions.set(adminId, session);

      // Retornar promessa com o QR Code
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout ao gerar QR Code'));
        }, 60000);

        client.on('qr', async (qr) => {
          try {
            const qrDataUrl = await QRCode.toDataURL(qr);
            session.qrCode = qrDataUrl;
            
            // Salvar no banco
            await query(
              `INSERT INTO whatsapp_connections 
               (admin_user_id, status, qr_code, updated_at) 
               VALUES ($1, $2, $3, NOW()) 
               ON CONFLICT (admin_user_id) 
               DO UPDATE SET status = $2, qr_code = $3, updated_at = NOW()`,
              [adminId, 'waiting_qr', qrDataUrl]
            );

            clearTimeout(timeout);
            resolve(qrDataUrl);
          } catch (error) {
            console.error('Erro ao gerar QR Code:', error);
            reject(error);
          }
        });

        client.on('ready', async () => {
          console.log(`Cliente WhatsApp pronto para admin ${adminId}`);
          session.isReady = true;
          session.qrCode = null;

          const info = client.info;
          session.phoneNumber = info?.wid?.user || null;

          // Atualizar banco de dados
          await query(
            `UPDATE whatsapp_connections 
             SET status = $1, phone_number = $2, qr_code = NULL, last_connection = NOW(), updated_at = NOW() 
             WHERE admin_user_id = $3`,
            ['connected', session.phoneNumber, adminId]
          );
        });

        client.on('authenticated', () => {
          console.log(`Cliente WhatsApp autenticado para admin ${adminId}`);
        });

        client.on('auth_failure', async (msg) => {
          console.error(`Falha na autenticação para admin ${adminId}:`, msg);
          session.isReady = false;
          
          await query(
            `UPDATE whatsapp_connections 
             SET status = $1, updated_at = NOW() 
             WHERE admin_user_id = $2`,
            ['auth_failed', adminId]
          );
        });

        client.on('disconnected', async (reason) => {
          console.log(`Cliente desconectado para admin ${adminId}:`, reason);
          session.isReady = false;
          this.sessions.delete(adminId);

          await query(
            `UPDATE whatsapp_connections 
             SET status = $1, updated_at = NOW() 
             WHERE admin_user_id = $2`,
            ['disconnected', adminId]
          );
        });

        client.initialize().catch((error) => {
          console.error('Erro ao inicializar cliente:', error);
          clearTimeout(timeout);
          reject(error);
        });
      });
    } catch (error) {
      console.error('Erro ao inicializar sessão:', error);
      throw error;
    }
  }

  async getSession(adminId: string): Promise<WhatsAppSession | null> {
    return this.sessions.get(adminId) || null;
  }

  async getContacts(adminId: string) {
    const session = this.sessions.get(adminId);
    if (!session || !session.isReady) {
      throw new Error('Sessão não está pronta');
    }

    const contacts = await session.client.getContacts();
    return contacts
      .filter(contact => !contact.isMe && !contact.isGroup)
      .map(contact => ({
        id: contact.id._serialized,
        name: contact.name || contact.pushname || contact.number,
        pushName: contact.pushname,
        phone: contact.number,
        profilePicUrl: null, // Será buscado separadamente se necessário
        isGroup: contact.isGroup
      }))
      .slice(0, 100); // Limitar para performance
  }

  async getChats(adminId: string) {
    const session = this.sessions.get(adminId);
    if (!session || !session.isReady) {
      throw new Error('Sessão não está pronta');
    }

    const chats = await session.client.getChats();
    const formattedChats = await Promise.all(
      chats.slice(0, 50).map(async (chat) => {
        const contact = await chat.getContact();
        let profilePicUrl = null;
        
        try {
          profilePicUrl = await contact.getProfilePicUrl();
        } catch (e) {
          // Foto de perfil não disponível
        }

        return {
          id: chat.id._serialized,
          name: contact.name || contact.pushname || chat.name,
          pushName: contact.pushname,
          phone: contact.number,
          profilePicUrl,
          isGroup: chat.isGroup,
          unreadCount: chat.unreadCount,
          lastMessage: chat.lastMessage ? {
            body: chat.lastMessage.body,
            timestamp: chat.lastMessage.timestamp,
            fromMe: chat.lastMessage.fromMe
          } : null
        };
      })
    );

    return formattedChats;
  }

  async getMessages(adminId: string, chatId: string, limit: number = 50) {
    const session = this.sessions.get(adminId);
    if (!session || !session.isReady) {
      throw new Error('Sessão não está pronta');
    }

    const chat = await session.client.getChatById(chatId);
    const messages = await chat.fetchMessages({ limit });

    return messages.map(msg => ({
      id: msg.id._serialized,
      body: msg.body,
      timestamp: msg.timestamp,
      fromMe: msg.fromMe,
      author: msg.author || msg.from,
      type: msg.type,
      hasMedia: msg.hasMedia
    }));
  }

  async sendMessage(adminId: string, phoneNumber: string, message: string) {
    const session = this.sessions.get(adminId);
    if (!session || !session.isReady) {
      throw new Error('Sessão não está pronta');
    }

    const chatId = phoneNumber.includes('@') ? phoneNumber : `${phoneNumber}@c.us`;
    const response = await session.client.sendMessage(chatId, message);

    return {
      id: response.id._serialized,
      timestamp: response.timestamp,
      body: response.body
    };
  }

  async disconnect(adminId: string) {
    const session = this.sessions.get(adminId);
    if (session) {
      await session.client.destroy();
      this.sessions.delete(adminId);

      await query(
        `UPDATE whatsapp_connections 
         SET status = $1, updated_at = NOW() 
         WHERE admin_user_id = $2`,
        ['disconnected', adminId]
      );
    }
  }

  async getStatus(adminId: string) {
    const session = this.sessions.get(adminId);
    
    if (!session) {
      // Verificar no banco de dados
      const result = await query(
        `SELECT status, phone_number, last_connection 
         FROM whatsapp_connections 
         WHERE admin_user_id = $1`,
        [adminId]
      );

      if (result.rows.length > 0) {
        return {
          connected: false,
          status: result.rows[0].status,
          phoneNumber: result.rows[0].phone_number,
          lastConnection: result.rows[0].last_connection
        };
      }

      return {
        connected: false,
        status: 'not_initialized'
      };
    }

    return {
      connected: session.isReady,
      status: session.isReady ? 'connected' : 'initializing',
      phoneNumber: session.phoneNumber,
      qrCode: session.qrCode
    };
  }

  async restoreSession(adminId: string) {
    try {
      // Verificar se existe sessão salva
      const result = await query(
        `SELECT * FROM whatsapp_connections 
         WHERE admin_user_id = $1 AND status = 'connected'`,
        [adminId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      // Tentar restaurar a sessão
      return await this.initializeSession(adminId);
    } catch (error) {
      console.error('Erro ao restaurar sessão:', error);
      return null;
    }
  }
}

// Singleton
export const wwebManager = new WWebClientManager();
