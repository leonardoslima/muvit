# MUV-14 — E2E Android dos fluxos principais

Data: 2026-10-21. Base inspecionada: `84ccb13`, branch `test/muv-14-e2e-mobile`.

## Objetivo e limites

Entregar uma execução local reproduzível com Maestro no Android real, API Fastify e PostgreSQL exclusivos da execução. Cobrir aluno (login, treino atual, séries/repetições/carga, conclusão e acompanhamento) e professor (login, home, aluno vinculado, avaliação e alteração essencial de prescrição), verificando persistência e isolamento por identidade.

A execução autônoma foi autorizada; a skill `muvit-autonomous` determina spec e plano sem aprovação humana intermediária. Esta especificação não autoriza merge. Correções funcionais, mudanças de UX, novos contratos, migrations e obrigatoriedade de E2E no CI ficam fora do escopo. Falha de produto comprovada deve ser registrada separadamente e apresentada como bloqueio do cenário, sem relaxar a asserção. A execução demonstrou uma necessidade de build: declarar diretamente `@babel/plugin-transform-react-jsx@7.28.6` em devDependencies do mobile, versão já existente no lockfile, porque o preset NativeWind usa o plugin por nome e a resolução no contexto do app falhava. O bundle Android foi exportado com sucesso após essa declaração; nenhuma biblioteca de produto foi adicionada.

A suíte é permanente e organizada por funcionalidade em `.maestro/mobile/`, conforme orientação explícita do usuário. Identificadores de issue ficam nesta documentação histórica e nas evidências; testes, fixtures, nomes de cenários e recursos padrão são genéricos. Mudanças futuras nos fluxos devem criar ou atualizar E2E quando necessário, conforme a regra adicionada ao `AGENTS.md` raiz.

## Contexto observado

- `.maestro/login-aluno.yaml`, `muv-35-aluno-hoje.yaml` e `muv-36-aluno-sessao-guiada.yaml` já usam Expo Go, textos acessíveis e credenciais por ambiente. O fluxo MUV-36 para antes da conclusão e descarta o treino; não comprova persistência no servidor.
- `apps/mobile/app.json` define `com.anonymous.muvit`, scheme `muvit`; os fluxos existentes usam `host.exp.exponent`. O runner deve aceitar appId e URL de abertura; Expo Go é o caminho inicial desta entrega, sem dependência nativa nova.
- A aba `Progresso` exibe avaliações. A contagem de treino está em `Hoje → Sua evolução → NA SEMANA`, alimentada por `/students/me/workout-evolution?date=YYYY-MM-DD`. Não há requisito de inventar uma listagem de treinos na aba Progresso.
- Better Auth cria conta e perfil distintos. `apps/api/test/helpers/auth.ts` resolve `profileId` por `authUserId` no banco. POST `/students` cria aluno vinculado ao professor, sem conta autenticável; isso basta para a jornada do professor.
- O seed demo cria muitos dados e publica mídia R2. Não será chamado. O catálogo global não tem endpoint público de criação; uma fixture de teste pode inserir um único exercício global pelo schema existente, como os testes atuais fazem.

## Abordagens consideradas

1. **Runner Node + fixtures pequenas + Maestro (escolhida):** controla recursos próprios, prepara domínio majoritariamente por HTTP, usa UI nas ações de aceite e valida o resultado por HTTP. Mais manutenção que um YAML isolado, mas explicita pré-condições e permite rerun independente.
2. **Reutilizar seed demo e expandir YAMLs existentes:** menos preparação inicial, porém depende de mídia externa, dataset grande, contas compartilhadas e estado anterior; não satisfaz isolamento.
3. **Somente testes de integração Fastify/Vitest:** rápidos e úteis para contratos, mas não demonstram navegação, teclado, persistência do app reaberto nem comportamento Android; serão apoio e não substituto do Maestro.

## Estrutura e responsabilidades

