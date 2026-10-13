import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { InvoiceNFList } from "@/components/projects/InvoiceNFList";
import { PageTitle } from "@/components/layout/PageTitle";

export default function InvoicesPage() {
  const { user } = useAuth();

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-list-simple"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, name").order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6 p-0">
      <div className="flex items-center justify-between">
        <PageTitle title="Notas Fiscais" description="Visão consolidada de todas as NFs" />
      </div>
      <InvoiceNFList showProjectColumn projects={projects} />
    </div>
  );
}
