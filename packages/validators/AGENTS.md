# AGENTS.md

## Escopo

Estas regras valem para `packages/validators`, pacote de schemas Zod e tipos compartilhados.

## Contratos compartilhados

- Trate schemas Zod como contrato entre API, web e mobile.
- Nao altere payload publico sem revisar rotas, tipos gerados, estados de UI, mocks e testes dos consumidores.
- Prefira nomes de schema alinhados ao recurso e operacao, como `createStudentSchema` e `updateStudentSchema`.
- Exporte novos schemas pelo `src/index.ts` quando forem usados fora do pacote.
- Evite duplicar regra de validacao em apps; centralize aqui quando a regra for contrato compartilhado.

## Evolucao de schemas

- Mudancas opcionais devem preservar compatibilidade quando possivel.
- Breaking changes precisam ser explicitas e acompanhadas das alteracoes em API e frontend/mobile no mesmo ciclo.
- Use refinements apenas quando a regra nao puder ser expressa por tipos Zod simples.
- Mensagens de validacao devem ser estaveis quando forem assertadas por testes ou exibidas na UI.

## Testes e verificacao

- Testes devem validar entradas validas e invalidas sem depender de outros casos.
- Rode `pnpm.cmd --filter @muvit/validators test` quando alterar schemas.
- Rode `pnpm.cmd --filter @muvit/validators typecheck` quando alterar tipos inferidos ou exports.
