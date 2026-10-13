/**
 * Conteúdo editável do site institucional (rota /).
 *
 * Cada seção do site tem campos com chave fixa ("hero.title", "about.body"...).
 * O time edita na aba Configurações → Site; o que fica salvo em
 * `site_content` é só o que difere do padrão abaixo. A leitura sempre faz
 * merge com o padrão, então uma tabela vazia mostra o site de sempre.
 *
 * Tipos de campo:
 *   text      texto simples (uma linha)
 *   richtext  **negrito**, *itálico* e Enter = quebra de linha
 *             (linha em branco separa parágrafos onde o bloco tem parágrafos)
 *   image     URL pública; "" = imagem padrão que vem com o site
 *   list      lista de itens { title, desc, image?, tag?, bullets? }
 */

export type SiteSectionKey =
  | "hero"
  | "why"
  | "services"
  | "journey"
  | "trail"
  | "portfolio"
  | "architects"
  | "about"
  | "testimonials"
  | "leadMagnet"
  | "faq"
  | "blog"
  | "contact"
  | "footer";

/* A ordem aqui é a ordem das dobras na página e das abas no admin. As
   chaves antigas (hero, about, services, portfolio, contact, footer)
   ficaram como estavam de propósito: o que o time já salvou em
   site_content continua valendo. */
export const SITE_SECTION_KEYS: SiteSectionKey[] = [
  "hero",
  "why",
  "services",
  "journey",
  "trail",
  "portfolio",
  "architects",
  "about",
  "testimonials",
  "leadMagnet",
  "faq",
  "blog",
  "contact",
  "footer",
];

export type SiteFieldType = "text" | "richtext" | "image" | "list";

export interface SiteListItem {
  title: string;
  desc: string;
  image?: string;
  /** Rótulo curto acima do item: o momento da jornada, a categoria do
   *  case, o papel de quem deu o depoimento. */
  tag?: string;
  /** Sub-itens, um por linha. Usado no "o que está incluso" das fases e
   *  nas promessas do programa para arquitetos. */
  bullets?: string;
}

export interface HeroContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaPrimary: string;
  ctaSecondary: string;
  image: string;
  /** Faixa de números sob os botões: title = número, desc = legenda. */
  stats: SiteListItem[];
  /** Faixa terracota no rodapé da foto. */
  note: string;
}

export interface WhyContent {
  eyebrow: string;
  title: string;
  /** Contrapontos: cada item é "quem faz o quê" e por que não basta. */
  items: SiteListItem[];
  closing: string;
}

export interface JourneyContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** Os três momentos, na ordem. O title casa com a tag das etapas. */
  moments: SiteListItem[];
  /** As nove etapas. tag = momento a que pertence. */
  steps: SiteListItem[];
}

export interface TrailContent {
  eyebrow: string;
  title: string;
  body: string;
  /** As promessas do painel. */
  items: SiteListItem[];
  note: string;
  /** Amostra do painel mostrada ao lado do texto. */
  demoTitle: string;
  demoSubtitle: string;
  demoDays: string;
  demoDaysLabel: string;
  demoProgress: string;
  /** Etapas da amostra: tag = situação (Concluído, Em andamento…). */
  demoSteps: SiteListItem[];
  demoDecisionLabel: string;
  demoDecisionText: string;
}

export interface ArchitectsContent {
  eyebrow: string;
  title: string;
  body: string;
  /** O que fazemos e o que nunca fazemos: tag "sim" ou "nao". */
  promises: SiteListItem[];
  ctaLabel: string;
  benefits: SiteListItem[];
}

export interface TestimonialsContent {
  eyebrow: string;
  title: string;
  linkLabel: string;
  linkUrl: string;
  /** desc = depoimento, title = nome, tag = papel/segmento. */
  items: SiteListItem[];
}

export interface LeadMagnetContent {
  eyebrow: string;
  title: string;
  body: string;
  ctaLabel: string;
  image: string;
}

export interface FaqContent {
  eyebrow: string;
  title: string;
  note: string;
  /** title = pergunta, desc = resposta. */
  items: SiteListItem[];
}

export interface BlogContent {
  eyebrow: string;
  title: string;
  linkLabel: string;
  linkUrl: string;
  /** tag = editoria, title = chamada, desc = link do artigo. */
  items: SiteListItem[];
}

export interface AboutContent {
  eyebrow: string;
  title: string;
  body: string;
  photo: string;
  credits: SiteListItem[];
  /** Selos no pé do bloco: CAU, RRT, relatório por visita. */
  badges: SiteListItem[];
}

export interface ServicesContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  /** As fases. tag = "FASE 01", bullets = o que está incluso. */
  items: SiteListItem[];
}

export interface PortfolioContent {
  eyebrow: string;
  title: string;
  linkLabel: string;
  linkUrl: string;
  items: SiteListItem[];
}

