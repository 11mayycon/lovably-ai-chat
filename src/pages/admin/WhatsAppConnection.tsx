import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, WhatsAppInstance } from '../../lib/database';
import { evolutionApi } from '../../lib/evolutionApi';

const WhatsAppConnection: React.FC = () => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [currentInstance, setCurrentInstance] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      setLoading(true);
      const instances = await db.getInstances();
      setConnections(instances);
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

  // Polling para verificar status da conexão
  const startStatusPolling = async (instanceName: string) => {
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const status = await evolutionApi.getInstanceStatus(instanceName);

        if (status === 'open' || status === 'connected') {
          clearInterval(pollInterval);
          setIsPolling(false);
          setShowQrCode(false);
          
          // Atualizar status no banco local
          await db.updateInstance(instanceName, { status: 'connected' });
          await loadConnections();
          setError(null);
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 3000);

    // Parar polling após 2 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
    }, 120000);
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
      
      const username = extractUsernameFromEmail(user.email);
      const instanceName = `${username}_whatsapp`;
      setCurrentInstance(instanceName);
      
      console.log('Criando instância:', instanceName);
      
      // Criar instância no banco local
      try {
        await db.createInstance(instanceName);
      } catch (dbError: any) {
        if (!dbError.message.includes('already exists')) {
          throw dbError;
        }
      }
      
      // Criar instância via Evolution API
      const createResult = await evolutionApi.createInstance(instanceName);

      console.log('Resposta da criação:', createResult);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Erro ao criar instância');
      }

      // Aguardar um pouco e buscar QR code
      setTimeout(async () => {
        await getQRCode(instanceName);
        startStatusPolling(instanceName);
      }, 2000);

      await loadConnections();
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      setError(error.message || 'Erro ao gerar QR Code. Verifique se as credenciais da Evolution API estão configuradas.');
    } finally {
      setLoading(false);
    }
  };



  const getQRCode = async (instance: string) => {
    try {
      setLoading(true);
      setCurrentInstance(instance);
      
      const qrData = await evolutionApi.getQRCode(instance);

      if (qrData?.base64) {
        setQrCode(qrData.base64);
        setShowQrCode(true);
        startStatusPolling(instance);
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
      
      const result = await evolutionApi.deleteInstance(instance);

      if (result.success) {
        await db.deleteInstance(instance);
        await loadConnections();
      } else {
        setError(result.error || 'Erro ao deletar instância');
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
      
      // Deletar e recriar instância
      await deleteInstance(instance);
      
      setTimeout(async () => {
        const result = await evolutionApi.createInstance(instance);

        if (!result.success) {
          throw new Error(result.error || 'Erro ao recriar instância');
        }
        
        await loadConnections();
      }, 1000);
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
      
      const result = await evolutionApi.logoutInstance(instance);

      if (result.success) {
        await db.updateInstance(instance, { status: 'disconnected' });
        await loadConnections();
      } else {
        setError(result.error || 'Erro ao desconectar instância');
      }
    } catch (error: any) {
      console.error('Erro ao desconectar instância:', error);
      setError(error.message || 'Erro ao desconectar instância');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="w-full max-w-2xl">
        {/* Card Principal */}
        <div className="bg-card/50 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden">
          {/* Header */}
          <div className="px-8 py-6 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b border-border/50">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent mb-2">
              Conexão WhatsApp
            </h1>
            <p className="text-muted-foreground">
              Conecte seu WhatsApp escaneando o QR Code
            </p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl backdrop-blur-sm animate-in fade-in slide-in-from-top-2">
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Status ou QR Code */}
            {!showQrCode ? (
              <div className="text-center space-y-6 py-12">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                
                <div>
                  <h2 className="text-xl font-semibold text-foreground mb-2">
                    Pronto para conectar?
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Clique no botão abaixo para gerar seu QR Code
                  </p>
                </div>

                <button
                  onClick={generateQRCodeWithAutoInstance}
                  disabled={loading}
                  className="group relative px-8 py-4 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 disabled:from-muted disabled:to-muted text-primary-foreground rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Gerando QR Code...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                      Gerar QR Code
                    </span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                {qrCode && (
                  <>
                    <div className="flex justify-center">
                      <img
                        src={qrCode}
                        alt="QR Code WhatsApp"
                        className="w-64 h-64 block"
                        style={{ 
                          backgroundColor: 'white',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          padding: '8px'
                        }}
                      />
                    </div>

                    <div className="text-center space-y-3">
                      <h3 className="text-lg font-semibold text-foreground">
                        Escaneie o QR Code
                      </h3>
                      <ol className="text-sm text-muted-foreground space-y-2 text-left max-w-md mx-auto">
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">1</span>
                          <span>Abra o WhatsApp no seu celular</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">2</span>
                          <span>Toque em Menu ou Configurações</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">3</span>
                          <span>Selecione "Aparelhos conectados"</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary/20 text-primary rounded-full flex items-center justify-center text-xs font-bold">4</span>
                          <span>Escaneie este QR Code</span>
                        </li>
                      </ol>

                      {isPolling && (
                        <div className="flex items-center justify-center gap-2 text-primary animate-pulse pt-4">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          <span className="ml-2 font-medium">Aguardando conexão...</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowQrCode(false)}
                      className="w-full px-4 py-3 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-xl font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Sua conexão é segura e criptografada
          </p>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppConnection;
