import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db, WhatsAppInstance } from '../../lib/database';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import io from 'socket.io-client';

const WhatsAppConnection: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connections, setConnections] = useState<WhatsAppInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<ReturnType<typeof io> | null>(null);

  useEffect(() => {
    const newSocket = io('https://isa.inovapro.cloud', { path: '/socket.io' });
    setSocket(newSocket);

    newSocket.on('qr', (qr) => {
      setQrCode(qr);
      setShowQrCode(true);
      setLoading(false);
    });

    newSocket.on('ready', () => {
      setIsConnected(true);
      setShowQrCode(false);
      setQrCode(null);
      toast({
        title: 'Sucesso',
        description: 'WhatsApp conectado com sucesso!',
      });
    });

    newSocket.on('disconnected', () => {
      setIsConnected(false);
      toast({
        title: 'Aviso',
        description: 'WhatsApp desconectado.',
        variant: 'destructive',
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [toast]);

  const handleConnect = () => {
    setLoading(true);
    setError(null);
    if (socket) {
      socket.emit('connect-whatsapp');
    }
  };

  const handleDisconnect = () => {
    if (socket) {
      socket.emit('disconnect-whatsapp');
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

            {isConnected ? (
              <div className="text-center space-y-6 py-12 animate-in fade-in slide-in-from-bottom-4">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border-2 border-green-500/40">
                  <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    ✅ WhatsApp Conectado
                  </h2>
                  <p className="text-muted-foreground text-sm mb-1">
                    Sua conexão está ativa e funcionando
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="px-6 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-600 dark:text-amber-400 rounded-xl font-semibold transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ) : !showQrCode ? (
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
                  onClick={handleConnect}
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
                {qrCode ? (
                  <>
                    <div className="flex justify-center py-8">
                      <div className="bg-background p-6 rounded-2xl shadow-xl border-2 border-primary/20">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrCode)}`}
                          alt="QR Code WhatsApp"
                          className="w-80 h-80 block"
                          onError={(e) => {
                            console.error('Erro ao carregar imagem QR Code');
                            setError('Erro ao exibir QR Code. A imagem pode estar corrompida.');
                          }}
                          onLoad={() => console.log('QR Code carregado com sucesso')}
                        />
                      </div>
                    </div>

                    <div className="text-center space-y-4">
                      <h3 className="text-xl font-bold text-foreground">
                        Escaneie com seu WhatsApp
                      </h3>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-muted-foreground">Carregando QR Code...</p>
                  </div>
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