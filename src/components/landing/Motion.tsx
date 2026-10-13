import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DURACAO,
  SAIDA,
  VIEWPORT,
  assenta,
  cascata,
  risca,
  semMovimento,
  sobe,
  vemDaEsquerda,
} from "@/lib/motion";

/**
 * As peças de movimento da landing.
 *
 * Toda dobra usa estas três: `Revelar` para o cabeçalho, `Sequencia`
 * para o conjunto de cards e `Item` para cada card. O ganho de ter um
 * componente em vez de repetir `initial/whileInView/viewport/transition`
 * é o de sempre — a regra de quando animar fica num lugar só —, mas aqui
 * tem um segundo ganho que importa mais: `prefers-reduced-motion` é
 * respeitado por construção. Antes, cada dobra teria que lembrar de
 * checar, e bastava uma esquecer para a página virar um problema de
 * acessibilidade para quem sente enjoo com movimento na tela.
 */

/** Troca a variante por uma versão sem deslocamento quando for o caso. */
function useVariante<T>(cheia: T, reduzida = semMovimento) {
  const reduzir = useReducedMotion();
  return (reduzir ? reduzida : cheia) as T;
}

type Props = {
  children: ReactNode;
  className?: string;
  /** Segundos antes de começar. Para escalonar irmãos fora de cascata. */
  atraso?: number;
  /**
   * Encaminhado para o elemento. Existe porque estas peças envolvem
   * blocos decorativos — o painel de amostra da Trilha é um —, e um
   * invólucro que engolisse a marcação devolveria ao leitor de tela
   * uma ilustração que ele não tem motivo para ouvir.
   */
  "aria-hidden"?: boolean;
  /** Encaminhado para o elemento, como o className. */
  style?: CSSProperties;
};

/**
 * Um elemento que entra sozinho: cabeçalho de dobra, parágrafo, botão.
 */
export function Revelar({ children, className, atraso = 0, ...resto }: Props) {
  const reduzir = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduzir ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={VIEWPORT}
      transition={{ duration: reduzir ? DURACAO.curta : DURACAO.media, delay: atraso, ease: SAIDA }}
      className={className}
      {...resto}
    >
      {children}
    </motion.div>
  );
}

/**
 * O conjunto. Entra uma vez na vista e distribui os filhos em cascata.
 *
 * Os filhos precisam ser `Item` (ou qualquer `motion` com as variantes
 * `oculto`/`visivel`): o framer propaga o estado do pai pelo nome da
 * variante, então nenhum filho declara o próprio gatilho. É isso que
 * faz a segunda fileira de uma grade entrar em sequência com a
 * primeira, em vez de recomeçar a contagem quando ela própria aparece.
 */
