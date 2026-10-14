# MUV-35 — Aluno: Hoje e visão geral do treino v2

## Objetivo e limites

Migrar o fluxo mobile do aluno entre Hoje e a visão geral do treino para o Pen aprovado, preservando os comportamentos e contratos que já existem. A issue [MUV-35](https://linear.app/muvit/issue/MUV-35/migrar-aluno-hoje-e-visao-geral-do-treino-para-uiux-v2) foi consultada em 13/10/2026. A aprovação humana ocorre na PR, sem merge.

A execução reutiliza loaders, cache, journal, armazenamento e navegação existentes. Não altera API, banco, schemas compartilhados, autenticação, seleção de treino, regras de conclusão/sincronização, Progresso, avaliações ou perfil. A ação de exercício preserva a exibição contextual existente; não adiciona mídia nem dependências.

## Fontes de design e código

- `AGENTS.md`, `apps/mobile/AGENTS.md` e os requisitos correntes da issue MUV-35.
- `docs/mobile-v2-foundation.md`, `docs/mobile-v2-design-gate.md` e `docs/mobile-v2-student-today.md`.
- `assets/design/mobile.pen`, acessado em cópia temporária via `pen interactive`; o original não foi alterado.
- Quadros do Pen inspecionados: `pSQsB`, `FYxOo`, `wauwJ`, `Zc8xa`, `aXvE4`, `ZOLSM`, `W1Xnpl` e `MOT1w`. As capturas dos quadros são referência, não evidência do app Android.
- Implementação anterior de Hoje/visão geral, loaders, journal e estado de sessão.

## Estrutura

`Screen` continua responsável pelos safe areas e inset da tab bar. Hoje e visão geral usam primitives `src/components/ui/v2` e tokens de `src/lib/design-system/tokens.ts`; shell e outras abas não mudam.

A consulta de Hoje vive em `src/lib/use-today-workout.ts`, mantendo query key `['today-workout', authUserId]`, fallback offline, journal, serialização e proteção contra cancelamento. A tela conserva a precedência de conclusão local sobre rascunho e a limpeza condicional de dados antigos.

A lista compartilhada mostra preview em Hoje e prescrição na visão geral. Ela recebe o dia carregado e navega pelo ID da prescrição; não consulta API nem modifica progresso. A tela contextual do exercício resolve primeiro o cache da origem particionado por identidade e dia, validando o ID da prescrição, e usa o loader existente como fallback.

## Hoje

Topo com marca, identidade real ou fallback neutro, título **Seu treino de hoje** e subtítulo aprovado. O estado disponível mostra resumo do treino e **Iniciar treino**. Um rascunho mostra **Continuar treino**, progresso textual/barra e próximo exercício/série. Conclusão local informa que foi salva e não oferece nova inicialização. Sem plano e dia de recuperação mostram seus estados vazios aprovados. Loading e erro sem dados mantêm header e navegação; erro oferece retry. Falha de atualização com dados preserva conteúdo e ações, indicando retry bloqueado durante a operação. Cache offline válido conserva o estado correspondente com mensagem contextual.

## Visão geral e detalhes do exercício

Visão geral sem tab bar, com voltar contextual para Hoje, título/subtítulo, resumo, lista detalhada com exercício, séries/repetições e descanso, e CTA **Iniciar treino** após a lista. Retry de erro de atualização preserva resumo e CTA. O início mantém a rota de sessão existente.

A linha de exercício abre detalhes em tela protegida fora das tabs, usando IDs e origem `today` ou `overview`, sem enviar objetos pela rota. O retorno usa histórico quando disponível e fallback seguro para Hoje quando a rota foi aberta diretamente. O título recebe foco ao entrar e a linha recupera foco ao voltar. A tela apresenta grupo muscular, prescrição, descanso e observação não vazia; não modifica a sessão.

## Layout e acessibilidade

Usar DM Sans, paleta, escala tipográfica, raios e espaçamento existentes. Base de 390 dp com gutter 16 dp, sem tamanho de viewport fixo. Validar 320 e 430 dp, fonte ampliada, rolagem até a última linha e CTA, alvos de toque, live regions e foco de navegação. `Screen` aplica safe areas/inset uma vez; CTA participa da rolagem e não encobre conteúdo.

## Verificação e entrega

Preservar testes de isolamento por identidade, retry, journal, rascunho, conclusão e cache. Testar Hoje, visão geral, navegação contextual, detalhes e retorno, sem alterar API/DB. Rodar verificações do workspace mobile e export Android. Para validação nativa, usar apenas o AVD e os serviços isolados desta execução; registrar limitações de automação e evidência visual na capsule. A revisão independente deve avaliar o diff contra MUV-35 no SHA publicado. Reabrir verificações afetadas se houver correção. Entregar PR para `develop`, CI verde e issue em revisão humana; não fazer merge.