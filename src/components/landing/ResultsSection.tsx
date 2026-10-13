import { motion } from "framer-motion";
import { Clock, Wallet, CheckCircle2, HardHat } from "lucide-react";

/**
 * Seção de resultados/métricas entre About e Services.
 * Ideia nasceu da call de 16/04: "não sei quantas obras gerenciadas compradas
 * e orçamento em dia. Esses podem colocar tudo bonitinho aqui".
 *
 * Números editáveis aqui — não vêm do DB, são curadoria da Quadra.
 */
const stats = [
  {
    icon: HardHat,
    value: "50+",
    label: "Obras entregues",
    hint: "Residencial, corporativo e health care",
  },
  {
    icon: Clock,
    value: "95%",
    label: "Entregues no prazo",
    hint: "Cronograma com marcos semanais",
  },
  {
    icon: Wallet,
    value: "100%",
    label: "Orçamento transparente",
    hint: "Prestação de contas em tempo real",
  },
  {
    icon: CheckCircle2,
    value: "0",
    label: "Dor de cabeça para o cliente",
    hint: "Gestão direta do canteiro",
  },
];

export function ResultsSection() {
  return (
    <section className="relative py-20 md:py-28 bg-brand-rosa overflow-hidden">
      {/* Decorative */}
      <div
        className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full opacity-20 blur-3xl"
        style={{ background: "hsl(var(--brand-terracota))" }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1 }}
          className="text-center mb-12 md:mb-16 max-w-2xl mx-auto"
        >
          <p
            className="text-xs mb-5"
            style={{
              color: "hsl(var(--brand-vinho))",
              letterSpacing: "6px",
              fontFamily: "'Jost', sans-serif",
              fontWeight: 500,
            }}
          >
            RESULTADOS
          </p>
          <h2
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4.5vw, 3.25rem)",
              color: "hsl(var(--brand-navy))",
              fontWeight: 300,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            Obra{" "}
            <em style={{ color: "hsl(var(--brand-vinho))", fontStyle: "italic" }}>sem surpresas</em>
            , em números.
          </h2>
          <div className="w-12 h-px mx-auto mt-6" style={{ backgroundColor: "hsl(var(--brand-vinho))" }} />
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.8, delay: i * 0.1 }}
                className="text-center"
              >
                <div
                  className="w-14 h-14 mx-auto mb-5 flex items-center justify-center rounded-full border"
                  style={{ borderColor: "hsl(var(--brand-vinho))", backgroundColor: "rgba(139,69,87,0.06)" }}
                >
                  <Icon className="h-6 w-6" style={{ color: "hsl(var(--brand-vinho))" }} strokeWidth={1.5} />
                </div>
                <p
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: "clamp(2.5rem, 5vw, 3.5rem)",
                    color: "hsl(var(--brand-navy))",
                    fontWeight: 300,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </p>
                <p
                  className="mt-2 mb-1"
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "0.9375rem",
                    color: "hsl(var(--brand-navy))",
                    fontWeight: 500,
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                  }}
                >
                  {s.label}
                </p>
                <p
                  style={{
                    fontFamily: "'Jost', sans-serif",
                    fontSize: "0.8125rem",
                    color: "hsl(var(--brand-navy))",
                    opacity: 0.65,
                    lineHeight: 1.5,
                    fontWeight: 300,
                  }}
                >
                  {s.hint}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
