import ReactMarkdown, { type Components } from "react-markdown";

/**
 * Corpo do artigo em Markdown, com a tipografia da marca.
 *
 * react-markdown não renderiza HTML bruto, então o texto do time não injeta
 * markup, e links com protocolo perigoso (javascript:) são descartados pelo
 * próprio transformador de URL. Só os elementos abaixo existem.
 *
 * Títulos começam em h2: o h1 da página é o título do artigo.
 */
const SERIF = { fontFamily: "'Cormorant Garamond', serif" } as const;

const components: Components = {
  h2: ({ children }) => (
    <h2 className="text-brand-navy mt-12 mb-4 title-balance" style={{ ...SERIF, fontSize: "1.875rem", lineHeight: 1.2, fontWeight: 500 }}>
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-brand-navy mt-8 mb-3 title-balance" style={{ ...SERIF, fontSize: "1.4rem", lineHeight: 1.25, fontWeight: 600 }}>
      {children}
    </h3>
  ),
  p: ({ children }) => <p className="mb-5">{children}</p>,
  a: ({ href, children }) => {
    const externo = /^https?:\/\//i.test(href ?? "");
    return (
      <a
        href={href}
        {...(externo ? { target: "_blank", rel: "noreferrer noopener" } : {})}
        className="text-brand-vinho underline underline-offset-4 decoration-brand-terracota/50 transition-colors hover:text-brand-terracota"
      >
        {children}
      </a>
    );
  },
  strong: ({ children }) => <strong className="font-medium text-brand-navy">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="mb-5 space-y-2 list-disc pl-5 marker:text-brand-terracota">{children}</ul>,
  ol: ({ children }) => <ol className="mb-5 space-y-2 list-decimal pl-5 marker:text-brand-terracota">{children}</ol>,
  li: ({ children }) => <li className="pl-1">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote
      className="my-8 border-l-2 border-brand-terracota pl-6 text-brand-navy [&>p]:mb-0"
      style={{ ...SERIF, fontSize: "1.5rem", lineHeight: 1.4, fontStyle: "italic" }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-brand-navy/15" />,
  img: ({ src, alt }) => (
    <img src={src} alt={alt ?? ""} loading="lazy" className="my-8 w-full h-auto" />
  ),
  code: ({ children }) => (
    <code className="rounded bg-brand-pedra px-1.5 py-0.5 text-[0.9em]">{children}</code>
  ),
};

export function BlogArticleBody({ content }: { content: string }) {
  return (
    <div
      className="text-brand-navy/85 min-w-0 break-words"
      style={{ fontFamily: "'Jost', sans-serif", fontSize: "1.0625rem", lineHeight: 1.8, fontWeight: 300 }}
    >
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
}
