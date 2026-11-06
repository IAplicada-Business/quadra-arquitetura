import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface SiteLeadPayload {
  name: string;
  email: string;
  phone: string;
  projectType: "residencial" | "comercial" | "saude" | "outro";
  message?: string;
  /** De onde veio o lead. Padrão: landing_page (formulário de contato). */
  sourceDetail?: string;
}

export function useSiteLead() {
  return useMutation({
    mutationFn: async (data: SiteLeadPayload) => {
      // Insert lead via Supabase — anon key has RLS policy for public site inserts
      const { error } = await supabase.from("leads").insert({
        name: data.name,
        email: data.email,
        phone: data.phone,
        project_type: data.projectType,
        message: data.message || null,
        origin: "site" as const,
        lead_type: "comercial" as const,
        status: "novo",
        source_detail: data.sourceDetail ?? "landing_page",
        // user_id is intentionally null for public leads — adjust per RLS policy
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada!",
        description: "Obrigada pelo contato. Retornaremos em breve.",
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Erro ao enviar",
        description: e.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    },
  });
}
