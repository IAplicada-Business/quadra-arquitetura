import { useState } from "react";
import { Instagram, Phone, Mail, MapPin, Loader2, Link2, type LucideIcon } from "lucide-react";
import { useSiteLead, type SiteLeadPayload } from "@/hooks/useSiteLead";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, contactIconKind, splitParagraphs, type ContactContent, type ContactIconKind } from "@/lib/siteContent";
import { ItemLista, Revelar, Rotulo, SequenciaUl } from "@/components/landing/Motion";

const CONTACT_ICONS: Record<ContactIconKind, LucideIcon> = {
  instagram: Instagram,
  phone: Phone,
  mail: Mail,
  map: MapPin,
  link: Link2,
};

interface ContactSectionProps {
  content?: ContactContent;
  /** No preview do admin o formulário não envia lead. */
  preview?: boolean;
}

/** Opções de select vêm do admin, uma por linha. */
const linhas = (texto: string) => texto.split("\n").map((t) => t.trim()).filter(Boolean);

/**
 * O formulário da referência: nome, WhatsApp, quem é, onde é a obra e em
 * que momento está.
 *
 * As três últimas respostas não têm coluna em `leads`, então vão
 * compostas no campo de mensagem, rotuladas. Nenhuma migration para uma
 * mudança de aparência, e nada se perde — quem abrir o lead no CRM lê as
 * respostas inteiras. Se um dia valer filtrar por elas, aí sim compensa
 * coluna de verdade.
 *
 * project_type vai como "outro" porque esta versão do formulário não
 * pergunta o segmento. Deixar o "residencial" de antes rotularia errado
 * todo lead vindo do site, inclusive os corporativos e de saúde.
 *
 * O e-mail saiu: a referência pede WhatsApp, que é por onde a Quadra
 * responde. A coluna aceita nulo, então o lead entra igual.
 */
