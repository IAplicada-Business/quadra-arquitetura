import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addDays, differenceInDays } from "date-fns";
import { sanitizeEmptyStrings } from "@/lib/sanitizePayload";

export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  description: string | null;
  area_m2: number | null;
  duration_days: number | null;
  start_date: string | null;
  end_date: string | null;
  medicao_date: string | null;
  status: string;
  progress_percent: number;
  depends_on: string[];
  discipline: string | null;
  position: number;
  created_at: string;
}

/** Status de project_activities → status de schedule_tasks (portal do cliente). */
export const ACTIVITY_TO_TASK_STATUS: Record<string, string> = {
  pendente: "planejado",
  em_andamento: "em_execucao",
  concluida: "executado",
  bloqueada: "atrasado",
};

/**
 * Patch aplicado ao marcar/reabrir uma atividade como entregue.
 * Entregar = concluída com 100%. Reabrir volta para "em andamento" se já
 * começou (start_date <= hoje) ou "pendente", com progresso 0.
 */
export function resolveDonePatch(
  activity: Pick<ProjectActivity, "start_date">,
  done: boolean,
  today: string,
): { status: string; progress_percent: number } {
  if (done) return { status: "concluida", progress_percent: 100 };
  const started = !!activity.start_date && activity.start_date <= today;
  return { status: started ? "em_andamento" : "pendente", progress_percent: 0 };
}

export interface CascadeChange {
  id: string;
  name: string;
  oldStart: string;
  oldEnd: string;
  newStart: string;
  newEnd: string;
}

export function computeCascade(changedId: string, newEndDate: string, activities: ProjectActivity[]): CascadeChange[] {
  const changes: CascadeChange[] = [];
  const visited = new Set<string>();

  function propagate(actId: string, endDate: string) {
    const dependents = activities.filter(a => a.depends_on?.includes(actId));
    for (const dep of dependents) {
      if (visited.has(dep.id)) continue;
      visited.add(dep.id);
      if (!dep.start_date || !dep.end_date) continue;
      const duration = differenceInDays(new Date(dep.end_date), new Date(dep.start_date));
      const newStart = addDays(new Date(endDate), 1).toISOString().split("T")[0];
      const newEnd = addDays(new Date(newStart), duration).toISOString().split("T")[0];
      changes.push({ id: dep.id, name: dep.name, oldStart: dep.start_date, oldEnd: dep.end_date, newStart, newEnd });
      propagate(dep.id, newEnd);
    }
  }
  propagate(changedId, newEndDate);
  return changes;
}

export function computeRecalculateAll(activities: ProjectActivity[]): CascadeChange[] {
  const changes: CascadeChange[] = [];
  const actMap = new Map<string, ProjectActivity>();
  activities.forEach(a => actMap.set(a.id, a));

  // Topological sort
  const inDegree = new Map<string, number>();
  const dependentsOf = new Map<string, string[]>();
  activities.forEach(a => {
    const deps = (a.depends_on || []).filter(d => actMap.has(d));
    inDegree.set(a.id, deps.length);
    deps.forEach(d => {
      const arr = dependentsOf.get(d) || [];
      arr.push(a.id);
      dependentsOf.set(d, arr);
    });
  });

  const queue: string[] = [];
  inDegree.forEach((deg, id) => { if (deg === 0) queue.push(id); });

  const topoOrder: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    topoOrder.push(id);
    (dependentsOf.get(id) || []).forEach(depId => {
      const nd = (inDegree.get(depId) || 1) - 1;
      inDegree.set(depId, nd);
      if (nd === 0) queue.push(depId);
    });
  }
  // Include remaining (cycles)
  activities.forEach(a => { if (!topoOrder.includes(a.id)) topoOrder.push(a.id); });

  // Compute new dates based on predecessors
  const newEndMap = new Map<string, string>();

  for (const id of topoOrder) {
    const act = actMap.get(id)!;
    if (!act.start_date || !act.duration_days) {
      if (act.end_date) newEndMap.set(id, act.end_date);
      continue;
    }

    const deps = (act.depends_on || []).filter(d => actMap.has(d));
    let newStart = act.start_date;

    if (deps.length > 0) {
      const latestPredEnd = deps.reduce((latest, d) => {
        const predEnd = newEndMap.get(d);
        if (!predEnd) return latest;
        return predEnd > latest ? predEnd : latest;
      }, "");

      if (latestPredEnd) {
        const candidateStart = addDays(new Date(latestPredEnd), 1).toISOString().split("T")[0];
        if (candidateStart > newStart) {
          newStart = candidateStart;
        }
      }
    }

    const newEnd = addDays(new Date(newStart), act.duration_days).toISOString().split("T")[0];
    newEndMap.set(id, newEnd);

    if (newStart !== act.start_date || newEnd !== (act.end_date || "")) {
      changes.push({
        id: act.id,
        name: act.name,
        oldStart: act.start_date,
        oldEnd: act.end_date || act.start_date,
        newStart,
        newEnd,
      });
    }
  }

  return changes;
}