export function Sequencia({ children, className, atraso = 0, ...resto }: Props) {
  return (
    <motion.div
      initial="oculto"
      whileInView="visivel"
      viewport={VIEWPORT}
      variants={cascata(atraso)}
      className={className}
      {...resto}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cascata que dispara ao carregar, não ao entrar na vista.
 *
 * Só a primeira dobra usa: ela já está na tela quando a página abre,
 * então esperar o gatilho de viewport seria esperar um evento que já
 * aconteceu. O resto da landing usa `Sequencia`.
 */
export function SequenciaEntrada({ children, className, atraso = 0, ...resto }: Props) {
  return (
    <motion.div initial="oculto" animate="visivel" variants={cascata(atraso)} className={className} {...resto}>
      {children}
    </motion.div>
  );
}

/** Mesma coisa, para quando o conjunto precisa ser uma lista de verdade. */
export function SequenciaLista({ children, className, atraso = 0, ...resto }: Props) {
  return (
    <motion.ol
      initial="oculto"
      whileInView="visivel"
      viewport={VIEWPORT}
      variants={cascata(atraso)}
      className={className}
      {...resto}
    >
      {children}
    </motion.ol>
  );
}

/** Cascata numa lista de definições: "por que" e FAQ. */
export function SequenciaDl({ children, className, atraso = 0, ...resto }: Props) {
  return (
    <motion.dl
      initial="oculto"
      whileInView="visivel"
      viewport={VIEWPORT}
      variants={cascata(atraso)}
      className={className}
      {...resto}
    >
      {children}
    </motion.dl>
  );
}

/** Cascata numa lista sem ordem. */
export function SequenciaUl({ children, className, atraso = 0, ...resto }: Props) {
  return (
    <motion.ul
      initial="oculto"
      whileInView="visivel"
      viewport={VIEWPORT}
      variants={cascata(atraso)}
      className={className}
      {...resto}
    >
      {children}
    </motion.ul>
  );
}

type ItemProps = Omit<Props, "atraso"> & {
  /** O movimento deste filho. Padrão: sobe. */
  modo?: "sobe" | "lado" | "imagem";
};

const MODOS = { sobe, lado: vemDaEsquerda, imagem: assenta };

/** Um filho de cascata. Não declara gatilho: quem dispara é a Sequencia. */
export function Item({ children, className, modo = "sobe", ...resto }: ItemProps) {
  const variants = useVariante(MODOS[modo]);
  return (
    <motion.div variants={variants} className={className} {...resto}>
      {children}
    </motion.div>
  );
}

/** Filho de cascata como `<li>`, para listas semânticas. */
export function ItemLista({ children, className, modo = "sobe", ...resto }: ItemProps) {
  const variants = useVariante(MODOS[modo]);
  return (
    <motion.li variants={variants} className={className} {...resto}>
      {children}
    </motion.li>
  );
}

/** Filho de cascata como `<article>`, para case e artigo. */
export function ItemArtigo({ children, className, modo = "sobe", ...resto }: ItemProps) {
  const variants = useVariante(MODOS[modo]);
  return (
    <motion.article variants={variants} className={className} {...resto}>
      {children}
    </motion.article>
  );
}

/** Filho de cascata como `<figure>`, para depoimento. */
export function ItemFigura({ children, className, modo = "sobe", ...resto }: ItemProps) {
  const variants = useVariante(MODOS[modo]);
  return (
    <motion.figure variants={variants} className={className} {...resto}>
      {children}
    </motion.figure>
  );
}

/**
 * O fio que se risca ao lado do rótulo da dobra.
 *
 * É o elemento que mais barato carrega a ideia de progressão: quando
 * uma dobra termina e a próxima começa, é o traço aparecendo que diz
 * "capítulo novo". Decorativo, logo `aria-hidden`.
 */
export function Fio({ className = "" }: { className?: string }) {
  const reduzir = useReducedMotion();
  if (reduzir) return <span aria-hidden className={`block h-px ${className}`} />;
  return (
    <motion.span
      aria-hidden
      initial="oculto"
      whileInView="visivel"
      viewport={VIEWPORT}
      variants={risca}
      style={{ transformOrigin: "left" }}
      className={`block h-px ${className}`}
    />
  );
}

/**
 * O rótulo que abre a dobra, com o fio riscando ao lado.
 *
 * Existe para responder à pergunta da passagem entre dobras. Rolagem
 * contínua tira do leitor a noção de que mudou de assunto: sem um
 * corte de página, uma dobra escorre na outra. O fio riscando no
 * instante em que a dobra entra é o corte — curto, e sempre no mesmo
 * lugar, então vira gramática em vez de efeito.
 */
export function Rotulo({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* min-w-0 e não shrink-0: há rótulos longos ("Como você acompanha
          o andamento"), e travar o encolhimento estourava a tela a 320px
          em vez de deixar o texto quebrar em duas linhas. */}
      <p
        className="text-brand-terracota min-w-0"
        style={{ fontFamily: "'Jost', sans-serif", fontSize: "11px", letterSpacing: "0.22em", fontWeight: 500 }}
      >
        {children}
      </p>
      <Fio className="flex-1 min-w-[1.5rem] bg-brand-terracota/30" />
    </div>
  );
}
