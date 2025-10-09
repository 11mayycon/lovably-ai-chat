import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

// Cliente para comunicação com o backend local
class DatabaseClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  // Método genérico para fazer requisições
  async request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) {
    try {
      // Buscar token do localStorage
      const token = localStorage.getItem('token');
      
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição ${method} ${endpoint}:`, error);
      throw error;
    }
  }

  // Métodos para WhatsApp
  async getWhatsAppContacts() {
    return this.request('GET', '/whatsapp/contacts');
  }

  async getWhatsAppMessages(contactId: string) {
    return this.request('GET', `/whatsapp/messages/${contactId}`);
  }

  async sendWhatsAppMessage(contactId: string, message: string) {
    return this.request('POST', '/whatsapp/send', { contactId, message });
  }

  // Métodos para instâncias WhatsApp
  async createWhatsAppInstance(instanceName: string) {
    return this.request('POST', '/whatsapp/create-instance', { instanceName });
  }

  async getInstanceStatus(instanceName: string) {
    return this.request('GET', `/whatsapp/instance-status/${instanceName}`);
  }

  async getQRCode(instanceName: string) {
    return this.request('GET', `/whatsapp/qrcode/${instanceName}`);
  }

  async deleteInstance(instanceName: string) {
    return this.request('DELETE', `/whatsapp/instance/${instanceName}`);
  }

  async listInstances() {
    return this.request('GET', '/whatsapp/instances');
  }

  async restartInstance(instanceName: string) {
    return this.request('POST', `/whatsapp/restart-instance/${instanceName}`);
  }

  async logoutInstance(instanceName: string) {
    return this.request('POST', `/whatsapp/logout-instance/${instanceName}`);
  }

  // Métodos para atendimentos
  async getAttendances() {
    return this.request('GET', '/attendances');
  }

  async getAttendanceMessages(attendanceId: string) {
    return this.request('GET', `/attendances/${attendanceId}/messages`);
  }

  async sendAttendanceMessage(attendanceId: string, message: string) {
    return this.request('POST', `/attendances/${attendanceId}/messages`, { message });
  }

  // Métodos para IA
  async sendAIMessage(message: string, context?: any) {
    return this.request('POST', '/ai/chat', { message, context });
  }

  // Métodos para autenticação
  async login(email: string, password: string) {
    return this.request('POST', '/auth/login', { email, password });
  }

  async logout() {
    return this.request('POST', '/auth/logout');
  }

  // Métodos para usuários de suporte
  async getSupportUsers() {
    return this.request('GET', '/support/users');
  }

  // Método para simular real-time (substitui o Supabase channels)
  subscribeToMessages(callback: (message: any) => void) {
    // Por enquanto, implementação simples com polling
    // Em produção, você pode usar WebSockets ou Server-Sent Events
    const interval = setInterval(async () => {
      try {
        // Implementar lógica de polling se necessário
      } catch (error) {
        console.error('Erro no polling de mensagens:', error);
      }
    }, 5000);

    return {
      unsubscribe: () => clearInterval(interval)
    };
  }
}

export const databaseClient = new DatabaseClient();