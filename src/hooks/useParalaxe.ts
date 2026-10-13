import type { RefObject } from "react";
import { useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * Deslocamento da imagem contra a rolagem.
 *
 * É a peça que responde à pergunta da transição entre dobras: o que
 * marca a passagem de uma para outra não é um efeito no limite entre
 * elas, é a foto andar mais devagar que o texto ao lado. A profundidade
 * aparece no percurso inteiro, não num instante.
 *
 * `useSpring` existe por causa do trackpad, que entrega a rolagem em
 * saltos: sem ele a foto anda em degraus visíveis.
 *
 * @param alvo  elemento que define a faixa de rolagem observada
 * @param curso quantos pixels a imagem percorre do começo ao fim
 */
export function useParalaxe(alvo: RefObject<HTMLElement | null>, curso = 60) {
  const reduzir = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: alvo,
    offset: ["start end", "end start"],
  });
  const suave = useSpring(scrollYProgress, { stiffness: 90, damping: 28, restDelta: 0.001 });
  const y = useTransform(suave, [0, 1], [curso, -curso]);
  return reduzir ? undefined : y;
}