| Arquivo | Responsabilidade |
| --- | --- |
| `scripts/mobile-e2e.mjs` | Runner Node sem nova dependência: parâmetros, preflight, recursos exclusivos, seleção de cenário, subprocessos, evidências, exit code e limpeza em `finally` |
| `scripts/mobile-e2e.test.mjs` | Verificações Node das decisões perigosas do runner, sem Docker/Android |
| `apps/api/test/e2e-mobile/fixtures.ts` | Preparar fixture e verificar estado por HTTP; adaptador mínimo de banco para exercício global e resolução de perfil |
| `apps/api/test/e2e-mobile/fixtures.test.ts` | Contratos de preparação, estado esperado e isolamento usando a infraestrutura Vitest existente |
| `.maestro/mobile/login.yaml` | Login parametrizado e abertura do runtime; compartilhado pelos cenários novos |
| `.maestro/mobile/aluno.yaml` | Jornada do aluno e reabertura sem apagar estado |
| `.maestro/mobile/professor.yaml` | Jornada do professor e reabertura sem apagar estado |
| `.maestro/mobile/isolamento.yaml` | Troca de contas e tentativas de acessar recursos de outra identidade |
| `docs/operations/mobile-e2e.md` | Pré-requisitos, comandos locais, diagnóstico, limites e localização das evidências |
| `package.json` | Atalho `mobile:e2e` para o runner |

Não alterar os YAMLs históricos para evitar mudar seus contratos e credenciais. Não adicionar testIDs ou mudar telas sem evidência de seletor acessível inviável; se isso ocorrer, discutir o menor ajuste com o executor.

## Recursos e dados

O runner recebe `--scenario aluno|professor|isolamento|all`, `--mode android|api-only`, `--device <serial>`, `--app-id`, `--launch-url` e portas configuráveis. Padrões locais desta worktree: API 3344, Metro 8094, PostgreSQL 5444. Em modo Android exigir serial explícito, confirmar `adb -s <serial> emu avd name` e AVD exclusivo por `--avd-name` (padrão `muvit-mobile-e2e`; nesta execução usar `--avd-name muvit-muv-14`). Não escolher automaticamente o primeiro dispositivo.

Criar container PostgreSQL 16 com nome/banco `muvit_mobile_e2e_<runId>_test`, label da execução, porta publicada apenas em loopback e sem volume compartilhado. Recusar porta ocupada; não reaproveitar serviço encontrado. Aplicar migrations existentes com cwd `packages/db` e variáveis do processo filho. Iniciar API exclusiva em `NODE_ENV=test` e `API_HOST=127.0.0.1`, com Better Auth URL/origens exatas e placeholders locais para R2 sem fazer uploads; o default geral da API permanece `0.0.0.0`. Iniciar Metro do app desta worktree com `EXPO_PUBLIC_API_URL` apontando à API exclusiva; configurar `adb reverse` somente no serial confirmado. Não sobrescrever `.env` versionado ou local nem encerrar processos encontrados por porta.

Cada cenário possui dataset próprio e não depende de outro cenário ter rodado. Criar identidades Better Auth A/B com emails exclusivos do run e do cenário; realizar onboarding dos professores por HTTP. Resolver os perfis pela identidade, sem usar auth user ID como studentId. Inserir exercício global fictício mínimo sem mídia. Criar planos ativos via HTTP usando os contratos existentes. Data de referência vem do calendário local do dispositivo; falhar com diagnóstico se dispositivo e host estiverem em dias diferentes, para não semear um treino fora do dia observado.

Dados mínimos fixos:

- **Aluno:** aluno independente A e B; plano de A com um dia e um exercício, duas séries, reps prescritas `10`, carga `20`, descanso `0`. Registrar `(10 reps, 22 kg)` e `(8 reps, 18 kg)`, volume `364 kg`. Uma avaliação inicial de A com peso `70 kg` permite observar Progresso. B recebe plano e avaliação distintos para detectar vazamento.
- **Professor:** professores A/B, um aluno vinculado para cada um, plano de A com um dia/exercício, duas séries, reps `10`, carga `20`. Pela UI criar avaliação com peso `78,5 kg`, altura `170 cm`, observação fictícia ASCII `Avaliacao E2E`; depois alterar **carga prescrita de 20 para 24 kg**, preservando séries/reps.
- **Isolamento:** dataset próprio com alunos independentes A/B e professores A/B, cada professor com aluno vinculado e plano/avaliação próprios. Usar IDs reais de A com sessão de B para provar ownership, e testar papel student contra lista de alunos / papel trainer contra rotas self-scoped.