export interface ContactContent {
  eyebrow: string;
  title: string;
  text: string;
  formTitle: string;
  contacts: SiteListItem[];
  /** Opções dos selects do formulário, uma por linha. */
  optionsWho: string;
  optionsStage: string;
  submitLabel: string;
}

export interface FooterContent {
  logo: string;
  tagline: string;
  address: string;
  email: string;
  instagramHandle: string;
  instagramUrl: string;
  legal: string;
  location: string;
}

export interface SiteContent {
  hero: HeroContent;
  why: WhyContent;
  services: ServicesContent;
  journey: JourneyContent;
  trail: TrailContent;
  portfolio: PortfolioContent;
  architects: ArchitectsContent;
  about: AboutContent;
  testimonials: TestimonialsContent;
  leadMagnet: LeadMagnetContent;
  faq: FaqContent;
  blog: BlogContent;
  contact: ContactContent;
  footer: FooterContent;
}

/* ------------------------------------------------------------------ */
/* Padrão (o site como estava em código)                               */
/* ------------------------------------------------------------------ */

export const SITE_DEFAULTS: SiteContent = {
  hero: {
    eyebrow: "VIABILIDADE · GERENCIAMENTO · BH",
    title: "Alguém que trabalha *só para você* — do número ao tijolo.",
    subtitle:
      "Você não precisa entender de obra. Precisa saber quem entende. A Quadra coordena orçamento, fornecedores, prazo e execução — e te mantém no controle das decisões.",
    ctaPrimary: "Falar com a Quadra",
    ctaSecondary: "Ver a jornada completa",
    image: "",
    stats: [
      { title: "2022", desc: "DESDE" },
      { title: "50", desc: "PROJETOS ATENDIDOS" },
      { title: "+80h", desc: "ECONOMIZADAS POR OBRA" },
      { title: "3", desc: "SEGMENTOS: RESIDENCIAL, CORPORATIVO, SAÚDE" },
    ],
    note: "Visita técnica na frequência combinada — com relatório a cada visita.",
  },
  why: {
    eyebrow: "POR QUE A QUADRA",
    title: "Porque, na maioria das obras, cada especialista defende *um lado diferente*.",
    items: [
      { title: "Construtoras", desc: "Entregam a obra — e respondem por ela, não por você." },
      { title: "Arquitetos autônomos", desc: "Entregam o projeto — e seguem em frente quando a obra começa." },
      { title: "Consultores", desc: "Dão conselho pontual — sem acompanhar a execução no dia a dia." },
    ],
    closing: "A Quadra trabalha *só para você* — do número ao tijolo.",
  },
  services: {
    eyebrow: "NOSSOS SERVIÇOS",
    title: "Duas fases, *não contratos soltos*",
    subtitle:
      "Cada fase tem escopo, entregas e um ponto de encerramento claros. Abra cada uma para ver exatamente o que está incluso.",
    items: [
      {
        tag: "FASE 01",
        title: "Viabilidade",
        desc:
          "Antes de qualquer decisão, você entende o custo real e a viabilidade da obra — em até 15 dias, com planilha e parecer técnico.",
        bullets: [
          "EVF · Estudo de Viabilidade Financeira",
          "Levantamento de custos por etapa e disciplina",
          "Planilha orçamentária aberta, item a item",
          "Parecer técnico sobre o que a obra exige",
          "Pontos de atenção antes da demolição",
        ].join("\n"),
      },
      {
        tag: "FASE 02",
        title: "Gerenciamento",
        desc:
          "Visitas técnicas, validação da execução, especificação e acompanhamento de compra, com relatórios — para o projeto sair do papel exatamente como planejado.",
        bullets: [
          "Visitas técnicas na frequência combinada",
          "Relatório com fotos a cada visita",
          "Coordenação de fornecedores e prestadores",
          "Especificação e acompanhamento das compras",
          "Cronograma reverso a partir da data de mudança",
          "Acesso à Trilha do Cliente durante toda a obra",
        ].join("\n"),
      },
    ],
  },
  journey: {
    eyebrow: "JORNADA DE GERENCIAMENTO",
    title: "Um caminho claro, do primeiro contato até *a obra em andamento*",
    subtitle:
      "Nove etapas organizadas em três momentos — entendimento, decisão e execução — para você ter previsibilidade do início ao fim.",
    moments: [
      { title: "ENTENDIMENTO", desc: "O que a obra exige e quanto ela custa de verdade." },
      { title: "DECISÃO", desc: "Cenários na mesa para você escolher com clareza." },
      { title: "OBRA", desc: "Execução coordenada, do primeiro dia à chave." },
    ],
    steps: [
      {
        tag: "ENTENDIMENTO",
        title: "Contratação da Quadra",
        desc: "A Quadra assume a coordenação do seu projeto. A partir daqui, você tem um único ponto de contato do início ao fim da obra.",
      },
      {
        tag: "ENTENDIMENTO",
        title: "Análise do projeto",
        desc: "Estudamos plantas, especificações e memoriais para entender exatamente o que a obra exige — e onde estão os pontos de atenção.",
      },
      {
        tag: "ENTENDIMENTO",
        title: "Orçamentos",
        desc: "Levantamos valores com fornecedores e prestadores de confiança e comparamos propostas para chegar a um orçamento realista.",
      },
      {
        tag: "DECISÃO",
        title: "Desenhos de cenários",
        desc: "Apresentamos cenários com diferentes combinações de escopo, prazo e investimento, para você decidir com clareza — nunca no escuro.",
      },
      {
        tag: "DECISÃO",
        title: "Reunião de prioridades",
        desc: "Nos sentamos com você para alinhar o que é essencial, o que pode esperar e o que faz sentido para o seu momento.",
      },
      {
        tag: "DECISÃO",
        title: "Definição de escopo",
        desc: "Com as prioridades claras, fechamos o escopo definitivo: o que será feito, em que ordem e com qual investimento.",
      },
      {
        tag: "OBRA",
        title: "Mobilização de obra",
        desc: "Organizamos equipe, materiais e cronograma para que o primeiro dia de trabalho comece sem surpresas.",
      },
      {
        tag: "OBRA",
        title: "Início de obra",
        desc: "A obra começa. A Quadra gerencia execução, prazos e qualidade de perto, para você acompanhar sem precisar estar lá todos os dias.",
      },
      {
        tag: "OBRA",
        title: "Contratações conforme cronograma",
        desc: "Contratamos cada especialidade — elétrica, hidráulica, marcenaria, acabamentos — no momento certo do cronograma, sem atropelo.",
      },
    ],
  },
  trail: {
    eyebrow: "COMO VOCÊ ACOMPANHA O ANDAMENTO",
    title: "A Trilha do Cliente",
    body: [
      "Um painel só seu, atualizado a cada visita técnica. Você abre no celular e vê em que ponto a obra está, o que já foi aprovado e o que precisa da sua decisão nos próximos dias.",
      "A linha do tempo é reversa: tudo é calculado a partir da data em que você quer se mudar — não da data em que começamos. Assim cada atraso aparece como decisão a tomar, não como surpresa no fim.",
    ].join("\n\n"),
    items: [
      { title: "Nada de perguntar “como está a obra?”", desc: "o andamento já está lá quando você abre." },
      { title: "Decisão com antecedência", desc: "o painel avisa o que precisa ser escolhido antes de virar atraso." },
      { title: "Registro de tudo", desc: "relatórios, fotos e aprovações ficam guardados no mesmo lugar." },
      { title: "Prazo sempre honesto", desc: "se a data da mudança se mexe, você descobre na hora, não no fim." },
    ],
    note: "Disponível durante o gerenciamento de obra. Arquitetos parceiros recebem senha de acesso.",
    demoTitle: "Reforma · Apartamento Sion",
    demoSubtitle: "TRILHA DO CLIENTE",
    demoDays: "84",
    demoDaysLabel: "DIAS PARA A MUDANÇA",
    demoProgress: "62",
    demoSteps: [
      { tag: "CONCLUÍDO", title: "Diagnóstico e escopo", desc: "Escopo definitivo assinado em 14/04." },
      { tag: "CONCLUÍDO", title: "Orçamento e cenários", desc: "Três cenários apresentados; cenário B aprovado." },
      { tag: "CONCLUÍDO", title: "Mobilização de obra", desc: "Equipe, cronograma e materiais organizados." },
      { tag: "EM ANDAMENTO", title: "Obra em andamento", desc: "Elétrica e hidráulica finalizadas. Contrapiso em execução." },
      { tag: "AGUARDANDO VOCÊ", title: "Acabamentos e marcenaria", desc: "Bancada e marcenaria em fase de aprovação." },
      { tag: "A SEGUIR", title: "Entrega e pós-obra", desc: "Checklist final e 90 dias de acompanhamento." },
    ],
    demoDecisionLabel: "PRECISA DA SUA DECISÃO ATÉ 12/09",
    demoDecisionText: "Aprovar a bancada da cozinha para não atravessar o prazo de fabricação de 30 dias.",
  },
  portfolio: {
    eyebrow: "CASES",
    title: "O que foi evitado — *não só o que ficou pronto*",
    linkLabel: "Ver todos os cases",
    linkUrl: "https://instagram.com/quadraarq",
    items: [
      {
        tag: "RESIDENCIAL · VIABILIDADE + GERENCIAMENTO",
        title: "A reforma que quase começou errada",
        desc:
          "O orçamento inicial não previa a troca completa de hidráulica. Refizemos a conta antes da demolição e reorganizamos o escopo em duas frentes.\n\n*O que foi evitado:* uma parada de obra de seis semanas no meio da execução.\n\nFases 01 + 02 · Sion, BH",
        image: "",
      },
      {
        tag: "CORPORATIVO · GERENCIAMENTO",
        title: "Escritório entregue com a equipe já contratada",
        desc:
          "Prazo fixo por conta da mudança. Coordenamos cinco especialidades em paralelo e antecipamos a compra dos itens de maior prazo de entrega.\n\n*O que foi evitado:* R$ 40 mil em aluguel de espaço provisório.\n\nFase 02 · Savassi, BH",
        image: "",
      },
      {
        tag: "SAÚDE · VIABILIDADE",
        title: "A clínica que não caberia naquele imóvel",
        desc:
          "O estudo de viabilidade mostrou que as exigências sanitárias inviabilizavam a planta pretendida. A cliente escolheu outro ponto antes de assinar o contrato.\n\n*O que foi evitado:* a compra errada de um imóvel inteiro.\n\nFase 01 · Belo Horizonte",
        image: "",
      },
    ],
  },
  architects: {
    eyebrow: "PARA ARQUITETOS",
    title: "Conta com a Quadra",
    body:
      "Um programa de parceria para arquitetos que querem seguir focados no projeto enquanto alguém especializado cuida da obra — sem perder a autoria nem a relação com o cliente.",
    promises: [
      { tag: "sim", title: "Mantemos o arquiteto informado e respeitamos a autoria do projeto.", desc: "" },
      { tag: "sim", title: "Protegemos a relação arquiteto-cliente — atuamos como extensão operacional.", desc: "" },
      { tag: "sim", title: "Você participa ativamente dos grupos da obra, do começo ao fim.", desc: "" },
      { tag: "sim", title: "Você recebe uma senha de acesso à Trilha do Cliente, para apoiar o cliente no acompanhamento.", desc: "" },
      { tag: "nao", title: "Nunca alteramos decisões de projeto sem alinhamento.", desc: "" },
      { tag: "nao", title: "Nunca desaparecemos depois de receber a indicação.", desc: "" },
    ],
    ctaLabel: "Quero indicar uma obra",
    benefits: [
      { title: "Tempo", desc: "Você não precisa atender ligação do cliente a cada problema de obra." },
      { title: "Proteção", desc: "Alguém cuida da execução sem abandonar o que foi projetado." },
      { title: "Experiência", desc: "O cliente recebe uma solução mais completa, do projeto à chave." },
      { title: "Reputação", desc: "Uma obra bem coordenada também fortalece a percepção do seu escritório." },
    ],
  },
  about: {
    eyebrow: "SOBRE A QUADRA",
    title: "Duas arquitetas, *nenhum outro interesse na mesa*",
    body: [
      "A Quadra nasceu de uma dúvida que ouvíamos em toda obra: como é que o projeto sai do papel? Entre o desenho aprovado e a casa pronta existe um caminho que ninguém estava conduzindo — e foi nele que decidimos ficar.",
      "Como arquitetas, nosso olhar é sensível à estética e à funcionalidade — cobramos prazo e preço sem perder de vista o que faz a casa ficar bonita e boa de viver.",
      "Desde 2022 acompanhamos obras em Belo Horizonte no papel de quem representa o cliente: conferindo número, escopo e acabamento — fazendo seu sonho se tornar sua casa pronta.",
    ].join("\n\n"),
    photo: "",
    credits: [
      { title: "Camilla", tag: "VISÃO, PROJETO E DECISÕES", desc: "Cuida da visão da Quadra, da experiência do cliente e da relação com os escritórios parceiros." },
      { title: "Mariana", tag: "OPERAÇÃO, OBRA E SOLUÇÃO", desc: "Está no canteiro: fornecedores, negociação, cronograma e os problemas que aparecem antes de virarem problema." },
    ],
    badges: [
      { title: "REGISTRO CAU", desc: "" },
      { title: "RRT POR OBRA", desc: "" },
      { title: "RELATÓRIO A CADA VISITA", desc: "" },
    ],
  },
  testimonials: {
    eyebrow: "PROVA SOCIAL",
    title: "“Eu jamais faria outra obra *sem a Quadra*”",
    linkLabel: "Ver depoimentos no @quadraarq",
    linkUrl: "https://instagram.com/quadraarq",
    items: [
      { title: "Nome do cliente", tag: "Residencial · BH", desc: "Espaço reservado para depoimento de cliente final — foco em tranquilidade e previsibilidade." },
      { title: "Nome do cliente", tag: "Arquiteto parceiro", desc: "Espaço reservado para depoimento de arquiteto parceiro — foco em autoria preservada e obra bem coordenada." },
      { title: "Nome do cliente", tag: "Corporativo · BH", desc: "Espaço reservado para depoimento com número — economia obtida ou problema evitado." },
    ],
  },
  leadMagnet: {
    eyebrow: "MATERIAL GRATUITO",
    title: "Checklist: os 12 passos da *Obra sem Surto*",
    body: "O que resolver antes do primeiro quebra-quebra — na ordem certa. Baixe e use, mesmo que você não contrate a Quadra.",
    ctaLabel: "Receber checklist",
    image: "",
  },
  faq: {
    eyebrow: "PERGUNTAS FREQUENTES",
    title: "O que você provavelmente quer saber *antes de fechar*",
    note: "Não achou a sua? Manda mensagem — respondemos sem compromisso.",
    items: [
      {
        title: "Preciso contratar as duas fases?",
        desc: "Não. Cada fase é vendida separadamente e resolve uma dor diferente. Mas quem começa pela viabilidade e segue para o gerenciamento ganha continuidade técnica — a mesma equipe que entendeu a viabilidade já chega no canteiro conhecendo o projeto.",
      },
      {
        title: "Em que momento devo contratar a Quadra?",
        desc: "O quanto antes, de preferência com o projeto em mãos e antes do primeiro orçamento fechado. É aí que as decisões ainda são baratas de mudar.",
      },
      {
        title: "Como funciona a compra de material e acabamento?",
        desc: "A especificação e o acompanhamento são nossos; a compra é sua, no seu nome. Indicamos fornecedores, negociamos e conferimos prazo de entrega — sem ficar com margem sobre material.",
      },
      {
        title: "A Quadra gerencia obras projetadas por outros arquitetos?",
        desc: "Sim, e é boa parte do que fazemos. Respeitamos a autoria do projeto e mantemos o arquiteto no grupo da obra do começo ao fim.",
      },
      {
        title: "Atendem toda a Belo Horizonte?",
        desc: "Belo Horizonte e região metropolitana. Para obras fora dessa área, fale com a gente — avaliamos caso a caso.",
      },
    ],
  },
  blog: {
    eyebrow: "BLOG",
    title: "Obra sem Surto",
    linkLabel: "Ver todos os artigos",
    linkUrl: "https://instagram.com/quadraarq",
    items: [
      { tag: "ORÇAMENTO", title: "O orçamento da sua obra pode estar mentindo para você", desc: "", image: "" },
      { tag: "ANTES DE COMEÇAR", title: "5 decisões inofensivas que podem virar um problemão na obra", desc: "", image: "" },
      { tag: "OLHAR QUADRA", title: "Quem cuida da sua obra quando o arquiteto entrega o projeto?", desc: "", image: "" },
    ],
  },
  contact: {
    eyebrow: "FALE CONOSCO",
    title: "Vamos falar sobre *o seu projeto*.",
    text:
      "A primeira conversa é sem custo. Você conta o que quer fazer, a gente diz com franqueza o que é possível — e como o gerenciamento entra nessa conta.",
    formTitle: "Fale com a Quadra",
    contacts: [
      { title: "@quadraarq", desc: "https://instagram.com/quadraarq" },
      { title: "(31) 97264-1970 · Camilla", desc: "https://wa.me/5531972641970" },
      { title: "(31) 91244-672 · Mariana", desc: "https://wa.me/553191244672" },
      { title: "contato@quadraarquitetura.com", desc: "mailto:contato@quadraarquitetura.com" },
      {
        title: "Belo Horizonte, MG — atendemos toda a região metropolitana.",
        desc: "https://maps.google.com/?q=Belo+Horizonte+MG",
      },
    ],
    optionsWho: ["Cliente final", "Arquiteto(a)", "Outro"].join("\n"),
    optionsStage: [
      "Ainda estou pensando",
      "Tenho projeto pronto",
      "Já tenho orçamento na mão",
      "A obra já começou",
    ].join("\n"),
    submitLabel: "Enviar mensagem",
  },
  footer: {
    logo: "",
    tagline: "Quadra Arquitetura · Gerenciamento de obras · Belo Horizonte, MG",
    address: "Rua Euler, 10 · sala 301\nPadre Eustáquio · Belo Horizonte/MG\nCEP 30720-160",
    email: "contato@quadraarquitetura.com",
    instagramHandle: "@quadraarq",
    instagramUrl: "https://instagram.com/quadraarq",
    legal: "Quadra Arquitetura Ltda · CNPJ 46.731.679/0001-90",
    location: "Residenciais · Corporativos · Saúde",
  },
};