async function autoCalculateMaterials(activity: { id: string; area_m2?: number | null; discipline?: string | null; project_id: string; user_id: string }) {
  if (!activity.area_m2 || activity.area_m2 <= 0 || !activity.discipline) return;

  const { data: indices } = await supabase
    .from("material_indices" as any)
    .select("*");
  if (!indices || indices.length === 0) return;

  const matchingIndices = (indices as any[]).filter(
    (idx: any) => idx.activity_type?.toLowerCase() === activity.discipline!.toLowerCase()
  );
  if (matchingIndices.length === 0) return;

  let count = 0;
  for (const idx of matchingIndices) {
    const qty = activity.area_m2 * Number(idx.index_per_m2);

    const { data: existing } = await supabase
      .from("material_tracking")
      .select("id, source")
      .eq("activity_id", activity.id)
      .eq("material_name", idx.material_name)
      .maybeSingle();

    if (!existing) {
      await supabase.from("material_tracking").insert({
        project_id: activity.project_id,
        user_id: activity.user_id,
        activity_id: activity.id,
        material_name: idx.material_name,
        unit: idx.unit,
        discipline: activity.discipline,
        calculated_quantity: qty,
        quantity_needed: qty,
        source: "automatico",
      });
      count++;
    } else if (existing.source === "automatico") {
      await supabase
        .from("material_tracking")
        .update({ calculated_quantity: qty, quantity_needed: qty })
        .eq("id", existing.id);
      count++;
    }
  }

  if (count > 0) {
    toast({ title: `${count} materiais calculados para esta atividade` });
  }
}

