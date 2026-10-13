import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { GripVertical, ArchiveRestore, Archive, Pencil, Plus, X, ShieldAlert, Handshake } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import {
  useAcquisitionChannels,
  CHANNEL_CATEGORIES,
  CHANNEL_CATEGORY_LABELS,
  type AcquisitionChannel,
  type AcquisitionChannelCategory,
} from "@/hooks/useAcquisitionChannels";
import { usePermissions } from "@/hooks/usePermissions";
import { InfoHint } from "@/components/visual/InfoHint";

const DEFAULT_COLOR = "#64748B";

interface FormState {
  name: string;
  category: AcquisitionChannelCategory;
  color: string;
  is_partner_channel: boolean;
}

const emptyForm: FormState = { name: "", category: "outros", color: DEFAULT_COLOR, is_partner_channel: false };

export default function AcquisitionChannelsSettings() {
  const { isAdmin } = usePermissions();
  const { channels, isLoading, create, update, toggleActive, reorder } = useAcquisitionChannels();

  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [adding, setAdding] = useState(false);

  const active = channels.filter((c) => c.is_active).sort((a, b) => a.display_order - b.display_order);
  const archived = channels.filter((c) => !c.is_active);

  const startEdit = (c: AcquisitionChannel) => {
    setEditingId(c.id);
    setAdding(false);
    setForm({ name: c.name, category: c.category, color: c.color, is_partner_channel: c.is_partner_channel });
  };

  const cancelForm = () => {
    setEditingId(null);
    setAdding(false);
    setForm(emptyForm);
  };

  const submitForm = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      update.mutate({ id: editingId, name: form.name.trim(), category: form.category, color: form.color, is_partner_channel: form.is_partner_channel });
    } else {
      create.mutate({ name: form.name.trim(), category: form.category, color: form.color, is_partner_channel: form.is_partner_channel });
    }
    cancelForm();
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(active);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    reorder.mutate(reordered.map((c) => c.id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-display flex items-center gap-1.5">
          Canais de Aquisição
          <InfoHint>
            Canais alimentam o formulário de leads, o filtro do pipeline e o dashboard comercial.
            {!isAdmin && " Apenas administradores podem criar, editar, arquivar ou reordenar canais."}
          </InfoHint>
        </CardTitle>
        {isAdmin && !adding && !editingId && (
          <Button size="sm" onClick={() => { setAdding(true); setForm(emptyForm); }}>
            <Plus className="h-4 w-4 mr-1" /> Novo canal
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!isAdmin && archived.length === 0 && active.length === 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldAlert className="h-4 w-4" /> Nenhum canal cadastrado ainda.
          </div>
        )}

        {(adding || editingId) && isAdmin && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_auto_auto_auto] gap-3 items-end">
              <div>
                <Label>Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Parceria com Estúdio Y"
                  autoFocus
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v as AcquisitionChannelCategory }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CHANNEL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{CHANNEL_CATEGORY_LABELS[cat]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Cor</Label>
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  className="h-9 w-9 rounded border cursor-pointer block"
                />
              </div>
              <Button onClick={submitForm} disabled={!form.name.trim() || create.isPending || update.isPending}>
                {editingId ? "Salvar" : "Adicionar"}
              </Button>
              <Button variant="ghost" size="icon" onClick={cancelForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer w-fit">
              <Checkbox
                checked={form.is_partner_channel}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_partner_channel: v === true }))}
              />
              <Handshake className="h-3.5 w-3.5 text-muted-foreground" />
              Este canal indica um parceiro (permite vincular qual parceiro no formulário de lead)
            </label>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando canais…</p>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="acquisition-channels" isDropDisabled={!isAdmin}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                  {active.map((c, index) => (
                    <Draggable key={c.id} draggableId={c.id} index={index} isDragDisabled={!isAdmin}>
                      {(dragProvided, snapshot) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          className={`flex items-center gap-3 p-2.5 border rounded-lg bg-background ${snapshot.isDragging ? "shadow-md" : ""}`}
                        >
                          {isAdmin && (
                            <span {...dragProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground/50">
                              <GripVertical className="h-4 w-4" />
                            </span>
                          )}
                          <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate flex items-center gap-1.5">
                              {c.name}
                              {c.is_partner_channel && (
                                <span title="Indica um parceiro"><Handshake className="h-3 w-3 text-muted-foreground" /></span>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{CHANNEL_CATEGORY_LABELS[c.category]}</p>
                          </div>
                          {isAdmin && (
                            <>
                              <Button size="sm" variant="ghost" onClick={() => startEdit(c)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-orange-700"
                                title="Arquivar canal"
                                onClick={() => toggleActive.mutate({ id: c.id, is_active: false })}
                              >
                                <Archive className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                  {active.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">Nenhum canal ativo.</p>
                  )}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}

        {archived.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between py-2">
              <Label className="text-sm text-muted-foreground">Arquivados ({archived.length})</Label>
              <div className="flex items-center gap-2">
                <Switch checked={showArchived} onCheckedChange={setShowArchived} />
                <span className="text-xs text-muted-foreground">Mostrar</span>
              </div>
            </div>
            {showArchived && (
              <div className="space-y-1.5">
                {archived.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-2.5 border rounded-lg opacity-60">
                    <span className="w-3.5 h-3.5 rounded-full flex-shrink-0" style={{ background: c.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{CHANNEL_CATEGORY_LABELS[c.category]}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">Arquivado</Badge>
                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Reativar canal"
                        onClick={() => toggleActive.mutate({ id: c.id, is_active: true })}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
