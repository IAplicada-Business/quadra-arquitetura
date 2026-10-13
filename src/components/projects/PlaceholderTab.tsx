import { Construction } from "lucide-react";

interface PlaceholderTabProps {
  title: string;
  description: string;
}

export function PlaceholderTab({ title, description }: PlaceholderTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
      <div className="p-4 rounded-full bg-secondary mb-4">
        <Construction className="h-8 w-8 text-accent-ink" />
      </div>
      <h3 className="text-lg font-display font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md">{description}</p>
    </div>
  );
}