Senhas e cookies vivem somente na memória e no ambiente dos subprocessos; não imprimir, gravar em manifestos, capturar formulários preenchidos ou copiar `.env` para artefatos. Metadados não sensíveis (IDs, nomes fictícios, cenário, portas, SHA) podem ser persistidos. Fixture pode ser descartada junto do banco; não usar TRUNCATE em banco externo.

### Contrato das variáveis Maestro

O runner entrega as strings abaixo ao processo Maestro com prefixo `MAESTRO_` (por exemplo, `MAESTRO_E2E_STUDENT_EMAIL` e `MAESTRO_EXPO_URL`), exigido pelo autoimport de variáveis de shell da ferramenta. As credenciais não são passadas em argumentos CLI. Nomes/valores de entrada digitados pela fixture são ASCII para evitar limitações de `inputText`, enquanto textos do produto e documentação preservam pt-BR literal.

| Variável | Valor/uso |
| --- | --- |
| `EXPO_URL` | `exp://127.0.0.1:8094` por padrão; configurável |
| `E2E_APP_ID` | `host.exp.exponent` por padrão; configurável |
| `E2E_STUDENT_EMAIL`, `E2E_STUDENT_PASSWORD` | Credenciais do aluno independente A |
| `E2E_STUDENT_B_EMAIL`, `E2E_STUDENT_B_PASSWORD` | Credenciais do aluno independente B |
| `E2E_TRAINER_EMAIL`, `E2E_TRAINER_PASSWORD` | Credenciais do professor A |
| `E2E_TRAINER_B_EMAIL`, `E2E_TRAINER_B_PASSWORD` | Credenciais do professor B |
| `E2E_STUDENT_NAME` | Nome do aluno vinculado do professor A, prefixo `Aluno E2E A` e sufixo exclusivo |
| `E2E_PLAN_NAME`, `E2E_EXERCISE_NAME` | Nome do plano/exercício da jornada; únicos por cenário |
| `E2E_FOREIGN_STUDENT_ID`, `E2E_FOREIGN_PLAN_ID`, `E2E_FOREIGN_ASSESSMENT_ID`, `E2E_FOREIGN_DAY_ID` | Recursos de A usados por B no cenário isolamento |
| `E2E_FOREIGN_STUDENT_URL`, `E2E_FOREIGN_PLAN_URL`, `E2E_FOREIGN_ASSESSMENT_URL`, `E2E_FOREIGN_SESSION_URL` | URLs completas Expo Router de A para `openLink`, construídas com `EXPO_URL/--/` e os caminhos reais de `app/` |

O helper de login recebe overrides de `runFlow`: `E2E_EMAIL`, `E2E_PASSWORD`, `E2E_HOME` (`Hoje` ou `Início`) e `E2E_CLEAR_STATE` (`true` somente no primeiro login do cenário). A reabertura não chama login nem limpa estado. Data da avaliação usa hoje já preenchido na UI; o runner resolve YYYY-MM-DD para chamadas HTTP, sem variável de digitação de data.

O runner não grava stdout bruto das fixtures. Como Maestro pode incluir os valores de `inputText` em logs/JSON, sanitizar recursivamente suas saídas textuais por todos os valores de credenciais e cookies conhecidos antes de preservar/compartilhar resultados; capturas nomeadas só após login e fora do formulário preenchido. Nunca imprimir ambiente completo. O E2E é comando explícito e não inicia stack pelo `pnpm test` normal.

## Oráculos de aceite

### Aluno

