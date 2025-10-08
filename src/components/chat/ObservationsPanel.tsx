import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ObservationsPanelProps {
  attendanceId: string;
  currentObservations?: string;
}

export const ObservationsPanel = ({ attendanceId, currentObservations }: ObservationsPanelProps) => {
  const [observations, setObservations] = useState(currentObservations || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    setObservations(currentObservations || "");
  }, [currentObservations]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('attendances')
        .update({ observations })
        .eq('id', attendanceId);

      if (error) throw error;

      toast.success('Observações salvas!');
    } catch (error) {
      console.error('Error saving observations:', error);
      toast.error('Erro ao salvar observações');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
      <div
        className="flex items-center justify-between cursor-pointer mb-2"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-sm text-amber-900 dark:text-amber-100">
            Observações Internas
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {isExpanded ? 'Clique para recolher' : 'Clique para expandir'}
        </span>
      </div>

      {isExpanded && (
        <div className="space-y-2">
          <Textarea
            placeholder="Adicione observações internas sobre este atendimento... (visível apenas para a equipe)"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            rows={4}
            className="bg-background"
          />
          <Button
            onClick={handleSave}
            disabled={isSaving}
            size="sm"
            className="w-full"
          >
            <Save className="w-3 h-3 mr-2" />
            {isSaving ? 'Salvando...' : 'Salvar Observações'}
          </Button>
        </div>
      )}
    </Card>
  );
};
