import QRCode from 'qrcode';
import { instanceDb, contactDb, messageDb } from './browser-database';

// Supabase Edge Functions (prod e dev)
const SUPABASE_URL: string | undefined = (import.meta as any).env?.VITE_SUPABASE_URL;
const DERIVED_FUNCTIONS_BASE = (() => {
  if (!SUPABASE_URL) return undefined;
  try {
    const host = new URL(SUPABASE_URL).hostname; // ex: <ref>.supabase.co
    const ref = host.split('.')[0];
    return `https://${ref}.functions.supabase.co`;
  } catch {
    return undefined;
  }
})();
// Em produção usamos "https://<ref>.functions.supabase.co"; em dev, fallback para CLI local
const FUNCTIONS_URL = (import.meta as any).env?.VITE_SUPABASE_FUNCTIONS_URL || DERIVED_FUNCTIONS_BASE || 'http://localhost:54321/functions/v1';

export interface WhatsAppInstance {
  instanceName: string;
  instanceId?: string;
  status: 'connecting' | 'connected' | 'disconnected';
  qrCode?: string;
  phoneNumber?: string;
  profileName?: string;
  profilePictureUrl?: string;
}

export interface Contact {
  id?: number;
  name: string;
  number: string;
  status: string;
  created_at: string;
}

class WhatsAppService {
  private instances: Map<string, WhatsAppInstance> = new Map();
  private initialized = false;

  constructor() {
    // Carregar instâncias do banco ao inicializar
    this.loadInstancesFromDb().catch(console.error);
  }

  private async loadInstancesFromDb() {
    try {
      // Aguardar um pouco para garantir que o IndexedDB esteja pronto
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const instances = await instanceDb.findAll();
      instances.forEach((instance: any) => {
        this.instances.set(instance.instance_name, {
          instanceName: instance.instance_name,
          instanceId: instance.instance_id,
          status: instance.status,
          qrCode: instance.qr_code,
          phoneNumber: instance.phone_number,
          profileName: instance.profile_name,
          profilePictureUrl: instance.profile_picture_url
        });
      });
      this.initialized = true;
    } catch (error) {
      console.error('Erro ao carregar instâncias do banco:', error);
      this.initialized = true; // Marcar como inicializado mesmo com erro
    }
  }