/* ------------------------------------------------------------------ */
/* Definição dos campos (o que o admin mostra)                         */
/* ------------------------------------------------------------------ */

export interface SiteFieldDef {
  /** Nome do campo dentro da seção (ex.: "title"). */
  name: string;
  type: SiteFieldType;
  label: string;
  hint?: string;
  /** Para list: rótulos das colunas e se o item tem imagem. */
  itemLabels?: { title: string; desc: string };
  itemImage?: boolean;
  /** Para list: rótulo do campo "tag" do item. Sem isto, o campo some. */
  itemTag?: string;
  /** Para list: rótulo do campo "bullets" (um item por linha). */
  itemBullets?: string;
  /** Para image: largura máxima após redimensionar. */
  maxWidth?: number;
}

export interface SiteSectionDef {
  key: SiteSectionKey;
  label: string;
  description: string;
  fields: SiteFieldDef[];
}

const RICH_HINT = "*itálico* sai na cor de destaque";

export const SITE_SECTION_DEFINITIONS: SiteSectionDef[] = [
  {
    key: "hero",
    label: "Hero",
    description: "Primeira tela do site: foto, título, botões e a faixa de números.",
    fields: [
      { name: "image", type: "image", label: "Foto", maxWidth: 2400 },
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "subtitle", type: "richtext", label: "Subtítulo" },
      { name: "ctaPrimary", type: "text", label: "Botão principal" },
      { name: "ctaSecondary", type: "text", label: "Botão secundário" },
      { name: "stats", type: "list", label: "Números", itemLabels: { title: "Número", desc: "Legenda" } },
      { name: "note", type: "text", label: "Faixa sobre a foto" },
    ],
  },
  {
    key: "why",
    label: "Por que a Quadra",
    description: "Os contrapontos: o que cada tipo de profissional entrega, e o que falta.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "items", type: "list", label: "Contrapontos", itemLabels: { title: "Quem", desc: "O que entrega" } },
      { name: "closing", type: "richtext", label: "Fecho", hint: RICH_HINT },
    ],
  },
  {
    key: "services",
    label: "Serviços",
    description: "As duas fases, cada uma com o que está incluso.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "subtitle", type: "richtext", label: "Subtítulo" },
      {
        name: "items",
        type: "list",
        label: "Fases",
        itemLabels: { title: "Nome da fase", desc: "Resumo" },
        itemTag: "Etiqueta (ex.: FASE 01)",
        itemBullets: "O que está incluso (um por linha)",
      },
    ],
  },
  {
    key: "journey",
    label: "Jornada",
    description: "As nove etapas do gerenciamento, agrupadas em três momentos.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "subtitle", type: "richtext", label: "Subtítulo" },
      { name: "moments", type: "list", label: "Momentos", itemLabels: { title: "Nome do momento", desc: "Resumo" } },
      {
        name: "steps",
        type: "list",
        label: "Etapas",
        hint: "A numeração é automática, pela ordem. A etiqueta precisa bater com o nome do momento.",
        itemLabels: { title: "Nome da etapa", desc: "Descrição" },
        itemTag: "Momento",
      },
    ],
  },
  {
    key: "trail",
    label: "Trilha do Cliente",
    description: "O painel de acompanhamento, com a amostra mostrada ao lado.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "body", type: "richtext", label: "Texto", hint: "Linha em branco separa parágrafos" },
      { name: "items", type: "list", label: "Promessas", itemLabels: { title: "Promessa", desc: "Complemento" } },
      { name: "note", type: "text", label: "Observação (rodapé do bloco)" },
      { name: "demoSubtitle", type: "text", label: "Amostra · etiqueta" },
      { name: "demoTitle", type: "text", label: "Amostra · obra" },
      { name: "demoDays", type: "text", label: "Amostra · número de dias" },
      { name: "demoDaysLabel", type: "text", label: "Amostra · legenda dos dias" },
      { name: "demoProgress", type: "text", label: "Amostra · percentual concluído" },
      {
        name: "demoSteps",
        type: "list",
        label: "Amostra · etapas",
        itemLabels: { title: "Etapa", desc: "Detalhe" },
        itemTag: "Situação",
      },
      { name: "demoDecisionLabel", type: "text", label: "Amostra · chamada da decisão" },
      { name: "demoDecisionText", type: "richtext", label: "Amostra · texto da decisão" },
    ],
  },
  {
    key: "portfolio",
    label: "Cases",
    description: "Os cases, com o que foi evitado em cada um.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "linkLabel", type: "text", label: "Texto do link" },
      { name: "linkUrl", type: "text", label: "URL do link" },
      {
        name: "items",
        type: "list",
        label: "Cases",
        itemLabels: { title: "Título do case", desc: "História" },
        itemTag: "Segmento e fases",
        itemImage: true,
        maxWidth: 1600,
      },
    ],
  },
  {
    key: "architects",
    label: "Para arquitetos",
    description: "O programa de parceria: o que fazemos, o que nunca fazemos e os ganhos.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "body", type: "richtext", label: "Texto" },
      {
        name: "promises",
        type: "list",
        label: "Compromissos",
        hint: 'Na etiqueta use "sim" para o que fazemos e "nao" para o que nunca fazemos.',
        itemLabels: { title: "Compromisso", desc: "(não usado)" },
        itemTag: "sim / nao",
      },
      { name: "ctaLabel", type: "text", label: "Botão" },
      { name: "benefits", type: "list", label: "Ganhos", itemLabels: { title: "Ganho", desc: "Explicação" } },
    ],
  },
  {
    key: "about",
    label: "Sobre",
    description: "A história da Quadra, as duas sócias e os selos.",
    fields: [
      { name: "photo", type: "image", label: "Foto", maxWidth: 1400 },
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "body", type: "richtext", label: "Texto", hint: "Linha em branco separa parágrafos" },
      {
        name: "credits",
        type: "list",
        label: "Sócias",
        itemLabels: { title: "Nome", desc: "O que faz" },
        itemTag: "Área",
      },
      { name: "badges", type: "list", label: "Selos", itemLabels: { title: "Selo", desc: "(não usado)" } },
    ],
  },
  {
    key: "testimonials",
    label: "Prova social",
    description: "Depoimentos de clientes e arquitetos parceiros.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "linkLabel", type: "text", label: "Texto do link" },
      { name: "linkUrl", type: "text", label: "URL do link" },
      {
        name: "items",
        type: "list",
        label: "Depoimentos",
        itemLabels: { title: "Nome", desc: "Depoimento" },
        itemTag: "Segmento ou papel",
      },
    ],
  },
  {
    key: "leadMagnet",
    label: "Material gratuito",
    description: "O checklist oferecido em troca do contato.",
    fields: [
      { name: "image", type: "image", label: "Imagem do material", maxWidth: 1200 },
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "body", type: "richtext", label: "Texto" },
      { name: "ctaLabel", type: "text", label: "Botão" },
    ],
  },
  {
    key: "faq",
    label: "Perguntas frequentes",
    description: "As dúvidas que aparecem antes de fechar.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "note", type: "text", label: "Observação" },
      { name: "items", type: "list", label: "Perguntas", itemLabels: { title: "Pergunta", desc: "Resposta" } },
    ],
  },
  {
    key: "blog",
    label: "Blog",
    description: "Chamadas dos artigos do Obra sem Surto.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "linkLabel", type: "text", label: "Texto do link" },
      { name: "linkUrl", type: "text", label: "URL do link" },
      {
        name: "items",
        type: "list",
        label: "Artigos",
        itemLabels: { title: "Chamada", desc: "Link do artigo" },
        itemTag: "Editoria",
        itemImage: true,
        maxWidth: 1200,
      },
    ],
  },
  {
    key: "contact",
    label: "Contato",
    description: "Texto de chamada, canais de contato e título do formulário.",
    fields: [
      { name: "eyebrow", type: "text", label: "Chamada (acima do título)" },
      { name: "title", type: "richtext", label: "Título", hint: RICH_HINT },
      { name: "text", type: "richtext", label: "Texto" },
      {
        name: "contacts",
        type: "list",
        label: "Canais de contato",
        hint: "O ícone é escolhido pelo link: instagram.com, wa.me/tel:, mailto:, maps.",
        itemLabels: { title: "Texto exibido", desc: "Link" },
      },
      { name: "formTitle", type: "text", label: "Título do formulário" },
      { name: "optionsWho", type: "richtext", label: "Opções de \"Você é\"", hint: "Uma por linha" },
      { name: "optionsStage", type: "richtext", label: "Opções de \"Em que momento está\"", hint: "Uma por linha" },
      { name: "submitLabel", type: "text", label: "Botão de envio" },
    ],
  },
  {
    key: "footer",
    label: "Rodapé",
    description: "Logo, descrição curta, endereço e dados legais.",
    fields: [
      { name: "logo", type: "image", label: "Logo", maxWidth: 800 },
      { name: "tagline", type: "richtext", label: "Descrição curta" },
      { name: "address", type: "richtext", label: "Endereço", hint: "Uma linha por item" },
      { name: "email", type: "text", label: "E-mail" },
      { name: "instagramHandle", type: "text", label: "Instagram (texto)" },
      { name: "instagramUrl", type: "text", label: "Instagram (link)" },
      { name: "legal", type: "text", label: "Linha legal (razão social / CNPJ)" },
      { name: "location", type: "text", label: "Localização (canto direito)" },
    ],
  },
];

