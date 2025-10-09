import { WhatsAppInstance, Contact } from './whatsapp-service';
import { instanceDb, contactDb, messageDb } from './browser-database';

export interface WebhookMessage {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  pushName?: string;
  message: any;
  messageTimestamp: number;
  instanceId: string;
  source: string;
}

export interface WebhookContact {
  id: string;
  pushName?: string;
  name?: string;
  notify?: string;
}

export interface WebhookConnectionUpdate {
  instance: string;
  state: 'open' | 'connecting' | 'close';
  statusReason?: number;
}

export interface WebhookQRCode {
  instance: string;
  qrcode: string;
}

export class WebhookHandler {
  private static instance: WebhookHandler;
  private eventListeners: Map<string, Function[]> = new Map();

  static getInstance(): WebhookHandler {
    if (!WebhookHandler.instance) {
      WebhookHandler.instance = new WebhookHandler();
    }
    return WebhookHandler.instance;
  }

  // Registrar listener para eventos
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  // Remover listener
  off(event: string, callback: Function) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Emitir evento
  private emit(event: string, data: any) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro no listener do evento ${event}:`, error);
        }
      });
    }
  }

  // Processar webhook de mensagem recebida
  async handleMessage(data: WebhookMessage) {
    try {
      console.log('📨 Webhook - Nova mensagem:', data);

      // Extrair informações da mensagem
      const { key, pushName, message, messageTimestamp, instanceId } = data;
      const { remoteJid, fromMe, id } = key;

      // Buscar instância no banco local
      const instance = await instanceDb.findByName(instanceId);
      if (!instance) {
        console.warn('Instância não encontrada no banco local:', instanceId);
        return;
      }

      // Determinar tipo da mensagem
      let messageType = 'text';
      let messageContent = '';

      if (message.conversation) {
        messageType = 'text';
        messageContent = message.conversation;
      } else if (message.extendedTextMessage?.text) {
        messageType = 'text';
        messageContent = message.extendedTextMessage.text;
      } else if (message.imageMessage) {
        messageType = 'image';
        messageContent = message.imageMessage.caption || '[Imagem]';
      } else if (message.videoMessage) {
        messageType = 'video';
        messageContent = message.videoMessage.caption || '[Vídeo]';
      } else if (message.audioMessage) {
        messageType = 'audio';
        messageContent = '[Áudio]';
      } else if (message.documentMessage) {
        messageType = 'document';
        messageContent = message.documentMessage.fileName || '[Documento]';
      } else if (message.stickerMessage) {
        messageType = 'sticker';
        messageContent = '[Figurinha]';
      } else {
        messageType = 'unknown';
        messageContent = '[Mensagem não suportada]';
      }

      // Salvar mensagem no banco local
      await messageDb.add(instance.id!, 0, messageContent, messageType, fromMe ? 'outgoing' : 'incoming');

      // Atualizar ou criar contato se a mensagem não é nossa
      if (!fromMe && pushName) {
        const phoneNumber = remoteJid.replace('@s.whatsapp.net', '');
        await contactDb.add(instance.id!, pushName, phoneNumber, 'active');
      }

      // Emitir evento para componentes React
      this.emit('message:received', {
        instanceName: instance.instance_name,
        remoteJid,
        fromMe,
        pushName,
        messageType,
        content: messageContent,
        timestamp: new Date(messageTimestamp * 1000)
      });

    } catch (error) {
      console.error('Erro ao processar webhook de mensagem:', error);
    }
  }

  // Processar webhook de atualização de conexão
  async handleConnectionUpdate(data: WebhookConnectionUpdate) {
    try {
      console.log('🔄 Webhook - Atualização de conexão:', data);

      const { instance: instanceName, state } = data;

      // Mapear estado da Evolution API para nosso formato
      let status: WhatsAppInstance['status'];
      switch (state) {
        case 'open':
          status = 'connected';
          break;
        case 'connecting':
          status = 'connecting';
          break;
        case 'close':
        default:
          status = 'disconnected';
          break;
      }

      // Atualizar no banco local
      await instanceDb.updateStatus(instanceName, status);

      // Emitir evento para componentes React
      this.emit('connection:update', {
        instanceName,
        status,
        state
      });

    } catch (error) {
      console.error('Erro ao processar webhook de conexão:', error);
    }
  }

  // Processar webhook de QR Code
  async handleQRCode(data: WebhookQRCode) {
    try {
      console.log('📱 Webhook - QR Code atualizado:', data.instance);

      const { instance: instanceName, qrcode } = data;

      // Gerar imagem base64 do QR code (se necessário)
      // A Evolution API já pode enviar o QR code como string
      
      // Atualizar no banco local
      const instance = await instanceDb.findByName(instanceName);
      if (instance) {
        await instanceDb.upsert({
          instanceName,
          instanceId: instance.instance_id,
          status: 'connecting',
          qrCode: `data:image/png;base64,${qrcode}` // Assumindo que vem como base64
        });
      }

      // Emitir evento para componentes React
      this.emit('qrcode:updated', {
        instanceName,
        qrCode: `data:image/png;base64,${qrcode}`
      });

    } catch (error) {
      console.error('Erro ao processar webhook de QR Code:', error);
    }
  }

  // Processar webhook de contatos
  async handleContacts(data: { instance: string; contacts: WebhookContact[] }) {
    try {
      console.log('👥 Webhook - Contatos atualizados:', data.instance, data.contacts.length);

      const { instance: instanceName, contacts } = data;

      // Buscar instância no banco local
      const instance = await instanceDb.findByName(instanceName);
      if (!instance || !instance.id) {
        console.warn('Instância não encontrada:', instanceName);
        return;
      }

      // Processar cada contato
      let syncedCount = 0;
      for (const contact of contacts) {
        try {
          const name = contact.pushName || contact.name || contact.notify || 'Sem nome';
          const phoneNumber = contact.id.replace('@s.whatsapp.net', '');
          
          await contactDb.add(instance.id, name, phoneNumber, 'active');
          syncedCount++;
        } catch (error) {
          console.error('Erro ao processar contato:', contact, error);
        }
      }

      // Emitir evento para componentes React
      this.emit('contacts:updated', {
        instanceName,
        syncedCount,
        totalContacts: contacts.length
      });

    } catch (error) {
      console.error('Erro ao processar webhook de contatos:', error);
    }
  }

  // Método genérico para processar qualquer webhook
  async processWebhook(event: string, data: any) {
    console.log(`🎣 Webhook recebido - Evento: ${event}`, data);

    switch (event) {
      case 'messages.upsert':
        if (data.messages && Array.isArray(data.messages)) {
          for (const message of data.messages) {
            await this.handleMessage(message);
          }
        }
        break;

      case 'connection.update':
        await this.handleConnectionUpdate(data);
        break;

      case 'qrcode.updated':
        await this.handleQRCode(data);
        break;

      case 'contacts.set':
      case 'contacts.upsert':
        if (data.contacts) {
          await this.handleContacts(data);
        }
        break;

      default:
        console.log(`Evento de webhook não tratado: ${event}`);
        break;
    }
  }
}

// Exportar instância singleton
export const webhookHandler = WebhookHandler.getInstance();

// Função para configurar endpoint de webhook (para uso futuro com servidor)
export function setupWebhookEndpoint(port: number = 3001) {
  console.log(`🎣 Webhook endpoint configurado para receber em http://localhost:${port}/webhook`);
  
  // Aqui poderia ser implementado um servidor Express simples para receber webhooks
  // Por enquanto, deixamos como placeholder para integração futura
  
  return {
    url: `http://localhost:${port}/webhook`,
    port
  };
}