  private async callEvolution<T = any>(action: string, payload?: Record<string, any>): Promise<{ success: boolean; status?: number; data?: T; error?: string; body?: any }> {
    try {
      const res = await fetch(`${FUNCTIONS_URL}/evolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(payload || {}) })
      });

      const text = await res.text();
      let json: any = null;
      try { json = text ? JSON.parse(text) : null; } catch { json = null; }

      console.log('📡 Edge Function status:', res.status, res.statusText);
      if (!res.ok) {
        const message = json?.error || json?.message || `Falha na função (status ${res.status})`;
        return { success: false, status: res.status, error: message, body: json || text };
      }

      return { success: true, status: res.status, data: json };
    } catch (err: any) {
      console.error('❌ Erro na chamada da Edge Function:', err);
      return { success: false, error: err.message || 'Erro desconhecido' };
    }
  }

  // Gerar QR Code localmente
  async generateQRCode(text: string): Promise<string> {
    try {
      const qrCodeDataURL = await QRCode.toDataURL(text, {
        margin: 3,
        scale: 4,
        errorCorrectionLevel: 'H',
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      return qrCodeDataURL;
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      throw new Error('Falha ao gerar QR Code');
    }
  }

  // Criar instância via Edge Function (Evolution API)
  async createInstance(instanceName?: string): Promise<{ success: boolean; status?: number; data?: any; error?: string }> {
    try {
      const finalInstanceName = instanceName || `isa_admin_${Date.now().toString(36)}`;
      
      console.log('🟢 Criando instância pela Edge Function...');
      const response = await this.callEvolution('createInstance', { instanceName: finalInstanceName });

      if (response.success && response.data) {
        const data = response.data as any;
        const instanceData = data?.instance || {};
        
        // Salvar no banco local
        instanceDb.upsert({
          instanceName: finalInstanceName,
          instanceId: instanceData.instanceId,
          status: 'connecting'
        });

        // Atualizar cache local
        const instance: WhatsAppInstance = {
          instanceName: finalInstanceName,
          instanceId: instanceData.instanceId,
          status: 'connecting'
        };

        this.instances.set(finalInstanceName, instance);

        // Se há QR code na resposta, gerar a imagem
        const qrcode = data?.qrcode;
        if (qrcode) {
          const qrCodeImage = await this.generateQRCode(qrcode);
          
          // Atualizar com QR code
          instanceDb.upsert({
            instanceName: finalInstanceName,
            instanceId: instanceData.instanceId,
            status: 'connecting',
            qrCode: qrCodeImage
          });

          instance.qrCode = qrCodeImage;
          this.instances.set(finalInstanceName, instance);
        }

        return {
          success: true,
          status: response.status,
          data: {
            instance: instance,
            qrcode: instance.qrCode ? { code: qrcode, base64: instance.qrCode } : null
          }
        };
      }

      return { success: false, status: response.status, error: response.error || 'Falha ao criar instância' };
    } catch (error: any) {
      console.error('❌ Erro ao criar instância:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  // Verificar status da instância via Edge Function
  async checkInstanceStatus(instanceName: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🟢 Verificando status via Edge Function:', instanceName);
      const response = await this.callEvolution('checkStatus', { instanceName });

      if (response.success && response.data) {
        const statusData = response.data as any;
        const rawState = statusData?.instance?.state || statusData?.instance?.status || statusData?.state || statusData?.status;
        const isOpen = typeof rawState === 'string' && /open|connected/i.test(rawState);
        const newStatus: WhatsAppInstance['status'] = isOpen ? 'connected' : 'connecting';

        // Atualizar no banco
        instanceDb.updateStatus(instanceName, newStatus);

        // Atualizar cache
        const existing = this.instances.get(instanceName) || { instanceName, status: newStatus } as WhatsAppInstance;
        existing.status = newStatus;
        if (isOpen) {
          // Limpa QR ao conectar
          existing.qrCode = undefined;
        }
        if (statusData.instance?.profileName) existing.profileName = statusData.instance.profileName;
        if (statusData.instance?.phoneNumber) existing.phoneNumber = statusData.instance.phoneNumber;
        this.instances.set(instanceName, existing);

        return { success: true, data: statusData };
      }

      return { success: false, error: 'Falha ao verificar status' };
    } catch (error: any) {
      console.error('❌ Erro ao verificar status:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  // Desconectar instância via Edge Function
  async disconnectInstance(instanceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔴 Desconectando instância via Edge Function:', instanceName);
      const response = await this.callEvolution('deleteInstance', { instanceName });

      if (response.success) {
        // Atualizar no banco
        instanceDb.updateStatus(instanceName, 'disconnected');

        // Remover do cache
        this.instances.delete(instanceName);

        return { success: true };
      }

      return { success: false, error: response.error || 'Falha ao desconectar' };
    } catch (error: any) {
      console.error('❌ Erro ao desconectar:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }

  // Buscar instância existente
  getExistingInstance(): WhatsAppInstance | null {
    // Buscar a primeira instância ativa
    for (const [name, instance] of this.instances) {
      if (instance.status === 'connected' || instance.status === 'connecting') {
        return instance;
      }
    }
    return null;
  }

  // Buscar instância por nome
  getInstance(instanceName: string): WhatsAppInstance | null {
    return this.instances.get(instanceName) || null;
  }

  // Listar todas as instâncias
  getAllInstances(): WhatsAppInstance[] {
    return Array.from(this.instances.values());
  }

  // Buscar contatos
  async getContacts(instanceName?: string): Promise<Contact[]> {
    try {
      if (instanceName) {
        const instance = await instanceDb.findByName(instanceName);
        if (instance && instance.id) {
          return await contactDb.findByInstance(instance.id);
        }
        return [];
      }
      return await contactDb.findAll();
    } catch (error) {
      console.error('Erro ao buscar contatos:', error);
      return [];
    }
  }

  // Sincronizar contatos da Evolution API
  async syncContacts(instanceName: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Sincronizando contatos para instância: ${instanceName}`);
      
      const result = await this.callEvolution('getContacts', { instanceName });
      
      if (result.success && result.data) {
        const instance = await instanceDb.findByName(instanceName);
        if (instance && instance.id) {
          const contacts = result.data;
          let syncedCount = 0;
          
          for (const contact of contacts) {
            try {
              await contactDb.add(
                instance.id,
                contact.pushName || contact.name || 'Sem nome',
                contact.id.replace('@s.whatsapp.net', ''),
                'active'
              );
              syncedCount++;
            } catch (contactError) {
              console.warn(`Erro ao adicionar contato ${contact.id}:`, contactError);
            }
          }
          
          console.log(`Sincronizados ${syncedCount} contatos para ${instanceName}`);
          return { success: true };
        } else {
          return { success: false, error: 'Instância não encontrada no banco local' };
        }
      }

      return { success: false, error: result.error || 'Falha ao sincronizar contatos' };
    } catch (error: any) {
      console.error('❌ Erro ao sincronizar contatos:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido'
      };
    }
  }
}

// Instância singleton
export const whatsappService = new WhatsAppService();
export default whatsappService;