export function useProjectActivities(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["project_activities", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_activities" as any)
        .select("*")
        .eq("project_id", projectId!)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as any[]) as ProjectActivity[];
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<ProjectActivity>) => {
      const { data, error } = await supabase
        .from("project_activities" as any)
        .insert({
          ...sanitizeEmptyStrings(item as Record<string, unknown>),
          project_id: projectId!,
          user_id: user!.id,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      toast({ title: "Atividade criada" });
      autoCalculateMaterials({
        id: data.id,
        area_m2: data.area_m2,
        discipline: data.discipline,
        project_id: projectId!,
        user_id: user!.id,
      }).then(() => {
        queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
      });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<ProjectActivity>) => {
      const clean = sanitizeEmptyStrings(updates as Record<string, unknown>);
      const { error } = await supabase
        .from("project_activities" as any)
        .update(clean as any)
        .eq("id", id);
      if (error) throw error;
      return { id, ...clean };
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      toast({ title: "Atividade atualizada" });
      if (data.area_m2 !== undefined || data.discipline !== undefined) {
        autoCalculateMaterials({
          id: data.id,
          area_m2: data.area_m2,
          discipline: data.discipline,
          project_id: projectId!,
          user_id: user!.id,
        }).then(() => {
          queryClient.invalidateQueries({ queryKey: ["material_tracking", projectId] });
        });
      }
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("project_activities" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      toast({ title: "Atividade removida" });
    },
    onError: (e: Error) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const batchUpdateDates = useMutation({
    mutationFn: async (updates: { id: string; start_date: string; end_date: string }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("project_activities" as any)
          .update({ start_date: u.start_date, end_date: u.end_date } as any)
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      toast({ title: "Datas recalculadas com sucesso" });
    },
    onError: (e: Error) => toast({ title: "Erro ao recalcular", description: e.message, variant: "destructive" }),
  });

  /**
   * Edição inline de datas (Cronograma Reverso). Otimista: o cache da
   * query é atualizado na hora, então Gantt e tabela reversa refletem a
   * mudança antes da resposta do banco; em erro, volta ao estado anterior.
   * Sem toast de sucesso pra não poluir a tela a cada célula editada.
   */
  const updateDates = useMutation({
    mutationFn: async ({ id, ...dates }: { id: string; start_date?: string | null; end_date?: string | null; duration_days?: number | null }) => {
      const { error } = await supabase
        .from("project_activities")
        .update(dates)
        .eq("id", id);
      if (error) throw error;
      return { id, ...dates };
    },
    onMutate: async ({ id, ...dates }) => {
      const key = ["project_activities", projectId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectActivity[]>(key);
      queryClient.setQueryData<ProjectActivity[]>(key, (old) =>
        (old ?? []).map((a) => (a.id === id ? { ...a, ...dates } : a)),
      );
      return { previous };
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["project_activities", projectId], ctx.previous);
      toast({ title: "Erro ao salvar data", description: e.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
    },
  });

  /**
   * Check "entregue" direto na linha. Otimista (cache atualizado na hora,
   * rollback em erro), espelha o status em schedule_tasks (portal do cliente
   * e dashboard leem de lá) e mostra um toast claro de confirmação.
   */
  const markDone = useMutation({
    mutationFn: async ({ activity, done }: { activity: ProjectActivity; done: boolean }) => {
      const patch = resolveDonePatch(activity, done, new Date().toISOString().split("T")[0]);
      const { error } = await supabase.from("project_activities").update(patch).eq("id", activity.id);
      if (error) throw error;
      // Espelho no portal: só atualiza se a atividade já foi sincronizada.
      const { error: taskError } = await supabase
        .from("schedule_tasks")
        .update({ status: ACTIVITY_TO_TASK_STATUS[patch.status] ?? "planejado", progress_percentage: patch.progress_percent })
        .eq("source_activity_id", activity.id);
      if (taskError) console.warn("[markDone] schedule_tasks não sincronizado:", taskError.message);
      return { activity, done, patch };
    },
    onMutate: async ({ activity, done }) => {
      const key = ["project_activities", projectId];
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProjectActivity[]>(key);
      const patch = resolveDonePatch(activity, done, new Date().toISOString().split("T")[0]);
      queryClient.setQueryData<ProjectActivity[]>(key, (old) =>
        (old ?? []).map((a) => (a.id === activity.id ? { ...a, ...patch } : a)),
      );
      return { previous };
    },
    onSuccess: ({ activity, done }) => {
      toast({
        title: done ? "Atividade entregue" : "Atividade reaberta",
        description: done
          ? `"${activity.name}" foi marcada como entregue (100%).`
          : `"${activity.name}" voltou a ficar em aberto.`,
      });
    },
    onError: (e: Error, { activity, done }, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["project_activities", projectId], ctx.previous);
      toast({
        title: done ? "Não foi possível marcar como entregue" : "Não foi possível reabrir",
        description: `"${activity.name}": ${e.message}`,
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["project_activities", projectId] });
      queryClient.invalidateQueries({ queryKey: ["schedule_tasks", projectId] });
    },
  });

  return { activities: query.data ?? [], isLoading: query.isLoading, create, update, remove, batchUpdateDates, updateDates, markDone };
}
