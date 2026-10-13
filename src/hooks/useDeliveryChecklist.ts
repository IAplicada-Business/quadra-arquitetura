import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { resizeImage } from "@/lib/imageResize";

/** Largura máxima das fotos do checklist depois de reduzidas no navegador. */
const CHECKLIST_PHOTO_MAX_WIDTH = 1600;

/** Bucket privado das fotos do checklist (ver migration 20261013120000). */
export const CHECKLIST_PHOTOS_BUCKET = "delivery-checklist-photos";

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Caminho no bucket: <obra>/<item>/<timestamp>-<n>.<ext> (a 1ª pasta é a obra, usada pela RLS). */
export function checklistPhotoPath(projectId: string, itemId: string, type: string, index = 0, now = Date.now()): string {
  const ext = EXT_BY_TYPE[type] ?? "jpg";
  return `${projectId}/${itemId}/${now}-${index}.${ext}`;
}

export interface DeliveryChecklistItem {
  id: string;
  project_id: string;
  user_id: string;
  activity_id: string | null;
  discipline: string | null;
  description: string;
  responsible: string | null;
  due_date: string | null;
  priority: "baixa" | "media" | "alta" | "urgente";
  resolved: boolean;
  resolved_at: string | null;
  /** Caminhos no bucket privado delivery-checklist-photos. */
  photo_paths: string[];
  created_at: string;
  updated_at: string;
}

export function useDeliveryChecklist(projectId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["delivery_checklist", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("delivery_checklist_items")
        .select("*")
        .eq("project_id", projectId!)
        .order("resolved", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as DeliveryChecklistItem[]).map((i) => ({ ...i, photo_paths: i.photo_paths ?? [] }));
    },
    enabled: !!projectId,
  });

  const create = useMutation({
    mutationFn: async (item: Partial<DeliveryChecklistItem>) => {
      const { data, error } = await supabase
        .from("delivery_checklist_items")
        .insert({
          ...item,
          description: item.description ?? "",
          project_id: projectId!,
          user_id: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      const row = data as unknown as DeliveryChecklistItem;
      return { ...row, photo_paths: row.photo_paths ?? [] };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_checklist", projectId] });
      toast({ title: "Item adicionado ao checklist" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryChecklistItem> & { id: string }) => {
      const payload: Partial<DeliveryChecklistItem> = { ...updates };
      if (Object.prototype.hasOwnProperty.call(updates, "resolved")) {
        payload.resolved_at = updates.resolved ? new Date().toISOString() : null;
      }
      const { error } = await supabase
        .from("delivery_checklist_items")
        .update(payload)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_checklist", projectId] });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const item = (query.data ?? []).find((i) => i.id === id);
      const { error } = await supabase
        .from("delivery_checklist_items")
        .delete()
        .eq("id", id);
      if (error) throw error;
      // Fotos do item saem junto (melhor esforço: o item já foi apagado).
      if (item?.photo_paths?.length) {
        await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).remove(item.photo_paths);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_checklist", projectId] });
      toast({ title: "Item removido" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  /** Envia fotos (já reduzidas) e anexa ao item. */
  const addPhotos = useMutation({
    mutationFn: async ({ item, files }: { item: DeliveryChecklistItem; files: File[] }) => {
      const uploaded: string[] = [];
      const now = Date.now();
      for (const [i, file] of files.entries()) {
        // Reduz no navegador; se não der (ex.: HEIC fora do Safari), envia o original.
        let blob: Blob = file;
        let type = file.type || "image/jpeg";
        try {
          const r = await resizeImage(file, CHECKLIST_PHOTO_MAX_WIDTH, 0.82);
          if (r.blob.size < file.size) {
            blob = r.blob;
            type = r.contentType;
          }
        } catch {
          /* mantém o arquivo original */
        }
        const path = checklistPhotoPath(projectId!, item.id, type, i, now);
        const { error } = await supabase.storage
          .from(CHECKLIST_PHOTOS_BUCKET)
          .upload(path, blob, { contentType: type, upsert: false });
        if (error) {
          if (uploaded.length) await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).remove(uploaded);
          throw error;
        }
        uploaded.push(path);
      }
      const { error } = await supabase
        .from("delivery_checklist_items")
        .update({ photo_paths: [...(item.photo_paths ?? []), ...uploaded] })
        .eq("id", item.id);
      if (error) {
        await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).remove(uploaded);
        throw error;
      }
      return uploaded.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["delivery_checklist", projectId] });
      toast({ title: count === 1 ? "Foto anexada" : `${count} fotos anexadas` });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao enviar foto", description: e.message, variant: "destructive" }),
  });

  const removePhoto = useMutation({
    mutationFn: async ({ item, path }: { item: DeliveryChecklistItem; path: string }) => {
      const { error } = await supabase
        .from("delivery_checklist_items")
        .update({ photo_paths: (item.photo_paths ?? []).filter((p) => p !== path) })
        .eq("id", item.id);
      if (error) throw error;
      await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).remove([path]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery_checklist", projectId] });
      toast({ title: "Foto removida" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao remover foto", description: e.message, variant: "destructive" }),
  });

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    create,
    update,
    remove,
    addPhotos,
    removePhoto,
  };
}

/**
 * URLs assinadas (1 h) das fotos do checklist. O bucket é privado, então
 * a imagem só abre para quem está logado e é da equipe da obra.
 */
export function useChecklistPhotoUrls(paths: string[]) {
  const key = [...paths].sort().join("|");
  const query = useQuery({
    queryKey: ["checklist_photo_urls", key],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(CHECKLIST_PHOTOS_BUCKET).createSignedUrls(paths, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data ?? []).forEach((d) => {
        if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
      });
      return map;
    },
    enabled: paths.length > 0,
    staleTime: 50 * 60 * 1000,
  });
  return { urls: query.data ?? {}, isLoading: query.isLoading };
}
