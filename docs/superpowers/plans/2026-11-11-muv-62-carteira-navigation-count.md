# Navegação e contagem da carteira — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. O coordenador integra e revisa; somente ele faz commit, push e PR.

**Goal:** Permitir percorrer toda a carteira com busca e filtros, distinguir total global de resultados e tornar explícito o acesso à carteira pelo dashboard.

**Architecture:** Paginação server-side de 50 itens em `/students`, dirigida por `page` na URL e convertida para `offset` no loader existente. Contagem global obtida em consulta sem filtros somente quando houver busca/filtro. Dashboard permanece uma prévia de cinco alunos com CTA explícito para a carteira completa.

**Tech Stack:** Next.js, TypeScript, SDK existente, Testing Library/Vitest e Playwright pelo runner isolado.

**Spec:** Aceite MUV-62 fornecido no briefing; origem em `docs/operations/auditoria-funcional-muv-10.md`, achados F08–F10. As decisões abaixo são propostas do planejador dentro da autorização autônoma, sujeitas à revisão do coordenador.

## Restrições globais

- Escopo web, branch `muv-62`, sem nova dependência, alteração de API, schema ou SDK gerado. Preservar tratamento de erros já existente.
- UTF-8 literal, regras de `AGENTS.md` e `apps/web/AGENTS.md`; artefatos em `artifacts/muv-62/<execucao>/` conforme `docs/operations/qa-artifacts.md`.
- Workers não fazem commit, push, PR, merge ou alterações no Linear. Não ler `.env`. Não iniciar auxiliares por rotina.

## Evidência estática e escolhas de design

Inspeção em 11/11/2026, HEAD `1b1bae4e5429e38b36492b5b4288e0055cf0b63d`, branch `muv-62`, status inicialmente limpo. Não foram executados testes, builds ou QA nesta etapa.

- `src/lib/student-list.ts` consulta `limit: 50` sem offset; `/students/page.tsx` não oferece paginação e rotula `response.total` filtrado como cadastrados.
- `src/components/student-list-table.tsx` mostra “1”, “2”, “Anterior” e “Próxima”, mas links abrem `/students`. `loadDashboardStudentList` carrega cinco alunos e detalhes por aluno.
- `src/app/(app)/students/_search.tsx` faz replace com debounce de 300 ms, inclusive ao montar e mudar outros parâmetros. Isso exige proteção para não apagar a página recém-navegada ou restaurar uma busca antiga ao voltar no histórico.
- Contrato `packages/validators/src/students.ts`: `q`, status, limit 1–100, offset >= 0; total é filtrado. Repositório API aplica filtros ao count e ordena por nome. Nenhuma mudança de contrato é necessária.
- Testes atuais de dashboard ficam em `src/app/(app)/dashboard/page.test.tsx`; factories de aluno são locais aos testes. Reutilizar essas estruturas sem refatoração global.

Alternativas consideradas: (1) carregar toda a carteira no cliente adiciona tráfego e duplica filtros; rejeitada. (2) paginar também o dashboard exige estado e consultas adicionais para detalhes; válida, mas amplia a mudança. (3) paginação real apenas na carteira, dashboard como prévia explicitamente rotulada; escolhida por corrigir o engano sem ampliar o custo do dashboard.

Decisões de UX:

- `/students?page=2&q=Ana&status=paused` preserva busca/status em Anterior/Próxima. Página 1 pode omitir `page`. URL é fonte do estado; nada de cache/local state paralelo para página.
- Mostrar “Página X de Y” e intervalo “Mostrando A–B de N alunos” para os resultados. Zero: “Mostrando 0 de 0 alunos”, sem próxima página. Controles indisponíveis são botões disabled, nunca links sem destino válido.
- Cabeçalho conserva “N alunos cadastrados” para o total global. Com filtro ou busca, texto adicional “M alunos encontrados” (singular correto) identifica o total filtrado; não confundir com itens carregados.
- Vazio com q ou status: “Nenhum aluno encontrado para os filtros aplicados.” e sem CTA de primeiro cadastro. Carteira global zero sem filtros conserva o estado/CTA atual.
- Dashboard: manter “Mostrando K de N alunos”, remover todos os controles aparentes de paginação e inserir link “Ver todos os alunos” para `/students` quando ready, inclusive carteira pequena/vazia. Preservar Filtrar e erro/retry existentes.
- `page` ausente, negativo, zero, decimal, texto ou não seguro vira 1. Página acima do último resultado é limitada à última página válida pelo loader, com no máximo uma nova consulta; UI usa página efetiva. Sem loop caso haja mutação concorrente. Filtro ou busca alterado reinicia página 1; montagem e troca só de página não disparam reset.

