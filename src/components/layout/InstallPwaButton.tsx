import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface InstallPwaButtonProps {
  variant?: "header" | "sidebar" | "sidebar-collapsed";
}

export function InstallPwaButton({ variant = "header" }: InstallPwaButtonProps) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  };

  if (variant === "sidebar-collapsed") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleInstall}
            className="flex items-center justify-center w-full h-11 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            title="Instalar app"
          >
            <span className="h-9 w-9 rounded-xl grid place-items-center hover:bg-sidebar-accent">
              <Download className="h-4 w-4" />
            </span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs">Instalar app</TooltipContent>
      </Tooltip>
    );
  }

  if (variant === "sidebar") {
    return (
      <button
        onClick={handleInstall}
        className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <Download className="h-4 w-4 shrink-0" />
        Instalar app
      </button>
    );
  }

  return (
    <button
      onClick={handleInstall}
      className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-accent/15 text-accent-ink hover:bg-accent/25 text-xs font-medium transition-colors"
      title="Instalar Quadra como aplicativo no seu dispositivo"
    >
      <Download className="h-3.5 w-3.5" />
      Instalar app
    </button>
  );
}