1. Login real e assert de Hoje; abrir treino atual e visão geral. Entrar na sessão e registrar as duas séries pela UI, usando os campos acessíveis existentes.
2. Finalizar com `Concluir e finalizar treino`; observar `Treino concluído`, `Séries: 2`, `Volume total: 364 kg` e confirmação de sincronização. `Salvo neste aparelho` sozinho não aprova persistência.
3. Voltar a Hoje; observar evolução semanal de zero para um. Abrir Progresso e observar avaliação de 70 kg. Encerrar/reabrir app sem `clearState`; verificar sessão e dados novamente.
4. Via API, uma única conclusão no dia para o workoutDayId da fixture, `completed=true`, duas séries concluídas com pares exatos `(10,22)` e `(8,18)`, e `completedThisWeek=1`. Não conferir apenas HTTP 200.

### Professor

1. Login real, home `Início`, abrir alunos e selecionar aluno vinculado A. Criar avaliação com os valores fixados, voltar à lista e abrir o detalhe salvo.
2. Abrir treino do aluno, editar carga para 24, salvar e reabrir detalhe. Encerrar/reabrir app e revisitar avaliação e prescrição.
3. Via API autenticada como professor A, confirmar exatamente uma nova avaliação com valores/observação exatos e plano com carga 24, mantendo duas séries e reps 10. Como professor B, verificar que seu plano/avaliação não mudaram.

### Isolamento

UI: com aluno B, tentar deep link da sessão de A; deve haver bloqueio/estado indisponível ou retorno ao shell permitido, sem nome de exercício exclusivo de A. Com aluno, tentar rota de professor; shell de professor não aparece. Com professor B, tentar detalhe do aluno/avaliação/plano de A; bloquear ou exibir estado não encontrado sem valores de A. Trocar A→B usando logout real e login; `clearState` pode preparar o primeiro login de um cenário, mas não pode esconder falha de limpeza de conta durante a troca.

API: sem sessão obter 401; aluno chamar GET `/students` obter 403; professor chamar GET `/students/me/workout-plans` obter 403; aluno B ler plano/log/avaliação de A obter 404; professor B ler e tentar alterar plano/avaliação do aluno de A obter 404. Depois das tentativas de escrita, consultar com A e conferir conteúdo intacto. Usar cookies reais Better Auth, não headers de identidade simulada. Registrar o caso/rota/status sem cookie.

O dataset de isolamento cria explicitamente um log concluído de A por POST/PATCH da API para haver recurso real a tentar ler; essa preparação é exclusiva do cenário de isolamento e nunca substitui a conclusão via UI da jornada do aluno.

## Execução, falhas e verificação

Executar cada cenário individualmente e a suíte completa; repetir ao menos um cenário para mostrar que dados anteriores não afetam o resultado. `--mode api-only` valida preparação, contratos e negações HTTP sem dispositivo e deve declarar que não executou Maestro. Não apresentar esse modo como aceite Android.

Maestro deve usar seletores semânticos e espera por estado observável com limite; não sleeps longos, coordenadas do app ou etapas críticas opcionais. Overlays do Expo podem ter tratamento condicional restrito ao bootstrap. Falha crítica mantém saída não zero; não repetir uma mutação automaticamente para mascarar flake.

Salvar capturas nomeadas, logs sanitizados e relatório em `artifacts/mobile-e2e/<runId>/` por padrão, com `--artifact-scope muv-14` para as evidências desta entrega, conforme `docs/operations/qa-artifacts.md`. Reportar separadamente saída Maestro, assertivas HTTP, reabertura, checks estáticos e limites. Em `finally`, encerrar apenas subprocessos e container criados pelo run e remover seus reverses; preservar artefatos. O AVD pré-criado pelo executor não é propriedade do runner e permanece aberto.

Verificações pertinentes: `node --test scripts/mobile-e2e.test.mjs`, Vitest focado das fixtures com PostgreSQL isolado, Biome dos arquivos suportados, typecheck API quando fixture importar contratos, execução real dos três cenários e scan de escapes Unicode nos arquivos alterados. Sem nova dependência, workflow CI ou alegação de fidelidade visual.