export function ContactSection({ content = SITE_DEFAULTS.contact, preview = false }: ContactSectionProps) {
  const { mutate: createLead, isPending } = useSiteLead();
  const opcoesQuem = linhas(content.optionsWho);
  const opcoesMomento = linhas(content.optionsStage);

  const [form, setForm] = useState({ nome: "", whatsapp: "", quem: "", onde: "", momento: "" });
  const [enviado, setEnviado] = useState(false);

  const valido = form.nome.trim().length > 1 && form.whatsapp.trim().length > 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valido || preview || isPending) return;

    const extras = [
      form.quem && `Você é: ${form.quem}`,
      form.onde && `Onde é a obra: ${form.onde}`,
      form.momento && `Em que momento está: ${form.momento}`,
    ].filter(Boolean);

    const payload: SiteLeadPayload = {
      name: form.nome.trim(),
      email: "",
      phone: form.whatsapp.trim(),
      projectType: "outro",
      message: extras.join("\n"),
    };

    createLead(payload, {
      onSuccess: () => {
        setForm({ nome: "", whatsapp: "", quem: "", onde: "", momento: "" });
        setEnviado(true);
      },
    });
  };

  const rotulo = { fontFamily: "'Jost', sans-serif", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase" as const };
  const campo =
    "w-full bg-transparent border-b border-brand-areia/25 py-2.5 text-brand-areia placeholder:text-brand-areia/35 outline-none transition-colors focus:border-brand-terracota min-w-0";

  return (
    <section id="contato" className="bg-brand-navy py-20 md:py-28">
      <div className="max-w-6xl mx-auto px-6 md:px-10 min-w-0">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
          {/* ── Texto e canais ─────────────────────────────────── */}
          <Revelar className="min-w-0">
            <Rotulo className="mb-5">{content.eyebrow}</Rotulo>
            <h2
              className="title-balance text-brand-areia mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontWeight: 400,
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.2,
                letterSpacing: "-0.02em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))", fontStyle: "italic" } }} />
            </h2>
            <div
              className="text-brand-areia/70 space-y-4 max-w-lg mb-9"
              style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", lineHeight: 1.75, fontWeight: 300 }}
            >
              {splitParagraphs(content.text).map((p, i) => (
                <p key={i}>
                  <RichText text={p} />
                </p>
              ))}
            </div>

            <SequenciaUl className="space-y-3.5">
              {content.contacts.map((c, i) => {
                const Icon = CONTACT_ICONS[contactIconKind(c.desc)];
                return (
                  <ItemLista key={i} className="min-w-0">
                    <a
                      href={c.desc || undefined}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-start gap-3 text-brand-areia/70 transition-colors hover:text-brand-areia min-w-0"
                      style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", fontWeight: 300 }}
                    >
                      <Icon aria-hidden className="h-4 w-4 mt-0.5 shrink-0 text-brand-terracota" />
                      <span className="min-w-0 break-words [overflow-wrap:anywhere]">{c.title}</span>
                    </a>
                  </ItemLista>
                );
              })}
            </SequenciaUl>
          </Revelar>

          {/* ── Formulário ─────────────────────────────────────── */}
          <Revelar className="border border-brand-areia/20 p-7 md:p-9 min-w-0">
            <h3 className="sr-only">{content.formTitle}</h3>

            {enviado ? (
              <div className="py-10 text-center" role="status">
                <p
                  className="text-brand-areia mb-3"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.5rem", lineHeight: 1.3 }}
                >
                  Mensagem enviada.
                </p>
                <p
                  className="text-brand-areia/60"
                  style={{ fontFamily: "'Jost', sans-serif", fontSize: "0.9375rem", fontWeight: 300 }}
                >
                  A gente responde no WhatsApp que você deixou.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
                <div className="min-w-0">
                  <label htmlFor="contato-nome" className="block text-brand-terracota mb-1.5" style={rotulo}>
                    Seu nome
                  </label>
                  <input
                    id="contato-nome"
                    value={form.nome}
                    onChange={(e) => setForm({ ...form, nome: e.target.value })}
                    placeholder="Como podemos te chamar"
                    className={campo}
                    required
                  />
                </div>

                <div className="min-w-0">
                  <label htmlFor="contato-whatsapp" className="block text-brand-terracota mb-1.5" style={rotulo}>
                    WhatsApp
                  </label>
                  <input
                    id="contato-whatsapp"
                    type="tel"
                    value={form.whatsapp}
                    onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                    placeholder="(31) 9 0000-0000"
                    className={campo}
                    required
                  />
                </div>

                {opcoesQuem.length > 0 && (
                  <div className="min-w-0">
                    <label htmlFor="contato-quem" className="block text-brand-terracota mb-1.5" style={rotulo}>
                      Você é
                    </label>
                    <select
                      id="contato-quem"
                      value={form.quem}
                      onChange={(e) => setForm({ ...form, quem: e.target.value })}
                      className={`${campo} [&>option]:text-brand-navy`}
                    >
                      <option value="">Cliente final ou arquiteto(a)</option>
                      {opcoesQuem.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="min-w-0">
                  <label htmlFor="contato-onde" className="block text-brand-terracota mb-1.5" style={rotulo}>
                    Onde é a obra
                  </label>
                  <input
                    id="contato-onde"
                    value={form.onde}
                    onChange={(e) => setForm({ ...form, onde: e.target.value })}
                    placeholder="Bairro ou cidade"
                    className={campo}
                  />
                </div>

                {opcoesMomento.length > 0 && (
                  <div className="min-w-0">
                    <label htmlFor="contato-momento" className="block text-brand-terracota mb-1.5" style={rotulo}>
                      Em que momento está
                    </label>
                    <select
                      id="contato-momento"
                      value={form.momento}
                      onChange={(e) => setForm({ ...form, momento: e.target.value })}
                      className={`${campo} [&>option]:text-brand-navy`}
                    >
                      <option value="">Pensando, com projeto pronto, obra em andamento…</option>
                      {opcoesMomento.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!valido || isPending}
                  className="w-full bg-brand-terracota text-brand-navy py-4 text-sm transition-colors hover:bg-brand-rosa disabled:opacity-45 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                  style={{ fontFamily: "'Jost', sans-serif", fontWeight: 500 }}
                >
                  {isPending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  {content.submitLabel}
                </button>
              </form>
            )}
          </Revelar>
        </div>
      </div>
    </section>
  );
}
