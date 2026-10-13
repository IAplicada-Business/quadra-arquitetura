import { LucideIcon } from "lucide-react";

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon: LucideIcon;
}

export function PlaceholderPage({ title, description, icon: Icon }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="text-2xl font-bold font-display mb-1">{title}</h1>
      <p className="text-muted-foreground mb-8">{description}</p>

      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-lg bg-muted/30">
        <div className="p-4 rounded-full bg-secondary mb-4">
          <Icon className="h-8 w-8 text-accent-ink" />
        </div>
        <h3 className="text-lg font-display font-semibold mb-1">Módulo em construção</h3>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Este módulo será desenvolvido em breve. Toda a estrutura do banco de dados já está preparada.
        </p>
      </div>
    </div>
  );
}
