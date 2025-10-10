import axios from 'axios';

const API_BASE_URL = 'http://31.97.94.107:3001/api';

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  private getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async request(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any) {
    try {
      const response = await axios({
        method,
        url: `${this.baseURL}${endpoint}`,
        data,
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error: any) {
      console.error(`Erro na requisição ${method} ${endpoint}:`, error);
      throw error.response?.data || error;
    }
  }

  // Auth
  async login(email: string, password: string) {
    return this.request('POST', '/auth/login', { email, password });
  }

  async signup(email: string, password: string, full_name: string) {
    return this.request('POST', '/auth/signup', { email, password, full_name });
  }

  async getCurrentUser() {
    return this.request('GET', '/auth/me');
  }

  async logout() {
    localStorage.removeItem('token');
    return Promise.resolve();
  }

  // WhatsApp
  async getWhatsAppConnections() {
    return this.request('GET', '/whatsapp/connections');
  }

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

  async sendWhatsAppMessage(phoneNumber: string, message: string, instanceName: string) {
    return this.request('POST', '/whatsapp/send-message', { phoneNumber, message, instanceName });
  }

  async getWhatsAppContacts() {
    return this.request('GET', '/whatsapp/contacts');
  }

  // Attendances
  async getAttendances() {
    return this.request('GET', '/attendances');
  }

  async getAttendanceMessages(attendanceId: string) {
    return this.request('GET', `/attendances/${attendanceId}/messages`);
  }

  async createMessage(attendanceId: string, content: string, senderType: string, senderId?: string) {
    return this.request('POST', `/attendances/${attendanceId}/messages`, {
      content,
      sender_type: senderType,
      sender_id: senderId,
    });
  }

  // Support
  async supportLogin(matricula: string) {
    return this.request('POST', '/support/login', { matricula });
  }

  async getSupportRooms() {
    return this.request('GET', '/support/rooms');
  }

  async createSupportRoom(data: any) {
    return this.request('POST', '/support/rooms', data);
  }

  async deleteSupportRoom(roomId: string) {
    return this.request('DELETE', `/support/rooms/${roomId}`);
  }

  async getSupportUsers() {
    return this.request('GET', '/support/users');
  }

  // AI
  async sendAIMessage(message: string, context?: any) {
    return this.request('POST', '/ai/chat', { message, context });
  }

  async getAIMemory() {
    return this.request('GET', '/ai/memory');
  }

  async saveAIMemory(instructions: string, context?: any) {
    return this.request('POST', '/ai/memory', { instructions, context });
  }

  // Admin
  async createAdmin(data: any) {
    return this.request('POST', '/admin/create', data);
  }

  async deleteAdmin(userId: string) {
    return this.request('DELETE', `/admin/delete/${userId}`);
  }

  async createFirstAdmin(email: string, password: string) {
    return this.request('POST', '/admin/create-first', { email, password });
  }

  // Subscriptions
  async getSubscriptions() {
    return this.request('GET', '/admin/subscriptions');
  }

  async updateSubscription(userId: string, data: any) {
    return this.request('PUT', `/admin/subscriptions/${userId}`, data);
  }

  // Profiles
  async getProfile(userId: string) {
    return this.request('GET', `/profiles/${userId}`);
  }

  async updateProfile(userId: string, data: any) {
    return this.request('PUT', `/profiles/${userId}`, data);
  }

  // Settings
  async getSettings(key?: string) {
    return this.request('GET', key ? `/settings/${key}` : '/settings');
  }

  async saveSettings(key: string, value: any) {
    return this.request('POST', '/settings', { key, value });
  }
}

export const apiClient = new ApiClient();
