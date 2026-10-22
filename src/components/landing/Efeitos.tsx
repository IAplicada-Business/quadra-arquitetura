import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useReducedMotion } from "framer-motion";
import { MessageCircle } from "lucide-react";
import logoBege from "@/assets/logo-bege.png";
import logoAzul from "@/assets/logo-azul.png";
import { SAIDA } from "@/lib/motion";

/**
 * Peças de efeito da landing, além das de entrada que vivem em Motion.
 *
 * Todas respeitam `prefers-reduced-motion` e nenhuma carrega informação
 * que só exista no movimento: o contador tem o valor final para o leitor
 * de tela, o letreiro repete texto que já está na página, o botão de
 * WhatsApp é um link comum.
 */

/* ------------------------------------------------------------------ */
/* Contador                                                            */
/* ------------------------------------------------------------------ */

/**
 * "50" e "+80h" contam do zero até o valor quando entram na vista.
 * Ano ("2022") não conta: ver 0 virar 2022 é um efeito sem sentido para
 * uma data. Quem pediu menos movimento vê o valor final de saída.
 */
export function Contador({ valor }: { valor: string }) {
  const partes = valor.match(/^(\D*?)(\d+)(\D*)$/);
  const reduzir = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const visto = useInView(ref, { once: true });

  const alvo = partes ? Number(partes[2]) : 0;
  const animavel = !!partes && partes[2].length < 4 && alvo > 0 && !reduzir;
  const [n, setN] = useState(animavel ? 0 : alvo);

  useEffect(() => {
    if (!animavel) return;
    // Sem IntersectionObserver (ou antes do gatilho em testes) o número
    // final aparece em vez de ficar parado no zero.
    if (typeof IntersectionObserver === "undefined") {
      setN(alvo);
      return;
    }
    if (!visto) return;
    const controle = animate(0, alvo, { duration: 1.6, ease: SAIDA, onUpdate: (v) => setN(Math.round(v)) });
    // Rede de segurança: se a animação não terminar (aba em segundo plano,
    // ambiente sem rAF), o número final aparece de qualquer jeito.
    const garantia = setTimeout(() => setN(alvo), 2600);
    return () => {
      controle.stop();
      clearTimeout(garantia);
    };
  }, [animavel, visto, alvo]);

  if (!partes || !animavel) return <>{valor}</>;
  return (
    <span ref={ref}>
      <span className="sr-only">{valor}</span>
      <span aria-hidden>
        {partes[1]}
        {n}
        {partes[3]}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Letreiro                                                            */
/* ------------------------------------------------------------------ */

/**
 * Faixa que corre devagar entre a primeira dobra e o argumento.
 *
 * Os textos vêm do próprio conteúdo do site (chamada do hero e nome das
 * fases), então o time não ganha campo novo para manter. É decorativo:
 * repete o que já está na página, por isso `aria-hidden`. Passar o mouse
 * pausa; movimento reduzido para de vez e a faixa vira estática.
 */
export function Letreiro({ itens }: { itens: string[] }) {
  if (itens.length === 0) return null;
  // Repete o conjunto até a metade passar da largura de uma tela larga.
  const base = [...itens, ...itens, ...itens];
  const metade = (chave: string) => (
    <ul key={chave} className="flex shrink-0 items-center">
      {base.map((t, i) => (
        <li key={i} className="flex items-center whitespace-nowrap">
          <span
            className="text-brand-navy/75 px-7 md:px-10"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic", fontSize: "clamp(1.25rem, 2vw, 1.75rem)", fontWeight: 400 }}
          >
            {t}
          </span>
          {/* O módulo quadrado do logotipo como separador. */}
          <span aria-hidden className="block h-2 w-2 bg-brand-terracota" />
        </li>
      ))}
    </ul>
  );

  return (
    <div aria-hidden className="overflow-hidden bg-brand-areia/60 border-y border-brand-navy/10 py-4 md:py-5">
      <div className="flex w-max animate-marquee motion-reduce:animate-none hover:[animation-play-state:paused]">
        {metade("a")}
        {metade("b")}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Marca d'água                                                        */
/* ------------------------------------------------------------------ */

/**
 * O logotipo empilhado (QUA/DRA) em escala de arquitetura, quase
 * invisível. É o ativo mais próprio da marca e a landing só o usava
 * pequeno, na barra. `tom` escolhe a versão que combina com o fundo.
 */
export function MarcaDagua({ tom = "bege", className = "" }: { tom?: "bege" | "azul"; className?: string }) {
  return (
    <img
      aria-hidden
      alt=""
      src={tom === "bege" ? logoBege : logoAzul}
      draggable={false}
      className={`pointer-events-none select-none ${className}`}
    />
  );
}

/* ------------------------------------------------------------------ */
/* WhatsApp flutuante                                                  */
/* ------------------------------------------------------------------ */

/**
 * Atalho para a conversa, nas cores da marca (terracota e navy, não o
 * verde do app). Só aparece depois da primeira dobra e some enquanto o
 * formulário de contato está na tela, para não cobrir os campos.
 */
export function WhatsFlutuante({ href, rotulo = "Falar com a Quadra" }: { href: string; rotulo?: string }) {
  const reduzir = useReducedMotion();
  const [passouHero, setPassouHero] = useState(false);
  const [noContato, setNoContato] = useState(false);

  useEffect(() => {
    const onScroll = () => setPassouHero(window.scrollY > 640);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const alvo = document.getElementById("contato");
    if (!alvo || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setNoContato(e.isIntersecting), { threshold: 0.15 });
    io.observe(alvo);
    return () => io.disconnect();
  }, []);

  const visivel = passouHero && !noContato;

  return (
    <AnimatePresence>
      {visivel && (
        <motion.a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label={rotulo}
          initial={{ opacity: 0, y: reduzir ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduzir ? 0 : 16 }}
          transition={{ duration: 0.4, ease: SAIDA }}
          className="group fixed bottom-5 right-5 z-40 flex h-12 items-center bg-brand-terracota text-brand-navy shadow-elevated transition-colors hover:bg-brand-rosa focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-navy focus-visible:ring-offset-2 focus-visible:ring-offset-brand-creme"
        >
          {/* Quadrado de 48px com o ícone exatamente no centro. Nada fora
              dele (nem gap) ocupa largura em repouso: o espaçamento do
              texto vive no próprio texto, e só existe com ele aberto. */}
          <span className="grid h-12 w-12 shrink-0 place-items-center">
            <MessageCircle className="h-5 w-5" strokeWidth={1.75} />
          </span>
          {/* O texto abre no hover (desktop). No celular fica só o ícone. */}
          <span
            aria-hidden
            className="hidden md:block max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-all duration-300 group-hover:max-w-[12rem] group-hover:pr-5 group-hover:opacity-100 group-focus-visible:max-w-[12rem] group-focus-visible:pr-5 group-focus-visible:opacity-100"
            style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 500 }}
          >
            {rotulo}
          </span>
        </motion.a>
      )}
    </AnimatePresence>
  );
}
