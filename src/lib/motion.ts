/**
 * O vocabulário de movimento da landing.
 *
 * Antes cada dobra trazia seus próprios números soltos no JSX — 20px
 * aqui, 0.7s ali, um delay de 0.08 na terceira. O resultado era um
 * movimento que existia no código e não aparecia na tela: 20px de
 * deslocamento com saída rápida termina 98% da animação nos primeiros
 * 300ms, abaixo do que o olho registra enquanto rola a página.
 *
 * Aqui os números moram num lugar só. Mexer em DISTANCIA muda a página
 * inteira de uma vez, que é o comportamento certo para uma identidade:
 * a dobra de cases não tem motivo nenhum para entrar diferente da dobra
 * de depoimentos.
 *
 * A régua da marca é sóbria. "Moderno" aqui é entrada precisa e
 * deliberada, não salto nem mola: nada ultrapassa o destino e volta,
 * porque material de escritório de arquitetura não quica.
 */

/**
 * Expo-out. Sai rápido do lugar e freia longo no fim.
 *
 * É o que dá a sensação de peso assentando em vez de elemento sendo
 * empurrado. O ease anterior ([0.22, 1, 0.36, 1]) freava cedo demais e
 * o fim da animação acontecia fora da vista.
 */
export const SAIDA = [0.16, 1, 0.3, 1] as const;

/** Para o que sai da tela: simétrico, sem o freio longo. */
export const ENTRADA = [0.4, 0, 0.2, 1] as const;

/**
 * 32px. Abaixo de ~28px o deslocamento compete com o próprio movimento
 * de rolagem e vira ruído; acima de ~40px a página parece montar-se
 * sozinha, o que destoa da sobriedade da marca.
 */
export const DISTANCIA = 32;

/** Imagem entra de mais longe: tem área maior, aguenta mais curso. */
export const DISTANCIA_IMAGEM = 48;

export const DURACAO = {
  /** Rótulo, fio, detalhe. */
  curta: 0.5,
  /** O padrão: título, parágrafo, card. */
  media: 0.85,
  /** Imagem grande e painel de dobra inteira. */
  longa: 1.1,
} as const;

/**
 * 0.11s entre um item e o seguinte.
 *
 * Em 0.08 (o valor antigo) quatro cards terminam de entrar em 240ms e
 * leem-se como um bloco só piscando. Em 0.11 a cascata é visível sem
 * que o último card faça esperar: seis itens fecham em 550ms.
 */
export const CASCATA = 0.11;

/**
 * Quanto o elemento precisa entrar na tela antes de animar.
 *
 * O valor antigo (-60px / -80px) disparava a entrada com o card ainda
 * raspando a borda inferior, então a animação acontecia onde ninguém
 * estava olhando — foi o que a medição mostrou, com os dois primeiros
 * cards já opacos quando a dobra chegou à vista. Com -140px o card
 * está confortavelmente dentro do quadro quando começa a se mover.
 */
export const MARGEM_GATILHO = "-140px";

/** A regra de viewport usada por toda a landing. */
export const VIEWPORT = { once: true, margin: MARGEM_GATILHO } as const;

/**
 * Container de cascata.
 *
 * O ponto de existir um container, em vez de `delay: i * 0.1` em cada
 * filho, é que o gatilho passa a ser um só. Com o delay no filho, cada
 * card espera o próprio limiar de viewport e *depois* conta o atraso —
 * numa grade de duas fileiras o quarto card entrava 0.3s atrasado em
 * relação a si mesmo, não ao primeiro, e a cascata que se via no papel
 * não existia na tela. Aqui o container entra na vista uma vez e
 * distribui os filhos a partir desse instante.
 */
export const cascata = (atraso = 0) => ({
  oculto: {},
  visivel: { transition: { staggerChildren: CASCATA, delayChildren: atraso } },
});

/** Filho de uma cascata: sobe e aparece. */
export const sobe = {
  oculto: { opacity: 0, y: DISTANCIA },
  visivel: {
    opacity: 1,
    y: 0,
    transition: { duration: DURACAO.media, ease: SAIDA },
  },
};

/** Filho de cascata que entra pela lateral. Para listas e trilhas. */
export const vemDaEsquerda = {
  oculto: { opacity: 0, x: -DISTANCIA },
  visivel: {
    opacity: 1,
    x: 0,
    transition: { duration: DURACAO.media, ease: SAIDA },
  },
};

/**
 * Fio que se desenha.
 *
 * Usado nas réguas que separam o rótulo do título. É o movimento mais
 * barato que existe — uma propriedade, sem layout — e é o que mais
 * carrega a ideia de traço de projeto sendo riscado.
 */
export const risca = {
  oculto: { scaleX: 0 },
  visivel: {
    scaleX: 1,
    transition: { duration: DURACAO.longa, ease: SAIDA },
  },
};

/**
 * Imagem que assenta: entra de baixo com um resto de escala.
 *
 * A escala parte de 1.06 e não de 0.94 de propósito. Partir de menor e
 * crescer dá impressão de pop-up; partir de maior e assentar dá
 * impressão de foco sendo encontrado, que é o que combina com foto de
 * obra.
 */
export const assenta = {
  oculto: { opacity: 0, y: DISTANCIA_IMAGEM, scale: 1.06 },
  visivel: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: DURACAO.longa, ease: SAIDA },
  },
};

/**
 * As mesmas variantes, sem deslocamento, para quem pediu menos
 * movimento no sistema operacional.
 *
 * Opacidade fica: não é movimento, é revelação, e sem ela a página
 * perde a noção de progressão por completo. Quem marca
 * `prefers-reduced-motion` está pedindo para a tela parar de se mexer,
 * não para tudo aparecer de uma vez sem hierarquia nenhuma.
 */
export const semMovimento = {
  oculto: { opacity: 0 },
  visivel: { opacity: 1, transition: { duration: DURACAO.curta, ease: SAIDA } },
};