## Review Focus

1. Montar busca na página 2 não deve apagar `page` após debounce (tarefa 2).
2. Voltar/avançar no navegador deve sincronizar input e URL sem restaurar termo antigo (tarefa 2 e E2E).
3. Página inválida ou carteira reduzida entre consultas não pode criar loop/offset inseguro (tarefa 1).
4. Falha na consulta global não pode produzir total inventado ou vazio verdadeiro (tarefa 1 e 2).
5. Nomes empatados e inserções simultâneas podem deslocar registros entre offsets; não prometer snapshot consistente nem ordenação por ID inexistente no contrato (risco abaixo).

## Tarefa 1: Contrato web de paginação e contagens

**Files:** modificar `apps/web/src/lib/student-list.ts` e `apps/web/src/lib/student-list.test.ts`. Criar `apps/web/src/application/students/student-list-navigation.ts` e `.test.ts` para parsing/hrefs puros, sem React/SDK.

**Interfaces:** `StudentListQuery` recebe `page?: number`, além de q/status. Estado ready preserva `items` e `total` (filtrado) e acrescenta `portfolioTotal: number`, `page: number`, `pageSize: number`. Exportar `parseStudentListPage(value: string | undefined): number` e `buildStudentListHref(query: StudentListQuery): string`; importação de tipo apenas permitida. Href usa URLSearchParams, omite página 1 e preserva caracteres especiais. Loader chama SDK com q/status, limit 50, offset `(page - 1) * 50`, nunca envia `page` à API.

- [ ] Escrever testes RED: página 2 envia offset 50 e preserva q/status; total 52 e 2 itens resultam em page 2/pageSize 50; sem filtros portfolioTotal=total sem consulta extra; filtros resultam em total 2 e portfolioTotal 52 por consulta sem q/status com limit 1/offset 0. Erro/throw em qualquer consulta necessária produz estado error existente.
- [ ] Testar parsing de undefined/0/-1/1.5/abc/Infinity/inteiro não seguro => 1, `2` => 2. Garantir offset seguro. Testar URL roundtrip com `Ana & Cia`, status e página 2.
- [ ] Testar página 999 com total 52 reconsulta offset 50 e retorna page 2; total zero retorna page 1 sem loop. Simular segunda resposta esvaziada por exclusão concorrente: encerra sem terceira consulta.
- [ ] Rodar `pnpm --dir apps/web test src/lib/student-list.test.ts src/application/students/student-list-navigation.test.ts`; confirmar falha pelas novas assertions antes de implementar.
- [ ] Implementar interfaces e comportamento mínimo acima, preservando erros. Normalizar também page recebida diretamente pelo loader, não apenas pela rota.
- [ ] Repetir o comando e exigir todos os testes verdes. Não alterar testes de erros para tolerar zero inventado.

## Tarefa 2: Navegação e apresentação da carteira e dashboard

**Files:** modificar `apps/web/src/app/(app)/students/page.tsx`, `page.test.tsx`, `_search.tsx`, `_search.test.tsx`, `apps/web/src/components/student-list-table.tsx`, `apps/web/src/app/(app)/dashboard/page.test.tsx`.

**Interfaces:** StudentsPage recebe `page?: string` em searchParams, usa parsing/helper da tarefa 1 e estado efetivo do loader. StudentSearch mantém interface sem props; compara termo digitado com termo atual da URL antes de navegar. Alterar só page/status pela URL não é mudança de termo. Sincronizar input com q em navegação externa sem efeito que reescreva q antigo. Se houver alteração de status por controle existente, limpar page nesse ponto; não adicionar seletor novo só para este card.

- [ ] RED em page.test: total global 52 + total filtrado 2 mostram os dois textos, nunca “2 alunos cadastrados”; página 1 mostra 50 e próxima com page=2; página 2 mostra 2 e anterior preservando q/status, sem próxima ativa. Cobrir 0, 1, 50 e 51 e página efetiva após clamp. Retry preserva page/q/status. Filtro sem resultados não oferece primeiro cadastro; falha não renderiza contagem/paginação falsa.
- [ ] RED em _search.test: alterar busca em page=2 remove page e preserva status após 300 ms; limpar busca também reseta; montagem em page=2 e rerender só de page não chamam replace; rerender com novo q sincroniza campo e não reverte URL após timers. Atualizar expectativa antiga de replace redundante na montagem.
- [ ] RED em dashboard/page.test: com 0, 1 e 52 alunos há link “Ver todos os alunos” correto e não há “2”, “Anterior” ou “Próxima”; estado error conserva retry e não apresenta CTA/contagens de sucesso. Manter teste do carregamento limitado a cinco e detalhes existentes.
- [ ] Rodar `pnpm --dir apps/web test 'src/app/(app)/students/page.test.tsx' 'src/app/(app)/students/_search.test.tsx' 'src/app/(app)/dashboard/page.test.tsx'` e confirmar RED.
- [ ] Implementar controles acessíveis em nav com aria-label “Paginação de alunos”, indicador da página atual e botões disabled nas bordas, reutilizando Button/Link existentes. Implementar textos/preview e debounce definidos, sem alterar primitives.
- [ ] Repetir testes até GREEN; revisar teclado, foco visível e comportamento no navegador no gate seguinte.

