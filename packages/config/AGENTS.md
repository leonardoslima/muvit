# AGENTS.md

## Escopo

Estas regras valem para `packages/config`, pacote de configuracoes compartilhadas do monorepo.

## Configuracoes compartilhadas

- Trate alteracoes aqui como impacto transversal; revise consumidores antes de mudar defaults.
- Prefira extensao de configs existentes a criar arquivos paralelos com pequenas variacoes.
- Mudancas em TypeScript, Vitest ou ferramentas devem ser compatíveis com API, web, mobile, db e validators.
- Nao adicione dependencia nova para configuracao sem necessidade comprovada.
- Se uma configuracao for especifica de um workspace, mantenha-a no workspace em vez de generalizar para este pacote.

## Verificacao

- Rode a verificacao do workspace consumidor afetado pela mudanca.
- Para mudancas amplas, rode `pnpm.cmd typecheck` ou `pnpm.cmd test` no monorepo quando o custo for justificavel.
