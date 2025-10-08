import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Send, Brain, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Message {
  sender: 'user' | 'ai';
  text: string;
}

const AIChat = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('ai-chat', {
        body: { query: input, history: messages },
      });

      // This handles network errors or function invocation issues
      if (functionError) {
        throw functionError;
      }

      // The backend function now ALWAYS returns 200 OK.
      // We need to check for a custom 'error' field in the response body.
      if (data.error) {
        throw new Error(data.error);
      }
      
      const aiMessage: Message = { sender: 'ai', text: data.response || "Não recebi uma resposta válida." };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (error: any) {
      console.error('Error calling ai-chat function:', error);

      toast({
        title: 'Erro na comunicação com a IA',
        description: error.message || 'Ocorreu um erro desconhecido.',
        variant: 'destructive',
        duration: 10000,
      });
      
      setInput(userMessage.text);
      setMessages(prev => prev.slice(0, prev.length - 1));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-card">
      <header className="p-4 border-b flex items-center gap-3">
        <Brain className="w-6 h-6" />
        <h1 className="text-xl font-bold">Chat com IA</h1>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
              {message.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-primary-foreground">
                  <Brain size={20} />
                </div>
              )}
              <div className={`p-3 rounded-lg max-w-lg ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
              </div>
               {message.sender === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center">
                  <User size={20} />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-primary-foreground">
                    <Brain size={20} />
                </div>
                <div className="p-3 rounded-lg bg-muted">
                    <p className="text-sm">Digitando...</p>
                </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <footer className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua mensagem..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Send className="w-4 h-4" />
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </footer>
    </div>
  );
};

export default AIChat;
