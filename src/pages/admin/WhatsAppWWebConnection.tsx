import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  initWhatsAppSession, 
  getWhatsAppStatus, 
  disconnectWhatsApp, 
  getWhatsAppQRCode,
  restoreWhatsAppSession,
  WhatsAppStatus
} from '../../lib/whatsapp-wwebjs';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle, RefreshCw, LogOut, Smartphone } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const WhatsAppWWebConnection: React.FC = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState<WhatsAppStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [showQrCode, setShowQrCode] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    checkStatus();
    // Tentar restaurar sessão ao carregar
    attemptRestore();
  }, []);

  const attemptRestore = async () => {
    try {
      const currentStatus = await getWhatsAppStatus();
      if (currentStatus && !currentStatus.connected && currentStatus.status !== 'not_initialized') {
        const result = await restoreWhatsAppSession();
        if (result.success && result.qrCode) {
          setQrCode(result.qrCode);
          setShowQrCode(true);
          startStatusPolling();
        }
      }
    } catch (error) {
      console.error('Erro ao restaurar sessão:', error);
    }
  };

  const checkStatus = async () => {
    try {
      const currentStatus = await getWhatsAppStatus();
      setStatus(currentStatus);
      
      // Se tiver QR Code esperando, mostrar
      if (currentStatus?.qrCode) {
        setQrCode(currentStatus.qrCode);
        setShowQrCode(true);
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    }
  };

  const startStatusPolling = () => {
    setIsPolling(true);
    const pollInterval = setInterval(async () => {
      try {
        const currentStatus = await getWhatsAppStatus();
        setStatus(currentStatus);
        
        if (currentStatus?.connected) {
          clearInterval(pollInterval);
          setIsPolling(false);
          setShowQrCode(false);
          setQrCode(null);
          toast.success(`WhatsApp conectado! Número: ${currentStatus.phoneNumber}`);
        } else if (currentStatus?.qrCode && currentStatus.qrCode !== qrCode) {
          setQrCode(currentStatus.qrCode);
        }
      } catch (err) {
        console.error('Erro no polling:', err);
      }
    }, 3000);

    // Parar polling após 2 minutos
    setTimeout(() => {
      clearInterval(pollInterval);
      setIsPolling(false);
      if (!status?.connected) {
        toast.error('Tempo esgotado. Tente gerar um novo QR Code.');
        setShowQrCode(false);
      }
    }, 120000);
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      const result = await initWhatsAppSession();
      
      if (result.success) {
        if (result.qrCode) {
          setQrCode(result.qrCode);
          setShowQrCode(true);
          startStatusPolling();
          toast.success('QR Code gerado! Escaneie com seu WhatsApp.');
        } else {
          toast.info(result.message || 'WhatsApp já conectado');
          await checkStatus();
        }
      } else {
        toast.error(result.error || 'Erro ao gerar QR Code');
      }
    } catch (error: any) {
      console.error('Erro ao conectar:', error);
      toast.error(error.message || 'Erro ao inicializar conexão WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      const result = await disconnectWhatsApp();
      
      if (result.success) {
        toast.success('WhatsApp desconectado com sucesso');
        setStatus(null);
        setQrCode(null);
        setShowQrCode(false);
        await checkStatus();
      } else {
        toast.error(result.error || 'Erro ao desconectar');
      }
    } catch (error: any) {
      console.error('Erro ao desconectar:', error);
      toast.error(error.message || 'Erro ao desconectar WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    setShowQrCode(false);
    setQrCode(null);
    await handleConnect();
  };

  const getStatusBadge = () => {
    if (!status) return <Badge variant="secondary">Desconhecido</Badge>;
    
    if (status.connected) {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Conectado</Badge>;
    } else if (status.status === 'waiting_qr' || status.status === 'initializing') {
      return <Badge className="bg-yellow-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Aguardando</Badge>;
    } else {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-6 h-6" />
            Conexão WhatsApp Web
          </CardTitle>
          <CardDescription>
            Gerencie sua conexão WhatsApp usando WhatsApp Web.js
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Section */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm font-medium">Status da Conexão</p>
              {status?.phoneNumber && (
                <p className="text-xs text-muted-foreground">Número: {status.phoneNumber}</p>
              )}
              {status?.lastConnection && (
                <p className="text-xs text-muted-foreground">
                  Última conexão: {new Date(status.lastConnection).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
            {getStatusBadge()}
          </div>

          {/* QR Code Section */}
          {showQrCode && qrCode && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  Escaneie o QR Code abaixo com seu WhatsApp:
                  <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em Mais opções (⋮) &gt; Aparelhos conectados</li>
                    <li>Toque em Conectar um aparelho</li>
                    <li>Aponte seu celular para esta tela para escanear o QR Code</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex flex-col items-center space-y-4 p-6 bg-white rounded-lg border">
                <img 
                  src={qrCode} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64 rounded-lg shadow-lg"
                />
                {isPolling && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Aguardando leitura do QR Code...
                  </div>
                )}
                <Button 
                  onClick={handleRefreshQR} 
                  variant="outline" 
                  size="sm"
                  disabled={loading}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Gerar Novo QR Code
                </Button>
              </div>
            </div>
          )}

          {/* Connected Section */}
          {status?.connected && !showQrCode && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                WhatsApp conectado com sucesso! Número: <strong>{status.phoneNumber}</strong>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            {!status?.connected ? (
              <Button 
                onClick={handleConnect} 
                disabled={loading || isPolling}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Smartphone className="w-4 h-4 mr-2" />
                    Conectar WhatsApp
                  </>
                )}
              </Button>
            ) : (
              <Button 
                onClick={handleDisconnect} 
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4 mr-2" />
                    Desconectar WhatsApp
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Information */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-sm text-blue-900 mb-2">ℹ️ Informações Importantes</h4>
            <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
              <li>Mantenha esta aba aberta até completar a conexão</li>
              <li>O QR Code expira após 2 minutos - gere um novo se necessário</li>
              <li>Sua sessão será mantida mesmo após fechar o navegador</li>
              <li>Use apenas um dispositivo conectado por vez</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WhatsAppWWebConnection;
