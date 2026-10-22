import { useEffect } from "react";

const TITULO_PADRAO = "Quadra Arquitetura";

/** Título e descrição da aba. Volta ao que estava quando a página sai. */
export function useDocumentMeta(title: string, description?: string, noindex = false) {
  useEffect(() => {
    const tituloAnterior = document.title;
    document.title = title ? `${title} | ${TITULO_PADRAO}` : TITULO_PADRAO;

    const criados: HTMLMetaElement[] = [];
    const definir = (name: string, content: string) => {
      const meta = document.createElement("meta");
      meta.name = name;
      meta.content = content;
      document.head.appendChild(meta);
      criados.push(meta);
    };
    if (description) definir("description", description.slice(0, 160));
    if (noindex) definir("robots", "noindex");

    return () => {
      document.title = tituloAnterior;
      criados.forEach((m) => m.remove());
    };
  }, [title, description, noindex]);
}
