import { useState } from "react";
import { Sparkles, Loader2, FileDown, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MemorialData {
  objeto: string;
  localizacao?: string;
  descricao_geral: string;
  ambientes: Array<{ nome: string; area_m2?: number; descricao: string }>;
  materiais_acabamentos?: string;
  instalacoes?: string;
  observacoes?: string;
}

interface DocItem {
  id: string;
  name: string;
  file_url: string | null;
  category: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  documents: DocItem[];
}

export function MemorialDescritivoDialog({ open, onOpenChange, projectId, documents }: Props) {
  const [memorial, setMemorial] = useState<MemorialData | null>(null);
  const [generating, setGenerating] = useState(false);

  const { data: project } = useQuery({
    queryKey: ["project_for_memorial", projectId],
    queryFn: async () => {
      const { data } = await supabase
        .from("projects")
        .select("name, address, area_sqm, clients(name)")
        .eq("id", projectId)
        .maybeSingle();
      return data as any;
    },
    enabled: !!projectId && open,
  });

  const clientName = (project?.clients as any)?.name ?? "";
  const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-memorial`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          project_data: {
            name: project?.name,
            client_name: clientName,
            address: project?.address,
            area_sqm: project?.area_sqm,
            description: project?.description,
          },
          documents: documents
            .filter((d) => d.file_url)
            .map((d) => ({ name: d.name, file_url: d.file_url, category: d.category })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || "Erro ao gerar memorial");
      }
      const data: MemorialData = await resp.json();
      setMemorial(data);
    } catch (e: any) {
      toast({ title: "Erro ao gerar memorial", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    if (!memorial) return;
    const html = buildPrintHTML(memorial, {
      projectName: project?.name ?? "",
      clientName,
      address: project?.address ?? "",
      area: project?.area_sqm ? `${project.area_sqm} m²` : "",
      date: today,
    });
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) setMemorial(null); onOpenChange(v); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-display">Memorial Descritivo</DialogTitle>
          <DialogDescription>
            A IA analisa os documentos anexados e gera um memorial técnico para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {!memorial ? (
            <div className="py-20 flex flex-col items-center gap-5">
              <div className="text-center space-y-1 max-w-sm">
                <p className="text-sm font-medium">
                  {documents.filter((d) => d.file_url).length > 0
                    ? `${documents.filter((d) => d.file_url).length} documento(s) serão analisados`
                    : "Nenhum arquivo anexado — o memorial será gerado com os dados do projeto"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Plantas, laudos e outros arquivos são lidos pela IA para compor o documento.
                </p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} size="lg">
                {generating ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando memorial...</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" /> Gerar Memorial Descritivo</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              <MemorialPreview
                memorial={memorial}
                projectName={project?.name ?? ""}
                clientName={clientName}
                address={project?.address ?? ""}
                area={project?.area_sqm ? `${project.area_sqm} m²` : ""}
                date={today}
              />
              <div className="flex justify-between border-t pt-4 shrink-0">
                <Button variant="outline" size="sm" onClick={() => { setMemorial(null); }} disabled={generating}>
                  <RotateCcw className="h-4 w-4 mr-1" /> Regerar
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  <FileDown className="h-4 w-4 mr-1" /> Baixar PDF
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Preview inside the dialog ─────────────────────────────────────────────

function MemorialPreview({ memorial, projectName, clientName, address, area, date }: {
  memorial: MemorialData;
  projectName: string;
  clientName: string;
  address: string;
  area: string;
  date: string;
}) {
  return (
    <div className="border rounded-lg overflow-hidden text-sm" style={{ fontFamily: "'Jost', sans-serif" }}>
      {/* Header */}
      <div className="px-10 py-8" style={{ background: "#1B2A4A", color: "white" }}>
        <p className="text-[10px] tracking-[0.3em] uppercase mb-1" style={{ color: "rgba(250,247,242,0.55)" }}>
          Quadra
        </p>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 300, letterSpacing: "0.02em", marginBottom: 16 }}>
          Memorial Descritivo
        </h1>
        <p style={{ fontSize: 13, color: "rgba(250,247,242,0.85)" }}>{projectName}</p>
        {clientName && <p style={{ fontSize: 12, color: "rgba(250,247,242,0.6)", marginTop: 2 }}>Cliente: {clientName}</p>}
      </div>

      {/* Meta bar */}
      <div className="flex gap-10 px-10 py-4 border-b" style={{ background: "#FAF7F2", borderColor: "#E5DDD6" }}>
        {address && (
          <div>
            <span className="block text-[10px] tracking-wider uppercase text-muted-foreground mb-0.5">Endereço</span>
            <span className="text-xs">{address}</span>
          </div>
        )}
        {area && (
          <div>
            <span className="block text-[10px] tracking-wider uppercase text-muted-foreground mb-0.5">Área</span>
            <span className="text-xs">{area}</span>
          </div>
        )}
        <div>
          <span className="block text-[10px] tracking-wider uppercase text-muted-foreground mb-0.5">Data</span>
          <span className="text-xs">{date}</span>
        </div>
      </div>

      {/* Body */}
      <div className="px-10 py-8 bg-white space-y-6">
        <PreviewSection num="1" title="Objeto">
          <p className="text-sm leading-relaxed">{memorial.objeto}</p>
        </PreviewSection>

        {memorial.localizacao && (
          <PreviewSection num="2" title="Localização">
            <p className="text-sm leading-relaxed">{memorial.localizacao}</p>
          </PreviewSection>
        )}

        <PreviewSection num={memorial.localizacao ? "3" : "2"} title="Descrição Geral do Projeto">
          <p className="text-sm leading-relaxed whitespace-pre-line">{memorial.descricao_geral}</p>
        </PreviewSection>

        {memorial.ambientes.length > 0 && (
          <PreviewSection num={memorial.localizacao ? "4" : "3"} title="Ambientes">
            <div className="space-y-4">
              {memorial.ambientes.map((amb, i) => (
                <div key={i} className="pl-4" style={{ borderLeft: "2px solid #C4756E" }}>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-semibold text-sm">{amb.nome}</span>
                    {amb.area_m2 != null && (
                      <span className="text-xs text-muted-foreground">{amb.area_m2} m²</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{amb.descricao}</p>
                </div>
              ))}
            </div>
          </PreviewSection>
        )}

        {memorial.materiais_acabamentos && (
          <PreviewSection num="—" title="Materiais e Acabamentos">
            <p className="text-sm leading-relaxed whitespace-pre-line">{memorial.materiais_acabamentos}</p>
          </PreviewSection>
        )}

        {memorial.instalacoes && (
          <PreviewSection num="—" title="Instalações">
            <p className="text-sm leading-relaxed whitespace-pre-line">{memorial.instalacoes}</p>
          </PreviewSection>
        )}

        {memorial.observacoes && (
          <PreviewSection num="—" title="Observações Técnicas">
            <p className="text-sm leading-relaxed whitespace-pre-line">{memorial.observacoes}</p>
          </PreviewSection>
        )}
      </div>

      {/* Footer */}
      <div className="px-10 py-4 flex justify-between text-[11px] text-muted-foreground border-t" style={{ background: "#FAF7F2" }}>
        <span>Quadra · {new Date().getFullYear()}</span>
        <span>Documento gerado em {date}</span>
      </div>
    </div>
  );
}

function PreviewSection({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 pb-1.5 border-b" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 16, fontWeight: 600, color: "#1B2A4A", borderColor: "#E5DDD6" }}>
        {num !== "—" ? `${num}. ` : ""}{title}
      </h3>
      {children}
    </div>
  );
}

// ─── Print HTML ─────────────────────────────────────────────────────────────

function buildPrintHTML(
  memorial: MemorialData,
  meta: { projectName: string; clientName: string; address: string; area: string; date: string },
): string {
  const ambientesHTML = memorial.ambientes
    .map(
      (amb) => `
    <div style="border-left:3px solid #C4756E;padding-left:14px;margin-bottom:18px;">
      <p style="font-weight:600;font-size:13px;margin:0 0 4px;">
        ${esc(amb.nome)}${amb.area_m2 != null ? ` <span style="font-weight:400;color:#999;font-size:11px;">${amb.area_m2} m²</span>` : ""}
      </p>
      <p style="font-size:12px;color:#555;line-height:1.65;margin:0;">${esc(amb.descricao)}</p>
    </div>`,
    )
    .join("");

  const section = (title: string, body: string) =>
    body
      ? `<div style="margin-bottom:26px;">
          <h3 style="font-family:'Cormorant Garamond',serif;font-size:16px;font-weight:600;color:#1B2A4A;border-bottom:1px solid #E5DDD6;padding-bottom:6px;margin:0 0 12px;">${esc(title)}</h3>
          ${body}
        </div>`
      : "";

  const p = (text: string) =>
    `<p style="font-size:12px;line-height:1.7;color:#333;white-space:pre-line;margin:0;">${esc(text)}</p>`;

  // Number sections dynamically
  let sectionNum = 1;
  const ns = (title: string) => `${sectionNum++}. ${title}`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Memorial Descritivo — ${esc(meta.projectName)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{font-family:'Jost',sans-serif;background:#fff;color:#1B2A4A;}
    .page{max-width:210mm;margin:0 auto;}
    .header{background:#1B2A4A;color:#fff;padding:40px 48px;}
    .studio{font-size:10px;letter-spacing:.3em;color:rgba(250,247,242,.5);text-transform:uppercase;margin-bottom:6px;}
    .doctitle{font-family:'Cormorant Garamond',serif;font-size:30px;font-weight:300;letter-spacing:.02em;margin-bottom:14px;}
    .meta-bar{background:#FAF7F2;padding:14px 48px;display:flex;gap:40px;border-bottom:1px solid #E5DDD6;}
    .meta-label{font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#aaa;display:block;margin-bottom:2px;}
    .meta-val{font-size:12px;}
    .body{padding:40px 48px;}
    .footer{border-top:1px solid #E5DDD6;background:#FAF7F2;padding:14px 48px;display:flex;justify-content:space-between;font-size:11px;color:#aaa;}
    @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <p class="studio">Quadra</p>
    <h1 class="doctitle">Memorial Descritivo</h1>
    <p style="font-size:13px;color:rgba(250,247,242,.85);">${esc(meta.projectName)}</p>
    ${meta.clientName ? `<p style="font-size:12px;color:rgba(250,247,242,.6);margin-top:3px;">Cliente: ${esc(meta.clientName)}</p>` : ""}
  </div>

  <div class="meta-bar">
    ${meta.address ? `<div><span class="meta-label">Endereço</span><span class="meta-val">${esc(meta.address)}</span></div>` : ""}
    ${meta.area ? `<div><span class="meta-label">Área</span><span class="meta-val">${esc(meta.area)}</span></div>` : ""}
    <div><span class="meta-label">Data</span><span class="meta-val">${esc(meta.date)}</span></div>
  </div>

  <div class="body">
    ${section(ns("Objeto"), p(memorial.objeto))}
    ${memorial.localizacao ? section(ns("Localização"), p(memorial.localizacao)) : ""}
    ${section(ns("Descrição Geral do Projeto"), p(memorial.descricao_geral))}
    ${memorial.ambientes.length > 0 ? section(ns("Ambientes"), ambientesHTML) : ""}
    ${memorial.materiais_acabamentos ? section(ns("Materiais e Acabamentos"), p(memorial.materiais_acabamentos)) : ""}
    ${memorial.instalacoes ? section(ns("Instalações"), p(memorial.instalacoes)) : ""}
    ${memorial.observacoes ? section(ns("Observações Técnicas"), p(memorial.observacoes)) : ""}
  </div>

  <div class="footer">
    <span>Quadra · ${new Date().getFullYear()}</span>
    <span>Documento gerado em ${esc(meta.date)}</span>
  </div>
</div>
</body>
</html>`;
}

function esc(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
