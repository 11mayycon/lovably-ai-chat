import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Copy, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AISuggestionProps {
  messages: any[];
  attendanceId: string;
  onUseSuggestion: (text: string) => void;
}

export const AISuggestion = ({ messages, attendanceId, onUseSuggestion }: AISuggestionProps) => {
  const [suggestion, setSuggestion] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const generateSuggestion = async () => {
    if (messages.length === 0) return;

    setIsLoading(true);
    try {
      // Simulated AI suggestion for now
      // In production, this would call the Groq API via edge function
      const lastMessage = messages[messages.length - 1];
      
      setTimeout(() => {
        setSuggestion(`Olá! Entendo que você precisa de ajuda com "${lastMessage.content.substring(0, 50)}...". Posso ajudar você com isso. Como posso auxiliar melhor?`);
        setIsLoading(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating suggestion:', error);
      toast.error('Erro ao gerar sugestão da IA');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.sender_type === 'client') {
        generateSuggestion();
      }
    }
  }, [messages.length]);

  const handleCopy = () => {
    navigator.clipboard.writeText(suggestion);
    toast.success('Sugestão copiada!');
  };

  if (!suggestion && !isLoading) return null;

  return (
    <Card className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
        <span className="font-semibold text-sm text-purple-900 dark:text-purple-100">
          Sugestão da InovaPro AI
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span className="ml-2 text-sm text-muted-foreground">Gerando sugestão...</span>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground mb-3 whitespace-pre-wrap">{suggestion}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopy}
              className="flex-1"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copiar
            </Button>
            <Button
              size="sm"
              onClick={() => onUseSuggestion(suggestion)}
              className="flex-1 bg-gradient-primary"
            >
              <Send className="w-3 h-3 mr-1" />
              Usar
            </Button>
          </div>
        </>
      )}
    </Card>
  );
};