export function getSiteSectionDefinition(key: SiteSectionKey): SiteSectionDef {
  return SITE_SECTION_DEFINITIONS.find((d) => d.key === key)!;
}

export function siteFieldKey(section: SiteSectionKey, field: string): string {
  return `${section}.${field}`;
}

/* ------------------------------------------------------------------ */
/* Leitura (linhas do banco → conteúdo resolvido)                      */
/* ------------------------------------------------------------------ */

/** Time dono do site público. Pode ser trocado por VITE_SITE_TEAM_ID. */
export const SITE_TEAM_ID: string =
  (import.meta.env?.VITE_SITE_TEAM_ID as string | undefined) || "00000000-0000-0000-0000-000000000001";

export interface SiteContentRow {
  key: string;
  type: string;
  value_json: unknown;
  updated_at?: string;
}

/** Só os campos que a definição declara entram. O resto do que vier do
 *  banco é descartado de propósito: a linha é JSON livre. */
function cleanList(value: unknown, def: SiteFieldDef): SiteListItem[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter((v): v is Record<string, unknown> => !!v && typeof v === "object")
    .map((v) => {
      const item: SiteListItem = {
        title: typeof v.title === "string" ? v.title : "",
        desc: typeof v.desc === "string" ? v.desc : "",
      };
      if (def.itemImage) item.image = typeof v.image === "string" ? v.image : "";
      if (def.itemTag) item.tag = typeof v.tag === "string" ? v.tag : "";
      if (def.itemBullets) item.bullets = typeof v.bullets === "string" ? v.bullets : "";
      return item;
    });
}

