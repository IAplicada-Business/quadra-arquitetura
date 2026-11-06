import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

/**
 * Abas de seção dentro de uma aba de página (ex.: Financeiro → Pagamentos/Compras).
 * Mesmo comportamento das Tabs, visual sublinhado e mais leve para não competir
 * com a barra de abas principal do projeto.
 */
const SectionTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 max-w-full items-end gap-4 overflow-x-auto border-b text-muted-foreground",
      className,
    )}
    {...props}
  />
));
SectionTabsList.displayName = "SectionTabsList";

const SectionTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 pb-2 text-sm font-medium transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
SectionTabsTrigger.displayName = "SectionTabsTrigger";

export { SectionTabsList, SectionTabsTrigger };
