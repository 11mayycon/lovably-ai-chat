import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QrCode, Smartphone, RefreshCw, Power, Wifi, WifiOff, Contact } from "lucide-react";

interface FunctionErrorResponse {
  error?: string;
}
interface FunctionsHttpError extends Error {
  context: FunctionErrorResponse;
}

export default function WhatsAppConnection() {
  const [loadingAction, setLoadingAction] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [numeroWhatsApp, setNumeroWhatsApp] = useState(""); // Estado para o número

  const handleGenerateQRCode = async () => {
    if (!numeroWhatsApp) {
        toast.error("Por favor, insira seu número do WhatsApp.");
        return;
    }

    setLoadingAction(true);
    setQrCode(null);
    try {
      const { data, error } = await supabase.functions.invoke('evolution', {
        body: {
          action: 'createInstance',
          numeroWhatsApp: numeroWhatsApp, // <-- ENVIANDO O NÚMERO PARA O BACKEND
        },
      });

      if (error) {
        const httpError = error as FunctionsHttpError;
        const specificMessage = httpError.context?.error;
        if (specificMessage && typeof specificMessage === 'string') {
          throw new Error(specificMessage);
        } else {
          throw new Error(`Falha na chamada da função: ${error.message}`);
        }
      }

      if (data && !data.success) {
        throw new Error(data.error || 'O backend retornou uma falha não especificada.');
      }

      const { instance, qrcode } = data.data;

      if (!instance?.instanceName || !qrcode?.base64) {
        throw new Error("Resposta de sucesso, mas dados do QR Code estão faltando.");
      }

      let qrCodeImage = qrcode.base64.startsWith('data:image') ? qrcode.base64 : `data:image/png;base64,${qrcode.base64}`;

      setQrCode(qrCodeImage);
      toast.success("QR Code gerado! Escaneie com seu WhatsApp.");

    } catch (err: any) {
      console.error("[DIAGNÓSTICO FINAL] Causa Raiz do Erro:", err);
      toast.error("Erro ao Gerar QR Code", {
        description: err.message,
        duration: 30000,
      });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">Conectar WhatsApp</h1>
        <Card className="border-2">
          <CardHeader className="text-center">
             <Smartphone className="w-16 h-16 mx-auto mb-4 text-primary" />
             <CardTitle className="text-2xl">Conecte seu WhatsApp</CardTitle>
             <CardDescription>Siga os passos para usar a plataforma com seu número</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4 rounded-lg border p-6 flex flex-col justify-center">
                    <h3 className="text-lg font-semibold">1. Insira seu Número</h3>
                    <p className="text-sm text-muted-foreground">Digite o número do WhatsApp que você deseja conectar. Use o formato internacional (ex: 5511999999999).</p>
                    <Input 
                        type="text" 
                        placeholder="Ex: 5511999999999"
                        value={numeroWhatsApp}
                        onChange={(e) => setNumeroWhatsApp(e.target.value)}
                        className="max-w-xs"
                    />
                    <h3 className="text-lg font-semibold mt-4">2. Gere e Escaneie</h3>
                    <p className="text-sm text-muted-foreground">Clique no botão ao lado para gerar um QR Code e escaneie-o com o WhatsApp no seu celular.</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 rounded-lg border p-6">
                {qrCode ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-2 bg-white rounded-lg border-2">
                        <img src={qrCode} alt="QR Code WhatsApp" className="w-60 h-60"/>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span className="text-sm font-medium">Aguardando leitura...</span>
                        </div>
                    </div>
                    ) : (
                    <Button onClick={handleGenerateQRCode} disabled={loadingAction} size="lg" className="w-full max-w-xs">
                        {loadingAction ? 'Gerando...' : 'Gerar QR Code'}
                    </Button>
                    )}
                </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