/** Valida o valor salvo contra o tipo do campo; null = inválido (usa padrão). */
function parseValue(def: SiteFieldDef, value: unknown): unknown {
  if (def.type === "list") return cleanList(value, def);
  return typeof value === "string" ? value : null;
}

/** Mescla as linhas do banco com o padrão. Chaves desconhecidas são ignoradas. */
export function resolveSiteContent(rows: SiteContentRow[] | null | undefined): SiteContent {
  const byKey = new Map((rows ?? []).map((r) => [r.key, r]));
  const out = structuredClone(SITE_DEFAULTS) as unknown as Record<string, Record<string, unknown>>;
  for (const section of SITE_SECTION_DEFINITIONS) {
    for (const field of section.fields) {
      const row = byKey.get(siteFieldKey(section.key, field.name));
      if (!row) continue;
      const parsed = parseValue(field, row.value_json);
      if (parsed != null) out[section.key][field.name] = parsed;
    }
  }
  return out as unknown as SiteContent;
}

/* ------------------------------------------------------------------ */
/* Escrita (conteúdo editado → linhas)                                 */
/* ------------------------------------------------------------------ */

export interface SiteContentUpsert {
  key: string;
  type: SiteFieldType;
  value_json: unknown;
}

export interface SiteContentChanges {
  upserts: SiteContentUpsert[];
  /** Campos que voltaram ao padrão: a linha é apagada. */
  deletes: string[];
}

