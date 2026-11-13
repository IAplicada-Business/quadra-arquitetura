# Como contribuir

Antes de mexer no código, leia [docs/README.md](docs/README.md) e, se for o caso, as regras da área em [docs/business-rules.md](docs/business-rules.md).

## Fluxo

1. Crie uma branch a partir de `main`.
2. Faça a mudança. Regras de cálculo vão em `src/lib/` como funções puras, com teste em `src/test/`.
3. Rode `npm run lint` e `npm test`.
4. Atualize a documentação na mesma mudança (veja [docs/CONTRIBUTING-DOCS.md](docs/CONTRIBUTING-DOCS.md)). A pasta `docs/` é em inglês; este arquivo e o README são em português.
5. Abra o pull request descrevendo o que mudou e por quê.

## Regras importantes

- Nunca coloque valores de `.env`, chaves ou segredos no código, nos docs ou em commits. Use só os nomes das variáveis.
- Toda tabela nova precisa de RLS com política de time (`get_team_user_ids()`). Veja [docs/data-model.md](docs/data-model.md).
- Regras que sempre precisam valer devem ficar também em trigger ou constraint no banco.
- Nova rota da área logada: coloque dentro de `ProtectedRoute` em `src/App.tsx` e mapeie em `src/lib/pagePermissions.ts`.
- Não edite `src/integrations/supabase/client.ts` (gerado).
- Edge Functions novas: decida a autenticação no código e registre `verify_jwt` em `supabase/config.toml`.
- Textos de interface em português (pt-BR). Identificadores seguem o padrão existente.

## Dúvidas e problemas encontrados

Registre em [docs/open-questions.md](docs/open-questions.md) quando achar algo estranho que não vai corrigir agora.
