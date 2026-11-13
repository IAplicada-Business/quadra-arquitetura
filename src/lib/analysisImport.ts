// Importação de análise orçamentária em HTML (gerado fora do sistema).
// O HTML é guardado como está e exibido num iframe isolado (sem scripts).
// Não lê nem altera cotações: o orçamento fica intocado.

export const MAX_ANALYSIS_HTML_BYTES = 2_000_000;

export interface AnalysisImportFile {
  title: string;
  fileName: string;
  html: string;
}

/** Título do HTML (<title>, senão <h1>, senão o nome do arquivo sem extensão). */
export function analysisTitle(html: string, fileName: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const fromTag = doc.querySelector("title")?.textContent?.trim() || doc.querySelector("h1")?.textContent?.trim();
  const fromFile = fileName.replace(/\.[^.]+$/, "").trim();
  return (fromTag || fromFile || "Análise orçamentária").slice(0, 120);
}

/** Valida e lê o arquivo escolhido. Lança Error com mensagem em português. */
export async function readAnalysisFile(file: File): Promise<AnalysisImportFile> {
  if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
    throw new Error("Escolha um arquivo .html.");
  }
  if (file.size > MAX_ANALYSIS_HTML_BYTES) {
    throw new Error("O arquivo passa de 2 MB. Exporte o HTML sem imagens embutidas.");
  }
  const html = await file.text();
  if (!/<\s*(html|body|table|div|section|p|h1)\b/i.test(html)) {
    throw new Error("O arquivo não parece um HTML válido.");
  }
  return { title: analysisTitle(html, file.name), fileName: file.name, html };
}
