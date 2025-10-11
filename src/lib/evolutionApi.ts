// Evolution API service for direct integration
// This replaces Supabase Edge Functions for WhatsApp instance management

export interface EvolutionApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface QRCodeResponse {
  base64: string;
  code: string;
}

export interface InstanceStatus {
  instance: {
    instanceName: string;
    status: string;
  };
}

class EvolutionApiService {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    // Verificar se estamos no ambiente do navegador
    if (typeof window === 'undefined') {
      this.baseUrl = '';
      this.apiKey = '';
      return;
    }

    this.baseUrl = import.meta.env.VITE_EVO_BASE_URL || '';
    this.apiKey = import.meta.env.VITE_EVO_API_KEY || '';
    
    console.log('Evolution API Config:', {
      baseUrl: this.baseUrl,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'not found',
      env: import.meta.env
    });
  }

  private checkConfig(): void {
    if (!this.baseUrl || !this.apiKey) {
      throw new Error('Evolution API configuration missing. Please check VITE_EVO_BASE_URL and VITE_EVO_API_KEY environment variables.');
    }
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    this.checkConfig();
    
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'apikey': this.apiKey,
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Evolution API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Create WhatsApp instance
  async createInstance(instanceName: string): Promise<EvolutionApiResponse> {
    try {
      const data = await this.makeRequest('/instance/create', {
        method: 'POST',
        body: JSON.stringify({
          instanceName,
          token: this.apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS'
        }),
      });

      return {
        success: true,
        data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create instance'
      };
    }
  }

  // Get QR Code for instance
  async getQRCode(instanceName: string): Promise<QRCodeResponse | null> {
    try {
      const data = await this.makeRequest(`/instance/connect/${instanceName}`);
      
      if (data && data.base64) {
        // Garantir que o base64 tenha o prefixo correto para imagem
        let base64Image = data.base64;
        if (!base64Image.startsWith('data:image/')) {
          base64Image = `data:image/png;base64,${base64Image}`;
        }
        
        return {
          base64: base64Image,
          code: data.code || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting QR Code:', error);
      return null;
    }
  }

  // Get instance status
  async getInstanceStatus(instanceName: string): Promise<string> {
    try {
      const data = await this.makeRequest(`/instance/connectionState/${instanceName}`);
      return data?.instance?.state || 'disconnected';
    } catch (error) {
      console.error('Error getting instance status:', error);
      return 'error';
    }
  }

  // Delete instance
  async deleteInstance(instanceName: string): Promise<EvolutionApiResponse> {
    try {
      await this.makeRequest(`/instance/delete/${instanceName}`, {
        method: 'DELETE',
      });

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to delete instance'
      };
    }
  }

  // Logout instance
  async logoutInstance(instanceName: string): Promise<EvolutionApiResponse> {
    try {
      await this.makeRequest(`/instance/logout/${instanceName}`, {
        method: 'DELETE',
      });

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to logout instance'
      };
    }
  }

  // Restart instance
  async restartInstance(instanceName: string): Promise<EvolutionApiResponse> {
    try {
      await this.makeRequest(`/instance/restart/${instanceName}`, {
        method: 'PUT',
      });

      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to restart instance'
      };
    }
  }

  // Get all chats from instance
  async getChats(instanceName: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/chat/findChats/${instanceName}`);
      
      // Retornar array de chats
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting chats:', error);
      return [];
    }
  }

  // Send text message
  async sendTextMessage(instanceName: string, number: string, text: string): Promise<EvolutionApiResponse> {
    try {
      const data = await this.makeRequest(`/message/sendText/${instanceName}`, {
        method: 'POST',
        body: JSON.stringify({
          number: number.replace(/\D/g, ''), // Remove non-digits
          text
        }),
      });

      return {
        success: true,
        data
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send message'
      };
    }
  }

  // Get messages from a chat
  async getMessages(instanceName: string, remoteJid: string): Promise<any[]> {
    try {
      const data = await this.makeRequest(`/chat/fetchMessages/${instanceName}?remoteJid=${remoteJid}`);
      
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }
}

export const evolutionApi = new EvolutionApiService();