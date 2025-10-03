import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Zap, Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuickReply {
  id: string;
  title: string;
  content: string;
}

interface QuickRepliesProps {
  onUseReply: (content: string) => void;
}

export const QuickReplies = ({ onUseReply }: QuickRepliesProps) => {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  const loadQuickReplies = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('quick_replies')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuickReplies(data || []);
    } catch (error) {
      console.error('Error loading quick replies:', error);
    }
  };

  useEffect(() => {
    loadQuickReplies();
  }, []);

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) {
      toast.error('Preencha título e conteúdo');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('quick_replies').insert({
        user_id: user.id,
        title: newTitle,
        content: newContent
      });

      if (error) throw error;

      toast.success('Resposta rápida adicionada!');
      setNewTitle("");
      setNewContent("");
      setIsAdding(false);
      loadQuickReplies();
    } catch (error) {
      console.error('Error adding quick reply:', error);
      toast.error('Erro ao adicionar resposta rápida');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('quick_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Resposta rápida removida!');
      loadQuickReplies();
    } catch (error) {
      console.error('Error deleting quick reply:', error);
      toast.error('Erro ao remover resposta rápida');
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Texto copiado!');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Zap className="w-4 h-4 mr-2" />
          Respostas Rápidas
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚡ Respostas Rápidas</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Add New */}
          {isAdding ? (
            <Card className="p-4 border-dashed border-2">
              <Input
                placeholder="Título da resposta"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="mb-2"
              />
              <Textarea
                placeholder="Conteúdo da resposta..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="mb-2"
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm" className="flex-1">
                  Salvar
                </Button>
                <Button
                  onClick={() => setIsAdding(false)}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </Card>
          ) : (
            <Button
              onClick={() => setIsAdding(true)}
              variant="outline"
              className="w-full border-dashed"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Resposta Rápida
            </Button>
          )}

          {/* List */}
          <div className="space-y-2">
            {quickReplies.map((reply) => (
              <Card key={reply.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-sm">{reply.title}</h4>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(reply.id)}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                  {reply.content}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopy(reply.content)}
                    className="flex-1"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      onUseReply(reply.content);
                      setIsOpen(false);
                    }}
                    className="flex-1"
                  >
                    Usar
                  </Button>
                </div>
              </Card>
            ))}
          </div>

          {quickReplies.length === 0 && !isAdding && (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma resposta rápida cadastrada
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
