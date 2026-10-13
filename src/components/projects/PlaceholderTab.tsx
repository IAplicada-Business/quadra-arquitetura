import { Construction } from "lucide-react";
import { InfoHint } from "@/components/visual/InfoHint";

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
      <h3 className="text-lg font-display font-semibold mb-1 flex items-center gap-1.5">
        {title}
        <InfoHint>{description}</InfoHint>
      </h3>
    </div>
  );
}