## Tarefa 3: Prova de navegação real com mais de 50 alunos

**Files:** criar `apps/web/test/e2e/student-wallet.spec.ts`; reutilizar exports `test`, `expect`, `loginAs` de `fixtures.ts`. Não alterar runner: config atual executa todos os `*.spec.ts` em `--scenario all`.

- [ ] Escrever E2E antes da implementação das tarefas 1/2 quando operacionalmente possível e registrar RED funcional, distinto de erro de setup. Conta própria via fixture; criar 52 alunos por API com nomes únicos ordenáveis `Carteira 001` a `Carteira 052`, todos `status: paused`. Status não ativo evita limite do plano free legitimamente; não editar banco/plano nem exceder limite de ativos. Guardar IDs e verificar cada resposta.
- [ ] Entrar no dashboard, verificar prévia de 5/52, ausência de falsa paginação, clicar “Ver todos os alunos”. Validar 50 na primeira página e 2 na segunda, abrir perfil do aluno 052 e retornar; unir os IDs/hrefs das duas páginas e exigir 52 distintos iguais aos criados, não apenas contagem visual.
- [ ] Em `status=paused`, navegar próxima/anterior preservando status; buscar prefixo comum para manter 52 resultados, navegar página 2 e preservar q/status. Recarregar e verificar mesma página; voltar/avançar histórico sem input/URL divergirem.
- [ ] Buscar aluno 052 a partir da página 2: página reinicia em 1, aluno aparece, total global continua 52 e encontrados=1. Buscar termo ausente: encontrados=0, total global=52, mensagem filtrada sem CTA de primeiro cadastro e sem próxima ativa. Limpar busca e recuperar navegação da carteira.
- [ ] Executar `pnpm web:e2e --scenario all --artifact-scope muv-62` com portas livres e exclusivas conforme `docs/operations/web-e2e.md`. Registrar cenário novo realmente descoberto/executado e saída final; runner-only green não substitui cenário. Se necessário, ampliar timeout apenas desse teste para setup de 52 POSTs, preservando assertions.
- [ ] Capturar dashboard, páginas 1/2 e vazio filtrado apenas com dados artificiais em artifacts da execução. QA visual real no navegador Orca pelo responsável: conferir links, busca, contagens e teclado. Infra indisponível => NOT_PROVEN, manter primeiro erro e informar coordenador; não usar serviços compartilhados.

## Gates e revisão própria

- [ ] `pnpm --dir apps/web test` — suíte web sem regressão.
- [ ] `pnpm --dir apps/web test:coverage:core` — piso local 85%; `pnpm --dir apps/web test:coverage:ui` — cobertura visual crítica conforme configuração existente.
- [ ] `pnpm --dir apps/web typecheck` e `pnpm exec biome check apps/web` — exit 0. `pnpm --dir apps/web build` no gate de integração quando não conflitar com instância Next da worktree; não presumir que E2E dev prova build de produção.
- [ ] Examinar `git diff --check`, status e diff limitado ao objetivo. Buscar escapes com `rg -n '\\u[0-9a-fA-F]{4}'` nos arquivos textuais alterados; corrigir acentos escapados. Coordenador executa commit e revisão independente na HEAD integrada.

Revisão de aceite: carteira >50 e preservação de filtros cobertas pelas tarefas 1–3; controles claros do dashboard pela tarefa 2 e E2E; contagens global/filtrada pela tarefa 1/2 e busca zero/um no E2E; prova com 52 sintéticos pela tarefa 3. Nenhum aceite depende de alteração da API. Não há incerteza material que justifique outro worker nesta etapa.

Riscos: duas contagens em requests distintos não são snapshot transacional; empates de nome e mutações simultâneas podem deslocar offsets porque API ordena só por nome. Preservar contrato e registrar limite, escalar se teste demonstrar bloqueio material. A consulta global adicional pode falhar; manter erro explícito em vez de inventar total. Reset de busca precisa distinguir edição de navegação externa para evitar loops, coberto por timers e navegador. Gates e screenshots acima são trabalho futuro, não validação executada pelo planner.
