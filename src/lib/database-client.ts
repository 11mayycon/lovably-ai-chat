import { supabase } from '../integrations/supabase/client';

// Cliente para comunicação com o Supabase
class DatabaseClient {
  // Métodos para WhatsApp (a serem refatorados ou removidos)
  /*
  async getWhatsAppContacts() {
    return this.request('GET', '/whatsapp/contacts');
  }

  async getWhatsAppMessages(contactId: string) {
    return this.request('GET', `/whatsapp/messages/${contactId}`);
  }

  async sendWhatsAppMessage(contactId: string, message: string) {
    return this.request('POST', '/whatsapp/send', { contactId, message });
  }

  // Métodos para instâncias WhatsApp (a serem refatorados ou removidos)
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
  */

  // Métodos para atendimentos
  async getAttendances() {
    const { data, error } = await supabase.from('attendances').select('*');
    if (error) {
      console.error('Erro ao buscar atendimentos:', error);
      throw error;
    }
    return data;
  }

  async getAttendanceMessages(attendanceId: string) {
    // a ser implementado
  }

  async sendAttendanceMessage(attendanceId: string, message: string) {
    // a ser implementado
  }

  // Métodos para IA
  async sendAIMessage(message: string, context?: any) {
    // a ser implementado
  }

  // Métodos para autenticação
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Erro no login:', error);
      throw error;
    }
    return data;
  }

  async logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }

  // Métodos para usuários de suporte
  async getSupportUsers() {
    const { data, error } = await supabase.from('support_users').select('*');
    if (error) {
      console.error('Erro ao buscar usuários de suporte:', error);
      throw error;
    }
    return data;
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