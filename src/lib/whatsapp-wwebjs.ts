import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api/whatsapp';

// Helper para obter o token de autenticação
const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Configurar headers com autenticação
const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

export interface WhatsAppStatus {
  connected: boolean;
  status: string;
  phoneNumber?: string;
  qrCode?: string;
  lastConnection?: string;
}

export interface WhatsAppChat {
  id: string;
  name: string;
  pushName?: string;
  phone: string;
  profilePicUrl?: string;
  isGroup: boolean;
  unreadCount?: number;
  lastMessage?: {
    body: string;
    timestamp: number;
    fromMe: boolean;
  };
}

export interface WhatsAppMessage {
  id: string;
  body: string;
  timestamp: number;
  fromMe: boolean;
  author?: string;
  type: string;
  hasMedia: boolean;
}

// Inicializar sessão e gerar QR Code
export async function initWhatsAppSession(): Promise<{ success: boolean; qrCode?: string; message?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/init-session`,
      {},
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Erro ao inicializar sessão:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao inicializar sessão WhatsApp'
    };
  }
}

// Obter status da sessão
export async function getWhatsAppStatus(): Promise<WhatsAppStatus | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/status`, {
      headers: getHeaders()
    });
    return response.data.success ? response.data.data : null;
  } catch (error: any) {
    console.error('Erro ao buscar status:', error);
    return null;
  }
}

// Obter QR Code
export async function getWhatsAppQRCode(): Promise<string | null> {
  try {
    const response = await axios.get(`${API_BASE_URL}/qrcode`, {
      headers: getHeaders()
    });
    return response.data.success ? response.data.qrCode : null;
  } catch (error: any) {
    console.error('Erro ao buscar QR Code:', error);
    return null;
  }
}

// Desconectar WhatsApp
export async function disconnectWhatsApp(): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/disconnect`,
      {},
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Erro ao desconectar:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao desconectar WhatsApp'
    };
  }
}

// Obter conversas (chats)
export async function getWhatsAppChats(adminId?: string): Promise<WhatsAppChat[]> {
  try {
    const url = adminId 
      ? `${API_BASE_URL}/chats?adminId=${adminId}`
      : `${API_BASE_URL}/chats`;
    
    const response = await axios.get(url, {
      headers: getHeaders()
    });
    return response.data.success ? response.data.data : [];
  } catch (error: any) {
    console.error('Erro ao buscar chats:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar conversas');
  }
}

// Obter mensagens de um chat
export async function getWhatsAppMessages(
  chatId: string, 
  adminId?: string, 
  limit: number = 50
): Promise<WhatsAppMessage[]> {
  try {
    const url = adminId 
      ? `${API_BASE_URL}/messages/${chatId}?adminId=${adminId}&limit=${limit}`
      : `${API_BASE_URL}/messages/${chatId}?limit=${limit}`;
    
    const response = await axios.get(url, {
      headers: getHeaders()
    });
    return response.data.success ? response.data.data : [];
  } catch (error: any) {
    console.error('Erro ao buscar mensagens:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar mensagens');
  }
}

// Enviar mensagem
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string,
  adminId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/send-message`,
      { phoneNumber, message, adminId },
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao enviar mensagem'
    };
  }
}

// Obter contatos
export async function getWhatsAppContacts(adminId?: string): Promise<any[]> {
  try {
    const url = adminId 
      ? `${API_BASE_URL}/contacts?adminId=${adminId}`
      : `${API_BASE_URL}/contacts`;
    
    const response = await axios.get(url, {
      headers: getHeaders()
    });
    return response.data.success ? response.data.data : [];
  } catch (error: any) {
    console.error('Erro ao buscar contatos:', error);
    throw new Error(error.response?.data?.error || 'Erro ao buscar contatos');
  }
}

// Restaurar sessão
export async function restoreWhatsAppSession(): Promise<{ success: boolean; qrCode?: string; message?: string; error?: string }> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/restore-session`,
      {},
      { headers: getHeaders() }
    );
    return response.data;
  } catch (error: any) {
    console.error('Erro ao restaurar sessão:', error);
    return {
      success: false,
      error: error.response?.data?.error || 'Erro ao restaurar sessão'
    };
  }
}
