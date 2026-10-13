import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { WeeklyReportRecord } from "@/lib/weeklyReport";

export interface WeeklyReportInput {
  week_start: string;
  summary: string;
  next_steps: string;
  completion_percent: number;
  client_pending?: string;
  /** Fotos novas a enviar. */
  photos?: File[];
  /** Fotos já salvas que continuam no relatório (edição). */
  keep_photo_urls?: string[];
}

export function useWeeklyReports(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["weekly_reports", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("project_id", projectId!)
        .order("week_start", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WeeklyReportRecord[];
    },
    enabled: !!projectId,
  });

  const uploadPhotos = async (weekStart: string, files?: File[]) => {
    const urls: string[] = [];
    for (const file of files ?? []) {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `reports/${projectId}/${weekStart}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("project-files").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("project-files").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const create = useMutation({
    mutationFn: async (input: WeeklyReportInput) => {
      const photoUrls = await uploadPhotos(input.week_start, input.photos);
      const { data, error } = await supabase
        .from("weekly_reports")
        .insert({
          project_id: projectId!,
          user_id: user!.id,
          week_start: input.week_start,
          summary: input.summary,
          next_steps: input.next_steps,
          completion_percent: input.completion_percent,
          photo_urls: [...(input.keep_photo_urls ?? []), ...photoUrls],
          client_pending: input.client_pending || null,
          created_by: user!.email || null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as WeeklyReportRecord;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly_reports", projectId] });
      toast({ title: "Relatório semanal salvo", description: "Ele aparece em Relatórios semanais, nesta aba. Já está visível no portal do cliente." });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar relatório", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: WeeklyReportInput & { id: string }) => {
      const photoUrls = await uploadPhotos(input.week_start, input.photos);
      const { error } = await supabase
        .from("weekly_reports")
        .update({
          summary: input.summary,
          next_steps: input.next_steps,
          completion_percent: input.completion_percent,
          client_pending: input.client_pending || null,
          photo_urls: [...(input.keep_photo_urls ?? []), ...photoUrls],
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly_reports", projectId] });
      toast({ title: "Relatório atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar relatório", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("weekly_reports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["weekly_reports", projectId] });
      toast({ title: "Relatório removido" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { reports: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}