function sameValue(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Diferença entre o rascunho e o que está publicado.
 * Campo igual ao padrão não é gravado (a linha é removida se existir), para
 * que ajustes futuros no padrão em código continuem chegando no site.
 */
export function diffSiteContent(
  draft: SiteContent,
  published: SiteContent,
  existingKeys: Iterable<string>,
): SiteContentChanges {
  const existing = new Set(existingKeys);
  const upserts: SiteContentUpsert[] = [];
  const deletes: string[] = [];
  const d = draft as unknown as Record<string, Record<string, unknown>>;
  const p = published as unknown as Record<string, Record<string, unknown>>;
  const def = SITE_DEFAULTS as unknown as Record<string, Record<string, unknown>>;
  for (const section of SITE_SECTION_DEFINITIONS) {
    for (const field of section.fields) {
      const key = siteFieldKey(section.key, field.name);
      const next = d[section.key][field.name];
      if (sameValue(next, def[section.key][field.name])) {
        if (existing.has(key)) deletes.push(key);
        continue;
      }
      if (existing.has(key) && sameValue(next, p[section.key][field.name])) continue;
      upserts.push({ key, type: field.type, value_json: next });
    }
  }
  return { upserts, deletes };
}

export function siteSectionEqual(a: SiteContent, b: SiteContent, section: SiteSectionKey): boolean {
  return sameValue(a[section], b[section]);
}

export function siteContentEqual(a: SiteContent, b: SiteContent): boolean {
  return SITE_SECTION_KEYS.every((k) => siteSectionEqual(a, b, k));
}

/* ------------------------------------------------------------------ */
/* Apoio à renderização                                                */
/* ------------------------------------------------------------------ */

/** Divide um richtext em parágrafos (linha em branco separa). */
export function splitParagraphs(text: string): string[] {
  return (text ?? "")
    .split(/\r?\n\s*\r?\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export type ContactIconKind = "instagram" | "phone" | "mail" | "map" | "link";

/** Ícone do canal de contato a partir do link. */
export function contactIconKind(href: string): ContactIconKind {
  const h = (href ?? "").toLowerCase();
  if (h.includes("instagram.com")) return "instagram";
  if (h.startsWith("mailto:")) return "mail";
  if (h.includes("wa.me") || h.includes("whatsapp") || h.startsWith("tel:")) return "phone";
  if (h.includes("maps.") || h.includes("goo.gl/maps") || h.includes("/maps")) return "map";
  return "link";
}
