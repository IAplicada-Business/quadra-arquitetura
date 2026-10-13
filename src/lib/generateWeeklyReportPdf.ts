import jsPDF from "jspdf";
import { reportPhotoUrls, weekRangeLabel, type WeeklyReportRecord } from "@/lib/weeklyReport";

const NAVY: [number, number, number] = [27, 42, 74];
const TERRACOTA: [number, number, number] = [196, 117, 110];
const GRAY: [number, number, number] = [90, 90, 90];

async function toDataUrl(url: string): Promise<{ data: string; w: number; h: number } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const data = await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 4, h: img.naturalHeight || 3 });
      img.onerror = () => resolve({ w: 4, h: 3 });
      img.src = data;
    });
    return { data, ...dims };
  } catch {
    return null;
  }
}

/**
 * PDF do relatório semanal (A4, texto + até 6 fotos). Fotos que não
 * carregarem (CORS, link quebrado) são puladas sem derrubar o PDF.
 */
export async function generateWeeklyReportPdf(
  report: WeeklyReportRecord,
  opts: { projectName?: string | null; clientName?: string | null } = {},
): Promise<Blob> {
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 18;
  const width = pageW - margin * 2;
  let y = margin;

  const ensure = (h: number) => {
    if (y + h > pageH - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const heading = (text: string) => {
    ensure(12);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(...TERRACOTA);
    pdf.text(text.toUpperCase(), margin, y);
    y += 6;
  };

  const paragraph = (text: string) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.setTextColor(...NAVY);
    const lines = pdf.splitTextToSize(text || "—", width) as string[];
    for (const line of lines) {
      ensure(6);
      pdf.text(line, margin, y);
      y += 5.5;
    }
    y += 4;
  };

  // Cabeçalho
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, pageW, 34, "F");
  pdf.setTextColor(240, 220, 200);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.text("QUADRA ARQUITETURA · RELATÓRIO SEMANAL", margin, 13);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(opts.projectName || "Obra", margin, 23);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(weekRangeLabel(report.week_start), margin, 29);
  y = 46;

  if (opts.clientName) {
    pdf.setTextColor(...GRAY);
    pdf.setFontSize(10);
    pdf.text(`Cliente: ${opts.clientName}`, margin, y);
    y += 8;
  }

  // Barra de progresso
  heading("Conclusão geral");
  const pct = Math.max(0, Math.min(100, report.completion_percent || 0));
  pdf.setFillColor(230, 221, 208);
  pdf.roundedRect(margin, y, width, 4, 2, 2, "F");
  if (pct > 0) {
    pdf.setFillColor(...TERRACOTA);
    pdf.roundedRect(margin, y, (width * pct) / 100, 4, 2, 2, "F");
  }
  pdf.setTextColor(...NAVY);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11);
  pdf.text(`${pct}%`, margin + width, y - 1.5, { align: "right" });
  y += 12;

  heading("O que andou na semana");
  paragraph(report.summary);
  heading("Próximas etapas");
  paragraph(report.next_steps);
  if (report.client_pending?.trim()) {
    heading("Precisamos de você");
    paragraph(report.client_pending);
  }

  // Fotos
  const photos = reportPhotoUrls(report).slice(0, 6);
  if (photos.length > 0) {
    const loaded = (await Promise.all(photos.map(toDataUrl))).filter((p): p is NonNullable<typeof p> => !!p);
    if (loaded.length > 0) {
      heading("Fotos da semana");
      const gap = 4;
      const cellW = (width - gap) / 2;
      const cellH = cellW * 0.68;
      loaded.forEach((p, i) => {
        const col = i % 2;
        if (col === 0) ensure(cellH + gap);
        const x = margin + col * (cellW + gap);
        // Encaixa mantendo a proporção dentro da célula.
        const ratio = Math.min(cellW / p.w, cellH / p.h);
        const w = p.w * ratio;
        const h = p.h * ratio;
        const fmt = p.data.startsWith("data:image/png") ? "PNG" : "JPEG";
        try {
          pdf.addImage(p.data, fmt, x + (cellW - w) / 2, y + (cellH - h) / 2, w, h);
        } catch {
          /* formato não suportado: pula a foto */
        }
        if (col === 1 || i === loaded.length - 1) y += cellH + gap;
      });
    }
  }

  // Rodapé
  const pages = pdf.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...GRAY);
    pdf.text(`Quadra Arquitetura · página ${i} de ${pages}`, pageW / 2, pageH - 8, { align: "center" });
  }

  return pdf.output("blob");
}
