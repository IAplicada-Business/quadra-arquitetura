import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useProposalAssets, ProposalAsset } from "@/hooks/useProposalAssets";
import { Upload, Trash2, Plus, Image, FileText, Phone, Save, LayoutList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import ProposalBlocksEditor from "@/components/settings/proposal-blocks/ProposalBlocksEditor";
import { InfoHint } from "@/components/visual/InfoHint";

const CATEGORIES = [
  { value: "blocks", label: "Blocos do PDF", icon: LayoutList },
  { value: "logo", label: "Logo", icon: Image },
  { value: "founder_photo", label: "Fotos das Sócias", icon: Image },
  { value: "portfolio", label: "Portfólio", icon: Image },
  { value: "feedback", label: "Feedbacks", icon: Image },
  { value: "text", label: "Textos Fixos", icon: FileText },
  { value: "contact", label: "Contato", icon: Phone },
];

const DEFAULT_TEXTS: Record<string, { name: string; description: string }> = {
  quem_somos: {
    name: "Quem Somos",
    description: "A Quadra é uma empresa que nasceu em 2022 pela inquietação da seguinte pergunta: como fazer com que nossos clientes tenham no final da sua obra seu projeto exatamente igual ao do 3D? Assim, desenvolvemos também o serviço de gerenciamento de obra no qual oferecemos aos nossos clientes assessoria completa pra ter seu espaço do jeitinho que ele sempre sonhou.",
  },
  pilar_planejamento: {
    name: "Pilar: Planejamento",
    description: "• Estudamos todo o projeto feito (tanto 3D quanto executivo)\n• Reunimos com projetista responsável\n• Realizamos formulário inicial de alinhamento de obra com o cliente\n• Definimos o escopo da obra\n• Definimos as sequências de execução\n• Emitimos documento de responsabilidade\n• Entramos em contato com o síndico, condomínio\n• Estudamos as regras do condomínio para execução de obras",
  },
  pilar_orcamento: {
    name: "Pilar: Orçamento",
    description: "• Alinhamos os fornecedores compatíveis com preço/qualidade esperada\n• Orçamos absolutamente todos os itens necessários para execução do projeto\n• Provisionamos valores de imprevistos e estimativas de materiais internos (ex: tubulação, fiação)\n• Cobramos retorno de orçamentos\n• Comparamos e corrigimos o orçamento\n• Montamos uma tabela de acompanhamento de obra pro cliente\n• Realizamos uma reunião de prioridades para mostrar os cenários e definirmos as previsões financeiras",
  },
  pilar_aquisicao: {
    name: "Pilar: Aquisição de Material",
    description: "• Disponibilizamos a lista de compras online\n• Ajustamos as datas de compra para chegada combinar com logística da obra\n• Conferimos todos os orçamentos, links e itens a serem comprados\n• Nos disponibilizamos para recebimento de materiais comprados online\n• Ajudamos na gestão de pagamentos (enviamos lembretes com antecedência)\n• Disponibilizamos uma conta numerário da Quadra para simplificar pagamentos de pequenos materiais",
  },
  pilar_qualidade: {
    name: "Pilar: Verificação de Qualidade",
    description: "• Acompanhamento constante em obra\n• Visitas guiadas com o cliente para alinhamentos rápidos\n• Presença constante em todas as medições para evitar retrabalho\n• Medições constantes para evitar quebradeiras\n• Revisões de projetos necessárias (com o aval da projetista)",
  },
  pilar_execucao: {
    name: "Pilar: Acompanhamento da Execução",
    description: "• Execução e revisão de cronograma durante a obra\n• Inclusão de ordem de atividades\n• Medições e liberações para pagamento\n• Conferência das NBR's\n• Conferência das normas de segurança de trabalho\n• Conferência constante de projeto\n• Contato constante com projetista",
  },
  pilar_pessoas: {
    name: "Pilar: Gestão de Pessoas",
    description: "• Orientação de mão de obra\n• Comunicação clara, simples e concisa para facilitar a execução\n• Feedbacks e sugestões para melhor execução\n• Gestão de retirada de lixo\n• Gestão de isolamento de piso\n• Gestão de limpeza durante a obra",
  },
  diferenciais: {
    name: "Por que contratar",
    description: "ALINHAMENTO DA TÉCNICA COM A ESTÉTICA|FIDELIDADE TOTAL AO PROJETO|TRANSFORMAMOS O CONCEITO EM SOLUÇÃO|PRESENÇA CONSTANTE NA OBRA DA FASE INICIAL ATÉ A INSTALAÇÃO DE ELETROS, METAIS E PEQUENOS DETALHES",
  },
};

export default function ProposalBrandingTab() {
  const { assets, isLoading, logos, founderPhotos, portfolio, feedbacks, texts, contacts, create, update, remove, uploadFile, byCategory } = useProposalAssets();
  const [activeCategory, setActiveCategory] = useState("blocks");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string, name?: string) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFile(file, category);
      create.mutate({ category, name: name || file.name, file_url: url });
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>, projectName: string, projectCategory: string) => {
    const files = e.target.files;
    if (!files) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadFile(file, "portfolio");
        create.mutate({ category: "portfolio", name: file.name, file_url: url, project_name: projectName, project_category: projectCategory });
      }
    } catch (err: any) {
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const initializeTexts = () => {
    Object.entries(DEFAULT_TEXTS).forEach(([key, val]) => {
      const exists = texts.find(t => (t.metadata as any)?.key === key);
      if (!exists) {
        create.mutate({ category: "text", name: val.name, description: val.description, metadata: { key } as any });
      }
    });
    toast({ title: "Textos padrão inicializados" });
  };

  const initializeContacts = () => {
    const defaults = [
      { name: "Instagram", description: "@quadraarq" },
      { name: "Telefone 1", description: "(31) 97264-1970 (Camilla)" },
      { name: "Telefone 2", description: "(31) 9124-4672 (Mariana)" },
    ];
    defaults.forEach(d => {
      const exists = contacts.find(c => c.name === d.name);
      if (!exists) create.mutate({ category: "contact", ...d });
    });
    toast({ title: "Contatos inicializados" });
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  const currentItems = byCategory(activeCategory);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map(cat => (
          <Button key={cat.value} variant={activeCategory === cat.value ? "default" : "outline"} size="sm" onClick={() => setActiveCategory(cat.value)}>
            <cat.icon className="h-4 w-4 mr-1" /> {cat.label}
          </Button>
        ))}
      </div>

      {/* Blocos configuráveis do PDF */}
      {activeCategory === "blocks" && <ProposalBlocksEditor />}

      {/* Logo */}
      {activeCategory === "logo" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-1.5">
              Logo da Quadra
              <InfoHint>
                O PDF da proposta usa o logo claro nas páginas de fundo escuro (capa, valores) e o logo escuro nas de fundo bege. Sem logo enviado, sai o wordmark em texto.
              </InfoHint>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {logos.map(l => {
              const variant = (l.metadata as { variant?: string } | null)?.variant;
              return (
                <div key={l.id} className="flex items-center gap-4">
                  {l.file_url && (
                    <div className={`rounded p-2 ${variant === "light" ? "bg-[#1B2A4A]" : "bg-[#F5E0D0]"}`}>
                      <img src={l.file_url} alt="Logo" className="h-12 object-contain" />
                    </div>
                  )}
                  <div className="flex-1 text-sm">
                    <p className="font-medium">{l.name}</p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {variant === "light" ? "Para fundo escuro" : variant === "dark" ? "Para fundo claro" : "Sem variante (usado nos dois)"}
                    </Badge>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(l.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              );
            })}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Logo claro (fundo escuro)</Label>
                <Input type="file" accept="image/*" aria-label="Logo claro" disabled={uploading} onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setUploading(true);
                  try { const url = await uploadFile(file, "logo"); create.mutate({ category: "logo", name: "Logo claro", file_url: url, metadata: { variant: "light" } as never }); }
                  catch (err) { toast({ title: "Erro no upload", description: (err as Error).message, variant: "destructive" }); }
                  finally { setUploading(false); }
                }} />
              </div>
              <div>
                <Label>Logo escuro (fundo claro)</Label>
                <Input type="file" accept="image/*" aria-label="Logo escuro" disabled={uploading} onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  setUploading(true);
                  try { const url = await uploadFile(file, "logo"); create.mutate({ category: "logo", name: "Logo escuro", file_url: url, metadata: { variant: "dark" } as never }); }
                  catch (err) { toast({ title: "Erro no upload", description: (err as Error).message, variant: "destructive" }); }
                  finally { setUploading(false); }
                }} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Founder Photos */}
      {activeCategory === "founder_photo" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-1.5">
              Fotos das Sócias
              <InfoHint>
                As fotos enviadas aqui ficam disponíveis para escolher na capa e na página Quem Somos, em Blocos do PDF. Trocar a foto do PDF é lá.
              </InfoHint>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {founderPhotos.map(p => (
              <div key={p.id} className="flex items-center gap-4 p-3 border rounded-lg">
                {p.file_url && <img src={p.file_url} alt={p.name} className="h-20 w-20 rounded-full object-cover" />}
                <div className="flex-1 space-y-2">
                  <Input defaultValue={p.name} onBlur={(e) => update.mutate({ id: p.id, name: e.target.value })} placeholder="Nome" />
                  <Input defaultValue={p.description || ""} onBlur={(e) => update.mutate({ id: p.id, description: e.target.value })} placeholder="Formação" />
                </div>
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <div>
              <Label>Adicionar foto</Label>
              <Input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "founder_photo", "Sócia")} disabled={uploading} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Portfolio */}
      {activeCategory === "portfolio" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Portfólio de Projetos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const groups = new Map<string, ProposalAsset[]>();
              portfolio.forEach(p => {
                const key = p.project_name || "Sem projeto";
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(p);
              });
              return Array.from(groups.entries()).map(([projName, items]) => (
                <div key={projName} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{projName}</h4>
                    <Badge variant="secondary">{items[0]?.project_category || "—"}</Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {items.map(img => (
                      <div key={img.id} className="relative group">
                        <img src={img.file_url || ""} alt={img.name} className="h-24 w-full object-cover rounded" />
                        <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(img.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ));
            })()}
            <PortfolioUploader onUpload={handlePortfolioUpload} uploading={uploading} />
          </CardContent>
        </Card>
      )}

      {/* Feedbacks */}
      {activeCategory === "feedback" && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Feedbacks de Clientes</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {feedbacks.map(f => (
                <div key={f.id} className="relative group border rounded-lg overflow-hidden">
                  {f.file_url && <img src={f.file_url} alt={f.name} className="w-full h-40 object-cover" />}
                  <p className="p-2 text-xs truncate">{f.name}</p>
                  <Button size="sm" variant="destructive" className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100" onClick={() => remove.mutate(f.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <Label>Upload feedback (print WhatsApp)</Label>
              <Input type="file" accept="image/*" multiple onChange={(e) => {
                const files = e.target.files;
                if (!files) return;
                Array.from(files).forEach(async (file) => {
                  try {
                    const url = await uploadFile(file, "feedback");
                    create.mutate({ category: "feedback", name: file.name, file_url: url });
                  } catch {}
                });
              }} disabled={uploading} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Texts */}
      {activeCategory === "text" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-1.5">
                Textos Institucionais
                <InfoHint>O texto "Quem Somos" editado em Blocos do PDF tem prioridade sobre o daqui.</InfoHint>
              </CardTitle>
            </div>
            <Button size="sm" variant="outline" onClick={initializeTexts}><Plus className="h-4 w-4 mr-1" /> Inicializar Padrão</Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {texts.map(t => (
              <div key={t.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold">{t.name}</Label>
                  <Button size="sm" variant="destructive" onClick={() => remove.mutate(t.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
                <Textarea defaultValue={t.description || ""} rows={4} onBlur={(e) => update.mutate({ id: t.id, description: e.target.value })} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Contact */}
      {activeCategory === "contact" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Dados de Contato</CardTitle>
            <Button size="sm" variant="outline" onClick={initializeContacts}><Plus className="h-4 w-4 mr-1" /> Inicializar Padrão</Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {contacts.map(c => (
              <div key={c.id} className="flex items-center gap-3">
                <Input defaultValue={c.name} className="w-32" onBlur={(e) => update.mutate({ id: c.id, name: e.target.value })} />
                <Input defaultValue={c.description || ""} className="flex-1" onBlur={(e) => update.mutate({ id: c.id, description: e.target.value })} />
                <Button size="sm" variant="destructive" onClick={() => remove.mutate(c.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PortfolioUploader({ onUpload, uploading }: { onUpload: (e: React.ChangeEvent<HTMLInputElement>, name: string, cat: string) => void; uploading: boolean }) {
  const [name, setName] = useState("");
  const [cat, setCat] = useState("residencial");
  return (
    <div className="border-2 border-dashed rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-sm">Adicionar projeto ao portfólio</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Nome do projeto</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Beauty House" />
        </div>
        <div>
          <Label>Categoria</Label>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="residencial">Residencial</SelectItem>
              <SelectItem value="comercial">Comercial/Escritório</SelectItem>
              <SelectItem value="saude">Saúde/Clínica</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Fotos (múltiplas)</Label>
        <Input type="file" accept="image/*" multiple disabled={!name || uploading} onChange={(e) => onUpload(e, name, cat)} />
      </div>
    </div>
  );
}
