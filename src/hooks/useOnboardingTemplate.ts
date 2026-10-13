import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  newSectionId,
  sectionsFromRows,
  type OnboardingSection,
  type OnboardingSectionRow,
  type OnboardingTemplateRow,
} from "@/lib/onboarding";

export const ONBOARDING_TEMPLATES_KEY = ["onboarding-templates"] as const;
export const ONBOARDING_TEMPLATE_KEY = ["onboarding-template"] as const;
export const PROJECT_ONBOARDING_KEY = ["project-onboarding"] as const;

/**
 * Modelos de onboarding do time (Configurações → Onboarding).
 * Vários por time; um deles é o padrão (is_default), usado pelas obras
 * que não escolheram modelo.
 */
export function useOnboardingTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ONBOARDING_TEMPLATES_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as OnboardingTemplateRow[];
    },
    enabled: !!user,
  });

  const templates = useMemo(() => query.data ?? [], [query.data]);
  const defaultTemplate = useMemo(() => templates.find((t) => t.is_default) ?? templates[0] ?? null, [templates]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ONBOARDING_TEMPLATES_KEY });
    queryClient.invalidateQueries({ queryKey: ONBOARDING_TEMPLATE_KEY });
    queryClient.invalidateQueries({ queryKey: PROJECT_ONBOARDING_KEY });
  };
  const onError = (title: string) => (e: Error) => toast({ title, description: e.message, variant: "destructive" });

  /** Cria um modelo; com copyFromId, copia as seções desse modelo. Retorna o id novo. */
  const create = useMutation({
    mutationFn: async ({ name, description, copyFromId }: { name: string; description?: string | null; copyFromId?: string | null }) => {
      const { data, error } = await supabase
        .from("onboarding_templates")
        .insert({ user_id: user!.id, name: name.trim() || "Novo modelo", description: description?.trim() || null, is_default: templates.length === 0 })
        .select("id")
        .single();
      if (error) throw error;
      if (copyFromId) {
        const { data: rows, error: e2 } = await supabase.from("onboarding_sections").select("*").eq("template_id", copyFromId);
        if (e2) throw e2;
        const copies = ((rows ?? []) as unknown as OnboardingSectionRow[]).map((r) => ({
          id: newSectionId(),
          template_id: data.id,
          user_id: user!.id,
          title: r.title,
          body: r.body,
          video_url: r.video_url,
          image_urls: r.image_urls ?? [],
          cta_label: r.cta_label,
          cta_url: r.cta_url,
          display_order: r.display_order,
          is_active: r.is_active,
          layout: r.layout ?? null,
        }));
        if (copies.length > 0) {
          const { error: e3 } = await supabase.from("onboarding_sections").insert(copies);
          if (e3) throw e3;
        }
      }
      return data.id as string;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Modelo criado" });
    },
    onError: onError("Erro ao criar modelo"),
  });

  const rename = useMutation({
    mutationFn: async ({ id, name, description }: { id: string; name: string; description?: string | null }) => {
      const { error } = await supabase
        .from("onboarding_templates")
        .update({ name: name.trim() || "Modelo", description: description?.trim() || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Modelo atualizado" });
    },
    onError: onError("Erro ao renomear modelo"),
  });

  /** Torna o modelo o padrão do time (só um is_default por time). */
  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      const { error: e1 } = await supabase.from("onboarding_templates").update({ is_default: false }).eq("is_default", true);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("onboarding_templates").update({ is_default: true }).eq("id", id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Modelo padrão atualizado" });
    },
    onError: onError("Erro ao definir modelo padrão"),
  });

  /** Apaga o modelo e suas seções; obras que o seguiam voltam ao padrão. */
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("onboarding_templates").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Modelo excluído" });
    },
    onError: onError("Erro ao excluir modelo"),
  });

  return {
    templates,
    defaultTemplate,
    isLoading: query.isLoading,
    isFetched: query.isFetched,
    dataUpdatedAt: query.dataUpdatedAt,
    create,
    rename,
    setDefault,
    remove,
  };
}

/**
 * Seções de um modelo de onboarding. Sem templateId, usa o modelo padrão
 * do time. Se o time ainda não tem modelo, salvar cria o "Template padrão".
 */
export function useOnboardingTemplate(templateId?: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useOnboardingTemplates();

  const template: OnboardingTemplateRow | null = useMemo(
    () => (templateId ? list.templates.find((t) => t.id === templateId) ?? null : list.defaultTemplate),
    [templateId, list.templates, list.defaultTemplate],
  );

  const query = useQuery({
    queryKey: [...ONBOARDING_TEMPLATE_KEY, template?.id ?? "none"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_sections")
        .select("*")
        .eq("template_id", template!.id)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OnboardingSectionRow[];
    },
    enabled: !!user && !!template,
  });

  const rows = useMemo(() => (template ? query.data ?? [] : []), [template, query.data]);
  const sections: OnboardingSection[] = useMemo(() => sectionsFromRows(rows), [rows]);

  /**
   * Grava a lista inteira: cria o modelo se não existir, faz upsert das
   * seções (id do cliente) e apaga as que saíram da lista.
   */
  const save = useMutation({
    mutationFn: async (next: OnboardingSection[]) => {
      let id = template?.id;
      if (!id) {
        const { data, error } = await supabase
          .from("onboarding_templates")
          .insert({ user_id: user!.id, name: "Template padrão", is_default: true })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
      }

      const upserts = next.map((s, i) => ({
        id: s.id,
        template_id: id!,
        user_id: user!.id,
        title: s.title,
        body: s.body,
        video_url: s.video_url,
        image_urls: s.image_urls,
        cta_label: s.cta_label,
        cta_url: s.cta_url,
        display_order: i,
        is_active: s.is_active,
        layout: s.layout ?? null,
      }));
      if (upserts.length > 0) {
        const { error } = await supabase.from("onboarding_sections").upsert(upserts, { onConflict: "id" });
        if (error) throw error;
      }

      const keep = new Set(next.map((s) => s.id));
      const removed = (rows ?? []).filter((r) => !keep.has(r.id)).map((r) => r.id);
      if (removed.length > 0) {
        const { error } = await supabase.from("onboarding_sections").delete().in("id", removed);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ONBOARDING_TEMPLATES_KEY });
      queryClient.invalidateQueries({ queryKey: ONBOARDING_TEMPLATE_KEY });
      queryClient.invalidateQueries({ queryKey: PROJECT_ONBOARDING_KEY });
      toast({ title: "Modelo de onboarding salvo" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar modelo", description: e.message, variant: "destructive" }),
  });

  return {
    template,
    templates: list.templates,
    defaultTemplate: list.defaultTemplate,
    sections,
    isLoading: list.isLoading || (!!template && query.isLoading),
    isFetched: list.isFetched && (!template || query.isFetched),
    dataUpdatedAt: Math.max(list.dataUpdatedAt, query.dataUpdatedAt),
    save,
  };
}

/** Upload de vídeo/imagem para o bucket público do onboarding. */
export async function uploadOnboardingMedia(file: File, folder: string): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("onboarding-media").upload(path, file, { contentType: file.type || undefined });
  if (error) throw error;
  const { data } = supabase.storage.from("onboarding-media").getPublicUrl(path);
  return data.publicUrl;
}
