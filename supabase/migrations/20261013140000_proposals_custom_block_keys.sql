-- Blocos personalizados do PDF da proposta (estudo de viabilidade,
-- linha do tempo, cartões) escolhidos em cada proposta.
--
-- Os blocos ficam em proposal_blocks com chave "custom-<tipo>-<id>" (a
-- tabela já aceitava qualquer chave). Esta coluna guarda quais deles
-- entram nesta proposta. NULL = proposta sem escolha salva (as antigas):
-- entram os blocos marcados "Incluir por padrão".
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS custom_block_keys jsonb DEFAULT NULL;
