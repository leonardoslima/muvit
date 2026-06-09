# AGENTS.md

## Escopo

Estas regras valem para `apps/api/src/modules/auth` e complementam `apps/api/AGENTS.md`.

## Autenticacao e autorizacao

- Mantenha regras de autenticacao em casos de uso ou servicos injetados; rotas devem apenas validar payload, chamar caso de uso e traduzir erro.
- Nao exponha `passwordHash`, secrets, refresh tokens brutos ou detalhes internos em respostas HTTP.
- Senhas devem passar pelos helpers existentes de hashing e verificacao; nao chame bibliotecas de hash diretamente em casos de uso novos.
- Tokens JWT devem ser emitidos e verificados pelos helpers existentes em `src/lib/tokens.ts` ou por portas injetadas equivalentes.
- Payloads de token devem continuar pequenos e explicitos: `sub`, `role` e metadados realmente necessarios.
- Respeite os papeis `trainer` e `student`; novas regras de permissao devem deixar claro qual papel pode executar cada acao.
- Falhas esperadas de login, refresh token, duplicidade de e-mail e usuario inexistente devem usar `UseCaseError` com codigo traduzivel na borda HTTP.
- Nao diferencie mensagens de credenciais invalidas de forma que permita enumeracao de e-mails.

## Repositorios e contratos

- O contrato `AuthRepository` deve expor somente operacoes necessarias para os casos de uso de autenticacao.
- Implementacoes concretas de persistencia devem ficar em `repositories/drizzle-*.ts`.
- Tipos de entrada publica devem vir de `@muvit/validators` quando houver schema compartilhado.
- Ao alterar signup, login, refresh ou usuario atual, atualize schemas, respostas de rota e consumidores web/mobile no mesmo ciclo.

## Testes

- Testes de auth devem criar usuarios no proprio caso ou helper chamado pelo caso.
- Cubra sucesso, credenciais invalidas, duplicidade, refresh invalido e diferencas de papel quando a regra mudar.
- Nao use dados compartilhados entre testes para simular sessao autenticada.
