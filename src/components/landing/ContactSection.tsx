import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Phone, Mail, MapPin, Loader2, Send, Link2, type LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSiteLead, type SiteLeadPayload } from "@/hooks/useSiteLead";
import { RichText } from "@/components/leads/proposal-pages/RichText";
import { SITE_DEFAULTS, contactIconKind, type ContactContent, type ContactIconKind } from "@/lib/siteContent";

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

export function ContactSection({ content = SITE_DEFAULTS.contact, preview = false }: ContactSectionProps) {
  const { mutate: createLead, isPending } = useSiteLead();
  const [form, setForm] = useState<SiteLeadPayload>({
    name: "",
    email: "",
    phone: "",
    projectType: "residencial",
    message: "",
  });

  const isValid = form.name.trim() && form.email.trim() && form.phone.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || preview) return;
    createLead(form, {
      onSuccess: () => {
        setForm({ name: "", email: "", phone: "", projectType: "residencial", message: "" });
      },
    });
  };

  return (
    <section id="contato" className="relative py-24 md:py-32 bg-brand-navy overflow-hidden">
      {/* Decorative */}
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full opacity-10 blur-3xl"
        style={{ background: "hsl(var(--brand-terracota))" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Left: text + contacts */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="lg:col-span-5"
          >
            <p
              className="text-xs mb-5"
              style={{
                color: "hsl(var(--brand-terracota))",
                letterSpacing: "6px",
                fontFamily: "'Jost', sans-serif",
                fontWeight: 500,
              }}
            >
              {content.eyebrow}
            </p>

            <h2
              className="mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
                color: "hsl(var(--brand-areia))",
                fontWeight: 300,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              <RichText text={content.title} styles={{ em: { color: "hsl(var(--brand-terracota))" } }} />
            </h2>

            <div className="w-12 h-px bg-brand-terracota mb-8" />

            <p
              className="mb-10"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "1rem",
                color: "hsl(var(--brand-areia))",
                opacity: 0.8,
                lineHeight: 1.8,
                fontWeight: 300,
              }}
            >
              <RichText text={content.text} />
            </p>

            <ul className="space-y-4">
              {content.contacts.map((c, i) => {
                const Icon = CONTACT_ICONS[contactIconKind(c.desc)];
                return (
                  <li key={i}>
                    <a
                      href={c.desc || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 text-brand-areia/80 hover:text-brand-areia transition-colors"
                    >
                      <span
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center border border-brand-terracota/40 transition-all group-hover:bg-brand-terracota group-hover:border-brand-terracota"
                      >
                        <Icon className="h-4 w-4" strokeWidth={1.5} />
                      </span>
                      <span
                        className="leading-9"
                        style={{
                          fontFamily: "'Jost', sans-serif",
                          fontSize: "0.9375rem",
                          fontWeight: 300,
                        }}
                      >
                        {c.title}
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </motion.div>

          {/* Right: form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, delay: 0.2 }}
            className="lg:col-span-7"
          >
            <form
              onSubmit={handleSubmit}
              className="bg-brand-rosa p-8 md:p-12"
              style={{ fontFamily: "'Jost', sans-serif" }}
            >
              <h3
                className="mb-8"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "1.75rem",
                  color: "hsl(var(--brand-navy))",
                  fontWeight: 400,
                }}
              >
                {content.formTitle}
              </h3>

              <div className="space-y-5">
                <div>
                  <Label htmlFor="ln-name" className="text-xs uppercase tracking-widest text-brand-navy/70">
                    Nome *
                  </Label>
                  <Input
                    id="ln-name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-2 bg-transparent border-0 border-b border-brand-navy/20 rounded-none focus-visible:ring-0 focus-visible:border-brand-vinho px-0 text-brand-navy"
                    placeholder="Seu nome completo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <Label htmlFor="ln-email" className="text-xs uppercase tracking-widest text-brand-navy/70">
                      Email *
                    </Label>
                    <Input
                      id="ln-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="mt-2 bg-transparent border-0 border-b border-brand-navy/20 rounded-none focus-visible:ring-0 focus-visible:border-brand-vinho px-0 text-brand-navy"
                      placeholder="voce@email.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ln-phone" className="text-xs uppercase tracking-widest text-brand-navy/70">
                      Telefone *
                    </Label>
                    <Input
                      id="ln-phone"
                      required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="mt-2 bg-transparent border-0 border-b border-brand-navy/20 rounded-none focus-visible:ring-0 focus-visible:border-brand-vinho px-0 text-brand-navy"
                      placeholder="(31) 90000-0000"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs uppercase tracking-widest text-brand-navy/70">
                    Tipo de projeto
                  </Label>
                  <Select
                    value={form.projectType}
                    onValueChange={(v) => setForm({ ...form, projectType: v as SiteLeadPayload["projectType"] })}
                  >
                    <SelectTrigger className="mt-2 bg-transparent border-0 border-b border-brand-navy/20 rounded-none px-0 text-brand-navy focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="residencial">Residencial</SelectItem>
                      <SelectItem value="comercial">Comercial</SelectItem>
                      <SelectItem value="saude">Saude</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="ln-message" className="text-xs uppercase tracking-widest text-brand-navy/70">
                    Mensagem
                  </Label>
                  <Textarea
                    id="ln-message"
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="mt-2 bg-transparent border-0 border-b border-brand-navy/20 rounded-none focus-visible:ring-0 focus-visible:border-brand-vinho px-0 text-brand-navy resize-none"
                    placeholder="Conte um pouco sobre o seu projeto..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={!isValid || isPending}
                  className="group w-full md:w-auto bg-brand-navy text-brand-areia px-10 py-4 text-xs uppercase transition-all hover:bg-[#2d4373] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-3 mt-4"
                  style={{ letterSpacing: "3px", fontWeight: 500 }}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Solicitar diagnostico gratuito
                      <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
