# MUV-35 — Plano de implementação

**Objetivo:** migrar Hoje e a visão geral do treino para a UI/UX v2 aprovada, preservando estados, cache, progresso e início/retomada existentes.

**Escopo:** somente o fluxo mobile do aluno coberto por MUV-35. Nenhuma mudança em API, banco, contratos compartilhados ou regras da sessão. A ação de exercício mantém detalhes contextuais já disponíveis no app; não adiciona mídia ou novas dependências.

**Referência:** [Spec MUV-35](../specs/2026-10-13-muv-35-aluno-hoje-visao-geral-design.md).

## Plano e andamento

- [x] Conferir a issue MUV-35, os limites do handoff visual e as telas/estados já existentes.
- [x] Isolar a consulta de Hoje em hook reutilizando loader, query key, journal e armazenamento existentes.
- [x] Migrar Hoje para primitives v2, mantendo disponível, retomada, conclusão local, descanso/sem plano, loading, erro, retry e cache offline.
- [x] Migrar a visão geral, com resumo, lista de exercícios, retorno contextual, retry sem reentrada e início da sessão.
- [x] Preservar detalhes do exercício por contexto de identidade/dia/origem, sem modificar contrato HTTP ou regra de treino.
- [x] Cobrir estados e navegação com testes unitários e de componente.
- [x] Validar manualmente em Android, incluindo iniciar, salvar e sair, retomar no mesmo exercício e encerrar sem submeter séries.
- [x] Inspecionar layouts em 320, 390 e 430 dp; em 430 dp, ampliar escala de fonte para 1,5.
- [x] Rodar as verificações finais após a remoção dos artefatos fora de escopo; registrar resultados e limitações na capsule.
- [x] Revisar o diff final de forma independente, corrigir o achado de cache obsoleto e repetir testes, typecheck, lint, cobertura e export Android.
- [x] Publicar a branch e abrir [PR #23](https://github.com/leonardoslima/muvit/pull/23) para `develop`; CI verde em Biome, testes mobile, build e TypeScript. Encaminhar MUV-35 para revisão humana. Não fazer merge nem concluir a issue.

## Focos de revisão

1. Mudança de identidade ou dia não deve reapresentar seleção/contexto anterior.
2. Retry não deve duplicar operação nem esconder conteúdo ou CTA quando há dados.
3. Estados vazios e de erro devem manter título, navegação e ação de recuperação acessíveis.
4. Exercício aberto por Hoje ou visão geral deve retornar à origem; entrada direta deve ter fallback seguro.
5. Layout pequeno e fonte ampliada devem permitir alcançar a lista final e o CTA.

## Comandos-alvo

Executar testes, typecheck, lint e export Android do workspace mobile; executar checks de validators/API/web apenas se o diff final tocar esses contratos. Executar `git diff --check`, busca por escapes Unicode em arquivos textuais alterados e validação do fluxo Maestro. Registrar evidência Android real, limitações do Maestro/ADB e revisão do SHA publicado em `docs/muv-35-result-capsule.md`.
