import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Smartphone, RefreshCw, Power, Wifi, WifiOff } from "lucide-react";

export default function WhatsAppConnection() {
  const [connection, setConnection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string | null>(null);

  useEffect(() => {
    loadConnection();
  }, []);

  const loadConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("whatsapp_connections")
        .select("*")
        .eq("admin_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Se há conexão, verificar status na Evolution API
      if (data) {
        try {
          const { data: statusResponse } = await supabase.functions.invoke('evolution', {
            body: { 
              action: 'fetchInstances',
              instanceName: data.instance_name
            }
          });
          
          if (statusResponse?.success) {
            const instances = statusResponse.result;
            const instance = instances?.[0];
            const isConnected = instance?.instance?.state === 'open' || 
                              instance?.state === 'open' ||
                              instance?.status === 'open';
            
            // Atualizar status no banco se mudou
            if (isConnected && data.status !== 'connected') {
              const { error: updateError } = await supabase
                .from("whatsapp_connections")
                .update({
                  status: "connected",
                  last_connection: new Date().toISOString(),
                  qr_code: null
                })
                .eq("id", data.id);

              if (!updateError) {
                data.status = 'connected';
                data.last_connection = new Date().toISOString();
                data.qr_code = null;
              }
            }
          }
        } catch (statusError) {
          console.warn("Erro ao verificar status:", statusError);
        }
      }
      
      setConnection(data);
    } catch (error) {
      console.error("Erro ao carregar conexão:", error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setQrCode(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Gerar nome único para a instância
      const instanceName = `isa_user_${user.id.substring(0, 8)}_${Date.now().toString(36)}`;
      
      console.log('[WhatsApp] Criando instância:', instanceName);

      // 1) Criar a instância na Evolution API
      const { data: createData, error: createError } = await supabase.functions.invoke('evolution', {
        body: { 
          action: 'createInstance',
          instanceName,
          userId: user.id
        }
      });

      if (createError) throw createError;

      if (!createData?.success && !createData?.result?.alreadyExists) {
        throw new Error(createData?.error || 'Erro ao criar instância');
      }

      console.log('[WhatsApp] Instância criada:', createData);

      // 2) Buscar o QR Code
      const { data: qrData, error: qrError } = await supabase.functions.invoke('evolution', {
        body: { 
          action: 'getQR',
          instanceName
        }
      });

      if (qrError) throw qrError;

      console.log('[WhatsApp] QR Code recebido:', qrData);

      if (!qrData?.success) {
        throw new Error(qrData?.error || 'Erro ao obter QR Code');
      }

      // Extrair QR Code da resposta
      const instances = qrData.result;
      let qrCodeImage: string | undefined =
        instances?.[0]?.instance?.qrcode?.base64 ||
        instances?.[0]?.qrcode?.base64 ||
        instances?.[0]?.instance?.qr ||
        instances?.[0]?.qr ||
        qrData?.qrcode?.base64 ||
        qrData?.base64 ||
        qrData?.qr;

      if (!qrCodeImage) {
        throw new Error('QR Code não retornado pela API');
      }

      // Garantir prefixo data URL
      if (!qrCodeImage.startsWith('data:image')) {
        qrCodeImage = `data:image/png;base64,${qrCodeImage}`;
      }

      setQrCode(qrCodeImage);

      // Gerar matrícula única
      const matricula = `WA-${Date.now().toString(36).toUpperCase()}`;

      // 3) Salvar no banco de dados
      if (!connection) {
        const { error } = await supabase
          .from("whatsapp_connections")
          .insert({
            instance_name: instanceName,
            qr_code: qrCodeImage,
            status: "waiting",
            admin_user_id: user.id,
            matricula: matricula
          });

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_connections")
          .update({
            instance_name: instanceName,
            qr_code: qrCodeImage,
            status: "waiting"
          })
          .eq("id", connection.id);

        if (error) throw error;
      }

      await loadConnection();
      toast.success("QR Code gerado! Escaneie com seu WhatsApp");
    } catch (error) {
      console.error("[WhatsApp] Erro ao gerar QR Code:", error);
      const message = (error as any)?.message || (error as Error).toString();
      toast.error("Erro ao gerar QR Code: " + message);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (!connection) return;

    try {
      setLoading(true);

      // 1) Deletar instância na Evolution API
      try {
        const { data: deleteData } = await supabase.functions.invoke('evolution', {
          body: { 
            action: 'deleteInstance',
            instanceName: connection.instance_name
          }
        });

        console.log('[WhatsApp] Instância deletada:', deleteData);
      } catch (deleteError) {
        console.warn('[WhatsApp] Erro ao deletar instância (continuando):', deleteError);
      }

      // 2) Atualizar banco de dados
      const { error } = await supabase
        .from("whatsapp_connections")
        .update({
          status: "disconnected",
          qr_code: null
        })
        .eq("id", connection.id);

      if (error) throw error;
      
      setQrCode(null);
      await loadConnection();
      toast.success("WhatsApp desconectado e instância removida");
    } catch (error) {
      console.error("[WhatsApp] Erro ao desconectar:", error);
      toast.error("Erro ao desconectar WhatsApp");
    } finally {
      setLoading(false);
    }
  };

  const isConnected = connection?.status === "connected";

  // Limpar o QR assim que conectar
  useEffect(() => {
    if (isConnected) {
      setQrCode(null);
    }
  }, [isConnected]);

  // Polling para atualizar status pós-leitura do QR
  useEffect(() => {
    if (isConnected) return;
    const interval = setInterval(() => {
      loadConnection();
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Conectar WhatsApp
        </h1>
        <p className="text-muted-foreground">
          Integre seu WhatsApp Business com a Evolution API
        </p>
      </div>

      {!isConnected ? (
        <Card className="border-2">
          <CardHeader className="text-center">
            <Smartphone className="w-16 h-16 mx-auto mb-4 text-primary" />
            <CardTitle className="text-2xl">Conecte seu WhatsApp</CardTitle>
            <CardDescription>
              Siga os passos abaixo para conectar seu WhatsApp
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  1
                </div>
                <div>
                  <p className="font-medium">Abra o WhatsApp no seu celular</p>
                  <p className="text-sm text-muted-foreground">
                    Certifique-se de ter o WhatsApp Business instalado
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  2
                </div>
                <div>
                  <p className="font-medium">Toque em Mais opções → Aparelhos conectados</p>
                  <p className="text-sm text-muted-foreground">
                    No Android: três pontos no canto superior direito
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                  3
                </div>
                <div>
                  <p className="font-medium">Escaneie o QR Code abaixo</p>
                  <p className="text-sm text-muted-foreground">
                    Aponte a câmera do seu celular para o código
                  </p>
                </div>
              </div>
            </div>

            {qrCode ? (
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-lg border-2">
                  <img 
                    src={qrCode} 
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="flex items-center gap-2 text-warning">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm font-medium">Aguardando conexão...</span>
                </div>
              </div>
            ) : (
              <Button
                onClick={generateQRCode}
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <QrCode className="w-4 h-4 mr-2" />
                    Gerar QR Code
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-success">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-success/10 p-3 rounded-full">
                  <Wifi className="w-6 h-6 text-success" />
                </div>
                <div>
                  <CardTitle className="text-2xl">WhatsApp Conectado</CardTitle>
                  <CardDescription>Sua instância está ativa e funcionando</CardDescription>
                </div>
              </div>
              <Badge variant="default" className="bg-success">
                Online
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Matrícula</p>
                <p className="font-mono font-medium text-primary">{connection.matricula || "N/A"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium">{connection.phone_number || "+55 (00) 00000-0000"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Instância</p>
                <p className="font-medium">{connection.instance_name}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium text-success">Conectado</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Última conexão</p>
                <p className="font-medium">
                  {connection.last_connection
                    ? new Date(connection.last_connection).toLocaleString("pt-BR")
                    : "Agora"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={generateQRCode}
                disabled={loading}
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reconectar
              </Button>
              <Button
                variant="destructive"
                onClick={disconnect}
                disabled={loading}
                className="flex-1"
              >
                <Power className="w-4 h-4 mr-2" />
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Conexões</CardTitle>
          <CardDescription>Últimas atividades de conexão</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {connection ? (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-success" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">{connection.instance_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(connection.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {connection.status}
                </Badge>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma conexão registrada
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}