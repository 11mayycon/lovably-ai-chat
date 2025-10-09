import React, { useState, useEffect } from 'react';
import { databaseClient } from '../../lib/database-client';
import { useAuth } from '../../contexts/AuthContext';

interface WhatsAppConnection {
  id: string;
  instance_name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const WhatsAppConnection: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<WhatsAppConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const response = await databaseClient.getWhatsAppContacts();
      if (response.success) {
        setConnections(response.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar conexões:', error);
      setError('Erro ao carregar conexões WhatsApp');
    } finally {
      setLoading(false);
    }
  };



  // Função para extrair nome do usuário do email
  const extractUsernameFromEmail = (email: string): string => {
    const username = email.split('@')[0];
    // Remove números e caracteres especiais, mantém apenas letras
    return username.replace(/[^a-zA-Z]/g, '').toLowerCase();
  };

  // Função para gerar QR Code com criação automática de instância
  const generateQRCodeWithAutoInstance = async () => {
    if (!user?.email) {
      setError('Email do usuário não encontrado');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Extrair nome do usuário do email
      const username = extractUsernameFromEmail(user.email);
      const instanceName = `${username}_whatsapp`;
      
      // Tentar criar a instância primeiro
      try {
        const createResponse = await databaseClient.createWhatsAppInstance(instanceName);
        
        if (createResponse.success) {
          // Instância criada com sucesso, aguardar um pouco e buscar QR code
          setTimeout(async () => {
            await getQRCode(instanceName);
            await loadConnections();
          }, 2000);
        } else if (createResponse.error && createResponse.error.includes('já existe')) {
          // Instância já existe, apenas buscar o QR code
          setError('Use o botão QR Code para reconectar');
          await getQRCode(instanceName);
          await loadConnections();
        } else {
          setError(createResponse.error || 'Erro ao criar instância');
        }
      } catch (createError: any) {
        if (createError.response?.status === 409) {
          // Instância já existe, apenas buscar o QR code
          setError('Use o botão QR Code para reconectar');
          await getQRCode(instanceName);
          await loadConnections();
        } else {
          throw createError;
        }
      }
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      setError(error.message || 'Erro ao gerar QR Code');
    } finally {
      setLoading(false);
    }
  };



  const getQRCode = async (instance: string) => {
    try {
      setLoading(true);
      const response = await databaseClient.getQRCode(instance);
      
      if (response.success && response.data?.base64) {
        setQrCode(response.data.base64);
        setShowQrCode(true);
      } else {
        setError('QR Code não disponível');
      }
    } catch (error: any) {
      console.error('Erro ao buscar QR code:', error);
      setError(error.message || 'Erro ao buscar QR code');
    } finally {
      setLoading(false);
    }
  };

  const deleteInstance = async (instance: string) => {
    if (!confirm('Tem certeza que deseja deletar esta instância?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await databaseClient.deleteInstance(instance);
      
      if (response.success) {
        await loadConnections();
      } else {
        setError(response.error || 'Erro ao deletar instância');
      }
    } catch (error: any) {
      console.error('Erro ao deletar instância:', error);
      setError(error.message || 'Erro ao deletar instância');
    } finally {
      setLoading(false);
    }
  };

  const restartInstance = async (instance: string) => {
    try {
      setLoading(true);
      const response = await databaseClient.restartInstance(instance);
      
      if (response.success) {
        await loadConnections();
      } else {
        setError(response.error || 'Erro ao reiniciar instância');
      }
    } catch (error: any) {
      console.error('Erro ao reiniciar instância:', error);
      setError(error.message || 'Erro ao reiniciar instância');
    } finally {
      setLoading(false);
    }
  };

  const logoutInstance = async (instance: string) => {
    try {
      setLoading(true);
      const response = await databaseClient.logoutInstance(instance);
      
      if (response.success) {
        await loadConnections();
      } else {
        setError(response.error || 'Erro ao desconectar instância');
      }
    } catch (error: any) {
      console.error('Erro ao desconectar instância:', error);
      setError(error.message || 'Erro ao desconectar instância');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">Conexões WhatsApp</h1>
        <p className="text-gray-400">Gerencie suas instâncias do WhatsApp</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Formulário para gerar QR Code */}
      <div className="bg-gray-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">Status da Conexão</h2>
        <p className="text-gray-300 mb-4">
          Clique no botão abaixo para gerar um QR Code e conectar seu WhatsApp
        </p>
        <div className="flex justify-center">
          <button
            onClick={generateQRCodeWithAutoInstance}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
          >
            {loading ? 'Gerando...' : 'Gerar QR Code'}
          </button>
        </div>
      </div>

      {/* Modal do QR Code */}
      {showQrCode && qrCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">QR Code WhatsApp</h3>
              <button
                onClick={() => setShowQrCode(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="text-center">
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="mx-auto mb-4 max-w-full"
              />
              <p className="text-gray-300 text-sm">
                Escaneie este QR Code com seu WhatsApp para conectar
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de conexões */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">Instâncias WhatsApp</h2>
        </div>
        
        {loading && connections.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            Carregando conexões...
          </div>
        ) : connections.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            Nenhuma instância WhatsApp encontrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Nome da Instância
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {connections.map((connection) => (
                  <tr key={connection.id} className="hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-white font-medium">
                      {connection.instance_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        connection.status === 'connected' 
                          ? 'bg-green-500/20 text-green-400' 
                          : connection.status === 'connecting'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {connection.status === 'connected' ? 'Conectado' : 
                         connection.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-300 text-sm">
                      {new Date(connection.created_at).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                      <button
                        onClick={() => getQRCode(connection.instance_name)}
                        disabled={loading}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        QR Code
                      </button>
                      <button
                        onClick={() => restartInstance(connection.instance_name)}
                        disabled={loading}
                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Reiniciar
                      </button>
                      <button
                        onClick={() => logoutInstance(connection.instance_name)}
                        disabled={loading}
                        className="px-3 py-1 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Desconectar
                      </button>
                      <button
                        onClick={() => deleteInstance(connection.instance_name)}
                        disabled={loading}
                        className="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded text-xs font-medium transition-colors"
                      >
                        Deletar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppConnection;
