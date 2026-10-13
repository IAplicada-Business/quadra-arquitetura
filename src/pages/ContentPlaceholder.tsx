import { Construction } from "lucide-react";
import { PageTitle } from "@/components/layout/PageTitle";

interface ContentPlaceholderProps {
  title: string;
}

export default function ContentPlaceholder({ title }: ContentPlaceholderProps) {
  return (
    <div className="space-y-6 p-0">
      <div className="flex items-center justify-between">
        <PageTitle title={title} description="Gestão de Conteúdo" />
      </div>

      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-muted/30">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <Construction className="h-8 w-8 text-accent-ink" />
        </div>
        <h3 className="text-lg font-display font-semibold mb-1">Módulo em construção</h3>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Este módulo será desenvolvido em breve.
        </p>
      </div>
    </div>
  );
}
