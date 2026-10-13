import { useState, useCallback, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VoiceChat } from "@/components/ui/ia-siri-chat";
import { useVoiceTasks } from "@/hooks/useVoiceTasks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface VoiceAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const priorityColors: Record<string, string> = {
  baixa: "bg-muted text-muted-foreground",
  media: "bg-primary/10 text-primary",
  alta: "bg-warning/10 text-warning-ink",
  urgente: "bg-destructive/10 text-destructive",
};

const categoryLabels: Record<string, string> = {
  cronograma: "Cronograma",
  escopo: "Escopo",
  orcamentos: "Orçamentos",
  materiais: "Materiais",
  pendencias: "Pendências",
  financeiro: "Financeiro",
  compras: "Compras",
  documentos: "Documentos",
};

export function VoiceAgentDialog({ open, onOpenChange }: VoiceAgentDialogProps) {
  const { user } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const selectedProjectIdRef = useRef<string>("");
  const [voiceState, setVoiceState] = useState<"idle" | "listening" | "processing" | "speaking">("idle");
  const [sessionTasks, setSessionTasks] = useState<any[]>([]);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_voice"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name")
        .eq("user_id", user!.id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user && open,
  });

  // Auto-select first project when dialog opens and projects load
  useEffect(() => {
    if (open && projects.length > 0 && !selectedProjectIdRef.current) {
      const firstId = projects[0].id;
      setSelectedProjectId(firstId);
      selectedProjectIdRef.current = firstId;
    }
  }, [open, projects]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      selectedProjectIdRef.current = "";
      setSelectedProjectId("");
      setSessionTasks([]);
    }
  }, [open]);

  const handleProjectChange = useCallback((value: string) => {
    setSelectedProjectId(value);
    selectedProjectIdRef.current = value;
  }, []);

  const { createBatch, isCreating } = useVoiceTasks();
  const queryClient = useQueryClient();

  const handleTranscript = useCallback(
    async (transcript: string) => {
      setVoiceState("processing");

      try {
        // Read from ref to avoid stale closure
        const manualProjectId = selectedProjectIdRef.current;

        const { data, error } = await supabase.functions.invoke("process-voice-command", {
          body: { transcript, projects, selectedProjectId: manualProjectId },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        // Validate AI project_id against local projects
        const aiProjectId = data.project_id && data.project_id !== "null" ? data.project_id : null;
        const validAiProjectId = aiProjectId && projects.some((p) => p.id === aiProjectId) ? aiProjectId : null;

        // Prioritize manual selection over AI
        const resolvedProjectId = manualProjectId || validAiProjectId;

        if (!resolvedProjectId || !projects.some((p) => p.id === resolvedProjectId)) {
          toast({
            title: "Projeto não identificado",
            description: "Selecione um projeto ou mencione o nome do projeto no comando de voz.",
            variant: "destructive",
          });
          setVoiceState("idle");
          return;
        }

        const tasks = data.tasks || [];
        if (tasks.length === 0) {
          toast({ title: "Nenhuma tarefa identificada", description: "Tente novamente com mais detalhes." });
          setVoiceState("idle");
          return;
        }

        setVoiceState("speaking");
        const created = await createBatch({ tasks, projectId: resolvedProjectId, transcript });

        // Insert into schedule_tasks with explicit error checking
        const parentTasks = (created as any[]).filter((t: any) => !t.parent_id);
        if (parentTasks.length > 0) {
          const scheduleRows = parentTasks.map((t: any) => ({
            task_name: t.title,
            payment_note: t.description || null,
            discipline: t.category || null,
            project_id: resolvedProjectId,
            user_id: user!.id,
            status: "planejado",
          }));

          const { error: scheduleError } = await supabase.from("schedule_tasks").insert(scheduleRows);

          if (scheduleError) {
            console.error("[VoiceAgent] schedule_tasks insert error:", scheduleError);
            toast({
              title: "Tarefas salvas parcialmente",
              description: "As tarefas foram registradas no histórico, mas houve erro ao salvar em Obras/Tarefas.",
              variant: "destructive",
            });
          }
        }

        queryClient.invalidateQueries({ queryKey: ["schedule_tasks"] });
        queryClient.invalidateQueries({ queryKey: ["all_schedule_tasks"] });
        queryClient.invalidateQueries({ queryKey: ["voice_tasks"] });

        setSessionTasks((prev) => [...created, ...prev]);
        setVoiceState("idle");
      } catch (err: any) {
        console.error("Voice processing error:", err);
        toast({ title: "Erro ao processar", description: err.message, variant: "destructive" });
        setVoiceState("idle");
      }
    },
    [projects, createBatch, user, queryClient]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full h-[90vh] max-h-[90vh] flex flex-col p-0 gap-0 bg-background">
        <DialogTitle className="sr-only">Assistente de Voz IA</DialogTitle>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-display">Assistente de Voz</h2>
          <div className="flex items-center gap-3">
            <Select value={selectedProjectId} onValueChange={handleProjectChange}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Selecionar projeto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Voice Chat area */}
        <div className="flex-shrink-0 py-4">
          <VoiceChat
            onTranscript={handleTranscript}
            onStateChange={setVoiceState}
            isProcessing={voiceState === "processing" || isCreating}
            isSpeaking={voiceState === "speaking"}
          />
        </div>

        {/* Session tasks */}
        {sessionTasks.length > 0 && (
          <div className="flex-1 min-h-0 border-t">
            <div className="p-3 border-b bg-muted/30">
              <h3 className="text-sm font-medium text-muted-foreground">
                Tarefas criadas nesta sessão ({sessionTasks.length})
              </h3>
            </div>
            <ScrollArea className="h-full">
              <div className="p-3 space-y-2">
                {sessionTasks.map((task: any) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <Badge variant="outline" className="text-[10px] h-5">
                          {categoryLabels[task.category] || task.category}
                        </Badge>
                        <Badge className={`text-[10px] h-5 ${priorityColors[task.priority] || ""}`}>
                          {task.priority}
                        </Badge>
                        {task.responsible && (
                          <span className="text-[10px] text-muted-foreground">→ {task.responsible}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
