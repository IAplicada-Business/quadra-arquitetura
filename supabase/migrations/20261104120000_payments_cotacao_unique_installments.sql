-- Aprovação de parcelas da cotação: impedir duplicação e permitir source='cotacao'.
--
-- 1) O CHECK original de payments.source só aceitava 'escritorio' e 'obra',
--    mas a aprovação da cotação grava source='cotacao'.
-- 2) Uma parcela da cotação por (obra, número da parcela): dois cliques ou
--    duas abas não conseguem mais gerar parcelas em dobro.
-- 3) Resposta do cliente no portal: uma por (relatório, pendência), com upsert
--    no edge function submit-client-response.
-- Verificado em produção antes de escrever: 0 duplicatas em ambos os casos.

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_source_check;
ALTER TABLE public.payments
  ADD CONSTRAINT payments_source_check CHECK (source IN ('escritorio', 'obra', 'cotacao'));

CREATE UNIQUE INDEX IF NOT EXISTS payments_cotacao_installment_uniq
  ON public.payments (project_id, installment_number)
  WHERE source = 'cotacao';

CREATE UNIQUE INDEX IF NOT EXISTS client_pending_responses_item_uniq
  ON public.client_pending_responses (weekly_report_id, pending_item);
