import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Brain, Save, Lightbulb, RefreshCw } from "lucide-react";

export default function AIMemory() {
  const [instructions, setInstructions] = useState("");
  const [memoryId, setMemoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  useEffect(() => {
    loadMemory();
  }, []);

  const loadMemory = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_memory")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setInstructions(data.instructions);
        setMemoryId(data.id);
        setLastSaved(new Date(data.updated_at));
      }
    } catch (error) {
      console.error("Erro ao carregar memória:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveMemory = async () => {
    if (!instructions.trim()) {
      toast.error("Por favor, insira instruções para a IA");
      return;
    }

    try {
      setSaving(true);

      if (memoryId) {
        const { error } = await supabase
          .from("ai_memory")
          .update({ instructions })
          .eq("id", memoryId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("ai_memory")
          .insert({ instructions })
          .select()
          .single();

        if (error) throw error;
        setMemoryId(data.id);
      }

      setLastSaved(new Date());
      toast.success("Memória da IA salva com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar memória:", error);
      toast.error("Erro ao salvar memória da IA");
    } finally {
      setSaving(false);
    }
  };

  const resetMemory = () => {
    setInstructions("");
    toast.info("Memória resetada. Não esqueça de salvar!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Memória da IA
        </h1>
        <p className="text-muted-foreground">
          Configure as instruções e conhecimento da sua assistente virtual
        </p>
      </div>

      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-3 rounded-full">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Treine sua IA</CardTitle>
              <CardDescription>
                Insira todas as informações sobre seu negócio, produtos e serviços
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium text-sm">Dica Importante</p>
                <p className="text-sm text-muted-foreground">
                  Quanto mais detalhes você fornecer, melhor será o atendimento! 
                  Inclua informações como: horário de funcionamento, produtos/serviços, 
                  formas de pagamento, política de trocas, perguntas frequentes, etc.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Instruções para a IA
            </label>
            <Textarea
              placeholder="Ex: Somos a empresa XYZ, vendemos produtos de beleza. Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Oferecemos frete grátis para compras acima de R$ 100. Aceitamos pagamento via PIX, cartão de crédito e boleto. Nossa política de trocas permite devolução em até 7 dias..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="min-h-[300px] resize-none"
              maxLength={5000}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {instructions.length}/5000 caracteres
              </span>
              {lastSaved && (
                <span>
                  Última atualização: {lastSaved.toLocaleString("pt-BR")}
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={saveMemory}
              disabled={saving || !instructions.trim()}
              size="lg"
              className="flex-1"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Memória
                </>
              )}
            </Button>
            <Button
              onClick={resetMemory}
              variant="outline"
              size="lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como a IA usa essas informações?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                1
              </div>
              <div>
                <p className="font-medium">Contextualização</p>
                <p className="text-sm text-muted-foreground">
                  A IA lê suas instruções antes de cada resposta
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                2
              </div>
              <div>
                <p className="font-medium">Respostas Precisas</p>
                <p className="text-sm text-muted-foreground">
                  Usa APENAS as informações que você forneceu
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                3
              </div>
              <div>
                <p className="font-medium">Transferência Inteligente</p>
                <p className="text-sm text-muted-foreground">
                  Se não souber responder, transfere para o suporte humano
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}