import { useMemo, type ReactNode } from "react";
import { Home, ShoppingBag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectActivity } from "@/hooks/useProjectActivities";
import type { ClosingScheduleItem } from "@/hooks/useClientClosingSchedule";
import { CLOSING_STATUS_CLASS, CLOSING_STATUS_LABEL } from "@/lib/closingStatus";
import { MoveInBanner } from "./MoveInBanner";
import { InfoHint } from "@/components/visual/InfoHint";

interface Props {
  activities: ProjectActivity[];
  closingItems: ClosingScheduleItem[];
  moveInDate: string | null;
  /** Só para testes: fixa a data de hoje. */
  today?: Date;
}

type ActivityRow = { type: "activity"; id: string; name: string; start_date: string | null; end_date: string | null; duration_days: number | null; sortDate: string };
type ClosingRow = { type: "closing"; id: string; name: string; start_date: string | null; end_date: string | null; status: ClosingScheduleItem["status"]; estimated_value: number | null; sortDate: string };
type AnyRow = ActivityRow | ClosingRow;

function fmt(iso: string | null) {
  return iso ? new Date(iso + "T00:00:00").toLocaleDateString("pt-BR") : "—";
}

/**
 * Subaba "Contagem Regressiva" (antiga "Lista Cliente"): serviços da
 * obra e entregas do cliente em ordem, do fim para o começo, com a
 * MUDANÇA como marco — responde "quanto falta pra acabar?".
 * Deriva do Cronograma Reverso (atividades) e do Fechamento Cliente.
 */
export function ClientCountdownList({ activities, closingItems, moveInDate, today }: Props) {
  const rows = useMemo<AnyRow[]>(() => {
    const act: ActivityRow[] = activities
      .filter((a) => a.start_date || a.end_date)
      .map((a) => ({
        type: "activity",
        id: a.id,
        name: a.name,
        start_date: a.start_date ?? null,
        end_date: a.end_date ?? null,
        duration_days: a.duration_days ?? null,
        sortDate: a.start_date ?? a.end_date ?? "",
      }));
    const closing: ClosingRow[] = closingItems
      .filter((i) => i.delivery_date || i.closing_date)
      .map((i) => ({
        type: "closing",
        id: i.id,
        name: i.description,
        start_date: i.closing_date ?? null,
        end_date: i.delivery_date ?? null,
        status: i.status,
        estimated_value: i.estimated_value ?? null,
        sortDate: i.delivery_date ?? i.closing_date ?? "",
      }));
    return [...act, ...closing].sort((a, b) => b.sortDate.localeCompare(a.sortDate));
  }, [activities, closingItems]);

  const moveInRow = moveInDate ? (
    <TableRow key="mudanca" className="bg-green-100 dark:bg-green-900/30 font-bold" data-testid="countdown-move-in">
      <TableCell className="font-bold">{fmt(moveInDate)}</TableCell>
      <TableCell className="font-bold">{fmt(moveInDate)}</TableCell>
      <TableCell className="font-bold">
        <span className="flex items-center gap-2"><Home className="h-4 w-4 text-green-700 dark:text-green-400" /> MUDANÇA</span>
      </TableCell>
      <TableCell className="text-center font-bold">0</TableCell>
    </TableRow>
  ) : null;

  const body: ReactNode[] = [];
  let moveInInserted = !moveInDate;
  for (const row of rows) {
    if (!moveInInserted && moveInDate && row.sortDate < moveInDate) {
      moveInInserted = true;
      body.push(moveInRow);
    }
    if (row.type === "closing") {
      body.push(
        <TableRow key={`closing-${row.id}`} className="bg-blue-50/60 dark:bg-blue-950/20" data-testid={`countdown-closing-${row.id}`}>
          <TableCell className="text-sm text-muted-foreground">{fmt(row.start_date)}</TableCell>
          <TableCell className="text-sm text-muted-foreground">{fmt(row.end_date)}</TableCell>
          <TableCell className="text-sm font-medium">
            <span className="flex items-center gap-2">
              <ShoppingBag className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              {row.name}
              {row.estimated_value != null && (
                <span className="text-xs text-muted-foreground">· {row.estimated_value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              )}
            </span>
          </TableCell>
          <TableCell className="text-center">
            <Badge variant="outline" className={`text-[10px] px-1.5 ${CLOSING_STATUS_CLASS[row.status]}`}>{CLOSING_STATUS_LABEL[row.status]}</Badge>
          </TableCell>
        </TableRow>,
      );
    } else {
      body.push(
        <TableRow key={row.id} data-testid={`countdown-activity-${row.id}`}>
          <TableCell className="text-sm">{fmt(row.start_date)}</TableCell>
          <TableCell className="text-sm">{fmt(row.end_date)}</TableCell>
          <TableCell className="text-sm font-medium">{row.name}</TableCell>
          <TableCell className="text-center text-sm">{row.duration_days ?? "—"}</TableCell>
        </TableRow>,
      );
    }
  }
  if (!moveInInserted && moveInDate) body.unshift(moveInRow);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold flex items-center gap-1.5">
          Contagem Regressiva
          <InfoHint>
            Quanto falta até a mudança: serviços da obra e entregas do cliente do fim para o começo. Gerada do Cronograma Reverso e do Fechamento Cliente.
          </InfoHint>
        </h3>
      </div>

      <MoveInBanner moveInDate={moveInDate} today={today} />

      {rows.length === 0 && !moveInDate ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          Aplique o calendário no Cronograma Reverso para gerar as datas e montar a contagem regressiva.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>COMEÇO / FECHAMENTO</TableHead>
                <TableHead>TÉRMINO / ENTREGA</TableHead>
                <TableHead className="flex-1">SERVIÇO / ITEM</TableHead>
                <TableHead className="text-center">PRAZO / STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{body}</TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
