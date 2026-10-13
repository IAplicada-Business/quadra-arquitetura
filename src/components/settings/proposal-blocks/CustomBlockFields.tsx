import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RichTextField } from "./RichTextField";
import { ImageField } from "./ImageField";
import type { CustomProposalBlock } from "@/lib/proposalBlocks";
import {
  columnTotals,
  formatFinancialValue,
  parseBRNumber,
  type CardsContent,
  type FinancialContent,
  type FinancialFormat,
  type FinancialTable,
  type TimelineContent,
} from "@/lib/proposalCustomBlocks";

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function TextField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-semibold">{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} className="h-8 text-sm" onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/** Célula numérica: digita em pt-BR ("1.234,56"), grava número ao sair do campo. */
function NumberCell({ value, onCommit, label }: { value: number | null; onCommit: (n: number | null) => void; label: string }) {
  const show = (v: number | null) => (v == null ? "" : String(v).replace(".", ","));
  const [draft, setDraft] = useState(show(value));
  useEffect(() => setDraft(show(value)), [value]);
  const commit = () => {
    const n = parseBRNumber(draft);
    if (n !== value) onCommit(n);
    else setDraft(show(value));
  };
  return (
    <Input
      value={draft}
      inputMode="decimal"
      aria-label={label}
      className="h-8 text-sm text-right tabular-nums"
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Estudo de viabilidade financeira                                    */
/* ------------------------------------------------------------------ */

const FORMAT_LABEL: Record<FinancialFormat, string> = { currency: "R$ (moeda)", number: "Número", percent: "%" };

function emptyTable(): FinancialTable {
  return { title: "Nova tabela", columns: ["Cenário A", "Cenário B"], rows: [{ label: "Linha 1", values: [null, null] }], format: "currency", showTotal: false };
}

function FinancialFields({ blockKey, content, onChange }: { blockKey: string; content: FinancialContent; onChange: (c: FinancialContent) => void }) {
  const setTable = (ti: number, table: FinancialTable) => onChange({ ...content, tables: content.tables.map((t, i) => (i === ti ? table : t)) });

  return (
    <div className="space-y-4">
      <TextField id={`${blockKey}-title`} label="Título" value={content.title} onChange={(title) => onChange({ ...content, title })} />
      <div className="space-y-1">
        <Label className="text-xs font-semibold">Introdução</Label>
        <RichTextField value={content.intro} rows={2} onChange={(intro) => onChange({ ...content, intro })} aria-label="Introdução" />
      </div>

      {content.tables.map((table, ti) => {
        const totals = table.showTotal ? columnTotals(table) : null;
        const tLabel = `Tabela ${ti + 1}`;
        return (
          <div key={ti} className="rounded-md border bg-background p-3 space-y-3" data-testid={`${blockKey}-table-${ti}`}>
            <div className="flex flex-wrap items-end gap-2">
              <div className="flex-1 min-w-[160px]">
                <TextField id={`${blockKey}-t${ti}-title`} label={`${tLabel}: título`} value={table.title} onChange={(title) => setTable(ti, { ...table, title })} />
              </div>
              <div className="w-36 space-y-1">
                <Label className="text-xs font-semibold">Formato</Label>
                <Select value={table.format} onValueChange={(v) => setTable(ti, { ...table, format: v as FinancialFormat })}>
                  <SelectTrigger className="h-8 text-xs" aria-label={`${tLabel}: formato`}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FORMAT_LABEL) as FinancialFormat[]).map((f) => <SelectItem key={f} value={f}>{FORMAT_LABEL[f]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-xs h-8">
                <Switch checked={table.showTotal} onCheckedChange={(v) => setTable(ti, { ...table, showTotal: v })} aria-label={`${tLabel}: linha de total`} />
                Total
              </label>
              <Button type="button" size="sm" variant="ghost" className="h-8 text-destructive" aria-label={`Remover ${tLabel}`} onClick={() => onChange({ ...content, tables: content.tables.filter((_, i) => i !== ti) })}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="text-left font-medium text-muted-foreground p-1">Linha</th>
                    {table.columns.map((col, ci) => (
                      <th key={ci} className="p-1 min-w-[110px]">
                        <div className="flex gap-1">
                          <Input
                            value={col}
                            aria-label={`${tLabel}: coluna ${ci + 1}`}
                            className="h-8 text-xs"
                            onChange={(e) => setTable(ti, { ...table, columns: table.columns.map((c, i) => (i === ci ? e.target.value : c)) })}
                          />
                          {table.columns.length > 1 && (
                            <Button
                              type="button" size="sm" variant="ghost" className="h-8 w-7 p-0 text-destructive"
                              aria-label={`${tLabel}: remover coluna ${ci + 1}`}
                              onClick={() => setTable(ti, { ...table, columns: table.columns.filter((_, i) => i !== ci), rows: table.rows.map((r) => ({ ...r, values: r.values.filter((_, i) => i !== ci) })) })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="p-1">
                      <Button
                        type="button" size="sm" variant="outline" className="h-8 text-xs"
                        onClick={() => setTable(ti, { ...table, columns: [...table.columns, `Coluna ${table.columns.length + 1}`], rows: table.rows.map((r) => ({ ...r, values: [...r.values, null] })) })}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Coluna
                      </Button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, ri) => (
                    <tr key={ri}>
                      <td className="p-1 min-w-[140px]">
                        <Input
                          value={row.label}
                          aria-label={`${tLabel}: linha ${ri + 1}`}
                          className="h-8 text-xs"
                          onChange={(e) => setTable(ti, { ...table, rows: table.rows.map((r, i) => (i === ri ? { ...r, label: e.target.value } : r)) })}
                        />
                      </td>
                      {table.columns.map((_, ci) => (
                        <td key={ci} className="p-1">
                          <NumberCell
                            value={row.values[ci] ?? null}
                            label={`${tLabel}: ${row.label || `linha ${ri + 1}`} × ${table.columns[ci] || `coluna ${ci + 1}`}`}
                            onCommit={(n) => setTable(ti, { ...table, rows: table.rows.map((r, i) => (i === ri ? { ...r, values: r.values.map((v, j) => (j === ci ? n : v)) } : r)) })}
                          />
                        </td>
                      ))}
                      <td className="p-1">
                        <Button type="button" size="sm" variant="ghost" className="h-8 w-7 p-0 text-destructive" aria-label={`${tLabel}: remover linha ${ri + 1}`} onClick={() => setTable(ti, { ...table, rows: table.rows.filter((_, i) => i !== ri) })}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {totals && (
                    <tr className="font-semibold">
                      <td className="p-1 pl-2">Total</td>
                      {totals.map((t, ci) => <td key={ci} className="p-1 text-right tabular-nums pr-3">{formatFinancialValue(t, table.format)}</td>)}
                      <td />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <Button
              type="button" size="sm" variant="outline" className="h-7 text-xs"
              onClick={() => setTable(ti, { ...table, rows: [...table.rows, { label: "", values: table.columns.map(() => null) }] })}
            >
              <Plus className="h-3 w-3 mr-1" /> Linha
            </Button>
          </div>
        );
      })}

      <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => onChange({ ...content, tables: [...content.tables, emptyTable()] })}>
        <Plus className="h-3.5 w-3.5 mr-1" /> Nova tabela
      </Button>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Observação (rodapé)</Label>
        <RichTextField value={content.note} rows={2} onChange={(note) => onChange({ ...content, note })} aria-label="Observação" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Linha do tempo                                                      */
/* ------------------------------------------------------------------ */

function TimelineFields({ blockKey, content, onChange }: { blockKey: string; content: TimelineContent; onChange: (c: TimelineContent) => void }) {
  const setSteps = (steps: TimelineContent["steps"]) => onChange({ ...content, steps });
  return (
    <div className="space-y-4">
      <TextField id={`${blockKey}-title`} label="Título" value={content.title} onChange={(title) => onChange({ ...content, title })} />
      <TextField id={`${blockKey}-subtitle`} label="Subtítulo" value={content.subtitle} onChange={(subtitle) => onChange({ ...content, subtitle })} />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Etapas e marcos</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSteps([...content.steps, { title: "", date: "", desc: "", milestone: false }])}>
            <Plus className="h-3 w-3 mr-1" /> Etapa
          </Button>
        </div>
        {content.steps.map((step, i) => (
          <div key={i} className="rounded-md border bg-background p-2.5 space-y-2" data-testid={`${blockKey}-step-${i}`}>
            <div className="flex gap-2">
              <Input value={step.title} placeholder="Etapa" aria-label={`Etapa ${i + 1}: título`} className="h-8 text-sm flex-1" onChange={(e) => setSteps(content.steps.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))} />
              <Input value={step.date} placeholder="Mar/2027 ou Semana 3" aria-label={`Etapa ${i + 1}: data ou prazo`} className="h-8 text-sm w-40" onChange={(e) => setSteps(content.steps.map((s, j) => (j === i ? { ...s, date: e.target.value } : s)))} />
            </div>
            <RichTextField value={step.desc} rows={2} aria-label={`Etapa ${i + 1}: descrição`} onChange={(desc) => setSteps(content.steps.map((s, j) => (j === i ? { ...s, desc } : s)))} />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={step.milestone} aria-label={`Etapa ${i + 1}: marco`} onCheckedChange={(v) => setSteps(content.steps.map((s, j) => (j === i ? { ...s, milestone: v === true } : s)))} />
                Marco (destaque)
              </label>
              <div className="flex gap-1">
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" title="Mover para cima" onClick={() => setSteps(move(content.steps, i, i - 1))} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0" title="Mover para baixo" onClick={() => setSteps(move(content.steps, i, i + 1))} disabled={i === content.steps.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
                <Button type="button" size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" aria-label={`Remover etapa ${i + 1}`} onClick={() => setSteps(content.steps.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cartões                                                             */
/* ------------------------------------------------------------------ */

function CardsFields({ blockKey, content, onChange, imageSuggestions }: { blockKey: string; content: CardsContent; onChange: (c: CardsContent) => void; imageSuggestions: { id: string; name: string; url: string }[] }) {
  const setCards = (cards: CardsContent["cards"]) => onChange({ ...content, cards });
  return (
    <div className="space-y-4">
      <TextField id={`${blockKey}-title`} label="Título" value={content.title} onChange={(title) => onChange({ ...content, title })} />
      <TextField id={`${blockKey}-subtitle`} label="Subtítulo" value={content.subtitle} onChange={(subtitle) => onChange({ ...content, subtitle })} />
      <div className="flex items-center gap-2">
        <Label className="text-xs font-semibold">Colunas</Label>
        <Select value={String(content.columns)} onValueChange={(v) => onChange({ ...content, columns: v === "3" ? 3 : 2 })}>
          <SelectTrigger className="h-8 w-20 text-xs" aria-label="Colunas"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2">2</SelectItem>
            <SelectItem value="3">3</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">Cartões</Label>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => setCards([...content.cards, { title: "", text: "", imageUrl: "" }])}>
            <Plus className="h-3 w-3 mr-1" /> Cartão
          </Button>
        </div>
        {content.cards.map((card, i) => (
          <div key={i} className="rounded-md border bg-background p-2.5 space-y-2" data-testid={`${blockKey}-card-${i}`}>
            <div className="flex gap-2">
              <Input value={card.title} placeholder="Título" aria-label={`Cartão ${i + 1}: título`} className="h-8 text-sm flex-1" onChange={(e) => setCards(content.cards.map((c, j) => (j === i ? { ...c, title: e.target.value } : c)))} />
              <Button type="button" size="sm" variant="ghost" className="h-8 w-7 p-0" title="Mover para cima" onClick={() => setCards(move(content.cards, i, i - 1))} disabled={i === 0}><ArrowUp className="h-3.5 w-3.5" /></Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 w-7 p-0" title="Mover para baixo" onClick={() => setCards(move(content.cards, i, i + 1))} disabled={i === content.cards.length - 1}><ArrowDown className="h-3.5 w-3.5" /></Button>
              <Button type="button" size="sm" variant="ghost" className="h-8 w-7 p-0 text-destructive" aria-label={`Remover cartão ${i + 1}`} onClick={() => setCards(content.cards.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
            </div>
            <RichTextField value={card.text} rows={2} aria-label={`Cartão ${i + 1}: texto`} onChange={(text) => setCards(content.cards.map((c, j) => (j === i ? { ...c, text } : c)))} />
            <ImageField
              id={`${blockKey}-card-${i}-image`}
              field={{ label: `Imagem do cartão ${i + 1}`, hint: "Opcional. Sem imagem, o cartão ganha só uma faixa de cor." }}
              value={card.imageUrl}
              suggestions={imageSuggestions}
              onChange={(imageUrl) => setCards(content.cards.map((c, j) => (j === i ? { ...c, imageUrl } : c)))}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function CustomBlockFields({
  block,
  onChange,
  imageSuggestions,
}: {
  block: CustomProposalBlock;
  onChange: (content: CustomProposalBlock["content"]) => void;
  imageSuggestions: { id: string; name: string; url: string }[];
}) {
  const includeSwitch = (
    <label className="flex items-start gap-2 rounded-md border bg-background p-2.5 text-xs cursor-pointer">
      <Switch
        checked={block.content.includeByDefault}
        aria-label="Incluir por padrão nas propostas"
        onCheckedChange={(v) => onChange({ ...block.content, includeByDefault: v })}
      />
      <span>
        <span className="font-semibold block">Incluir por padrão nas propostas</span>
        <span className="text-muted-foreground">Ligado: já vem marcado em propostas novas. Desligado: só entra na proposta que escolher este bloco.</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-4">
      {includeSwitch}
      {block.type === "financial" && <FinancialFields blockKey={block.key} content={block.content as FinancialContent} onChange={onChange} />}
      {block.type === "timeline" && <TimelineFields blockKey={block.key} content={block.content as TimelineContent} onChange={onChange} />}
      {block.type === "cards" && <CardsFields blockKey={block.key} content={block.content as CardsContent} onChange={onChange} imageSuggestions={imageSuggestions} />}
    </div>
  );
}
