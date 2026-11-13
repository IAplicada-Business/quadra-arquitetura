import { useState } from "react";
import { Check, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrencyBRL, formatDateBR, type PortalScenario } from "@/lib/portal";
import { scenarioTotal, validateClientName } from "@/lib/portalScenarioApproval";
import { SectionTitle, type ScreenProps } from "./screens/shared";

/**
 * Cenários de orçamento na Trilha: o cliente marca/desmarca os itens e aprova.
 * Aprovar só registra (nome + data); a equipe gera parcelas e escopo depois.
 */
export function ScenarioApproval({ data, onScenarioAction, clientName }: Pick<ScreenProps, "data" | "onScenarioAction" | "clientName">) {
  const scenarios = data.scenarios ?? [];
  const [approving, setApproving] = useState<PortalScenario | null>(null);
  const [name, setName] = useState(clientName ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (scenarios.length === 0) return null;

  const confirmApprove = async () => {
    const v = validateClientName(name);
    if ("error" in v) {
      setNameError(v.error);
      return;
    }
    setBusy(true);
    const ok = await onScenarioAction?.({ action: "approve", scenarioId: approving!.id, clientName: v.name });
    setBusy(false);
    if (ok) setApproving(null);
  };

  return (
    <div className="space-y-4" data-testid="scenario-approval">
      <SectionTitle title="Cenários do orçamento" subtitle="Marque os itens que você quer contratar e aprove o orçamento." />
      {scenarios.map((s) => {
        const total = scenarioTotal(s.items);
        const approved = !!s.approved_at;
        const locked = s.is_locked || approved;
        return (
          <Card key={s.id} data-testid={`scenario-${s.id}`}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="font-display text-lg">{s.name}</CardTitle>
              {approved && (
                <Badge className="bg-[var(--trilha-salvia)] text-white" data-testid={`scenario-approved-${s.id}`}>
                  <Lock className="mr-1 h-3 w-3" /> Aprovado
                </Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="divide-y divide-[var(--trilha-navy)]/10">
                {s.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <label className="flex min-w-0 flex-1 items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0"
                        checked={it.is_included}
                        disabled={locked}
                        data-testid={`scenario-item-${it.id}`}
                        onChange={(e) =>
                          void onScenarioAction?.({ action: "toggle_item", scenarioId: s.id, itemId: it.id, isIncluded: e.target.checked })
                        }
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-[var(--trilha-navy)]">{it.description || it.discipline || "Item"}</span>
                        {it.discipline && it.description && (
                          <span className="block truncate text-xs text-[var(--trilha-navy)]/60">{it.discipline}</span>
                        )}
                      </span>
                    </label>
                    <span className="shrink-0 tabular-nums">{formatCurrencyBRL(it.estimated_value || 0)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--trilha-navy)]/10 pt-3">
                <div>
                  <p className="trilha-eyebrow">Total selecionado</p>
                  <p className="font-display text-xl" data-testid={`scenario-total-${s.id}`}>{formatCurrencyBRL(total)}</p>
                </div>
                {approved ? (
                  <p className="text-sm text-[var(--trilha-navy)]/70" data-testid={`scenario-approved-by-${s.id}`}>
                    Aprovado{s.approved_by_name ? ` por ${s.approved_by_name}` : ""} em {formatDateBR(s.approved_at)}
                  </p>
                ) : (
                  <Button
                    disabled={locked || !s.items.some((i) => i.is_included)}
                    onClick={() => {
                      setNameError(null);
                      setApproving(s);
                    }}
                    data-testid={`scenario-approve-${s.id}`}
                  >
                    <Check className="mr-1 h-4 w-4" /> Aprovar orçamento
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!approving} onOpenChange={(o) => !o && setApproving(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprovar orçamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm">
              Você está aprovando <strong>{approving?.name}</strong> no valor de{" "}
              <strong>{formatCurrencyBRL(approving ? scenarioTotal(approving.items) : 0)}</strong>. A equipe será avisada.
            </p>
            <Label htmlFor="scenario-approver-name">Seu nome (para registro)</Label>
            <Input
              id="scenario-approver-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameError(null);
              }}
              placeholder="Nome completo"
              maxLength={80}
            />
            {nameError && <p className="text-sm text-destructive" role="alert">{nameError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={busy}>Cancelar</Button>
            <Button onClick={confirmApprove} disabled={busy} data-testid="scenario-approve-confirm">Confirmar aprovação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
