-- Cenários orçamentários na Trilha do Cliente: validade da proposta e
-- nota da disciplina.
--
-- As duas colunas existem por causa de uma pergunta que a tela de
-- cenários não conseguia responder: "esse preço ainda vale?". Sem
-- `valid_until`, o cliente compara quatro propostas sem saber que duas
-- venceram, decide com base num número que o fornecedor já não honra e
-- descobre na contratação. A data é o que separa um comparativo de uma
-- foto antiga.
--
-- `note` é o espaço do escritório para dizer o que a tabela não diz —
-- por que o vidro insulado custa 71% mais, o que a montagem não inclui,
-- qual proposta pedir para revalidar. É o bloco "Análise" da referência.
--
-- Ambas são opcionais e sem default: linha antiga continua válida, e o
-- portal já trata nulo (sem selo de validade, sem nota).

alter table public.budget_quotes
  add column if not exists valid_until date;

comment on column public.budget_quotes.valid_until is
  'Até quando o fornecedor segura este preço. Nulo = sem prazo informado.';

alter table public.scope_items
  add column if not exists note text;

comment on column public.scope_items.note is
  'Observação da equipe sobre a disciplina, exibida ao cliente na análise de cenários.';

-- A tela do cliente filtra por projeto e ordena pelo vencimento mais
-- próximo; sem o índice isso é varredura na tabela toda de cotações,
-- que já passa de trezentas linhas num projeto só.
create index if not exists budget_quotes_project_valid_until_idx
  on public.budget_quotes (project_id, valid_until)
  where valid_until is not null;
