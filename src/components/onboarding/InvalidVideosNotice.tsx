import { AlertCircle } from "lucide-react";
import type { invalidVideoSections } from "@/lib/onboarding";

/** Aviso acima do editor quando algum link de vídeo impede o salvar. */
export function InvalidVideosNotice({ errors }: { errors: ReturnType<typeof invalidVideoSections> }) {
  if (errors.length === 0) return null;
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm space-y-1" role="alert" data-testid="invalid-videos">
      <p className="font-medium flex items-center gap-1.5 text-destructive">
        <AlertCircle className="h-4 w-4" /> Corrija o link de vídeo antes de salvar
      </p>
      <ul className="text-xs text-muted-foreground list-disc pl-5">
        {errors.map((e) => (
          <li key={e.id}>
            <strong className="text-foreground">{e.title}:</strong> {e.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
