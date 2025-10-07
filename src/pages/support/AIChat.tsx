import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Bot, User, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const AIChat = () => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (input.trim() === "" || isLoading) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const contextChat = messages.slice(-6); // Pega as últimas 6 mensagens como contexto

      const { data, error } = await supabase.functions.invoke("groq-message-handler", {
        body: { message: input, contextChat },
      });

      if (error) {
        throw new Error(error.message);
      }

      const aiMessage = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, aiMessage]);

    } catch (err: any) {
      toast.error("Ops! A Groq está com muita demanda no momento. Tente novamente em alguns segundos.");
      setMessages((prev) => prev.filter(m => m.role !== 'user' || m.content !== input)); // Remove a mensagem do usuário se a API falhar
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-muted/20">
      <CardHeader className="flex-shrink-0">
        <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/support/rooms")}>
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <Bot className="w-8 h-8 text-primary" />
            <div>
                <CardTitle>Groq AI Assistant</CardTitle>
                <p className="text-sm text-muted-foreground">Converse com a IA para obter ajuda</p>
            </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex items-start gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && <Bot className="w-6 h-6 text-primary flex-shrink-0" />}
            <div className={`rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-wrap ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background"}`}>
              {msg.content}
            </div>
            {msg.role === "user" && <User className="w-6 h-6 flex-shrink-0" />}
          </div>
        ))}
        {isLoading && (
            <div className="flex items-start gap-3">
                <Bot className="w-6 h-6 text-primary flex-shrink-0" />
                <div className="rounded-lg px-4 py-2 bg-background flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin"/>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>

      <div className="p-4 border-t flex-shrink-0">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder="Digite sua mensagem aqui..."
            className="pr-12"
            disabled={isLoading}
          />
          <Button
            type="submit"
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2"
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;
