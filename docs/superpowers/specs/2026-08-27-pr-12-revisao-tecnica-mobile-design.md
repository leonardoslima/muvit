# Correções da revisão técnica da PR 12

## Objetivo

Corrigir os riscos introduzidos pela PR 12 no fluxo guiado de treino mobile: retomada offline, conclusão durável, duração ativa, vínculo de identidade Better Auth, inset da tab bar e execução reproduzível dos testes na CI.

## Escopo

- `apps/mobile`: domínio da sessão guiada, persistência local, fila de conclusão, cliente HTTP, integração das telas e padding das telas dentro de tabs.
- `.github/workflows/ci.yml`: execução da suíte mobile em pull requests.
- Testes unitários e de integração que reproduzam os cenários apontados na revisão.

As dívidas anteriores à PR permanecem fora do escopo, exceto quando a mudança é necessária para fechar uma invariante desta correção. Em particular, não será criado endpoint atômico nem chave de idempotência na API nesta entrega.

## Decisões arquiteturais

### Registro durável da sessão

O storage deixará de persistir somente `GuidedSession` e passará a persistir um registro versionado com proprietário, snapshot validado do `WorkoutDay` e sessão ativa. O snapshot é a fonte necessária para renderizar e validar uma retomada sem rede.

O parser aceitará o formato legado atual. Quando houver um cache de Hoje compatível, o registro legado poderá ser promovido ao formato novo sem perder séries. Sem snapshot local compatível, o fluxo poderá consultar a API; falha de rede nesse caso continuará sendo apresentada como indisponibilidade porque não há dados suficientes para executar o treino com segurança.

Invariantes:

- Um registro ativo válido contém dados suficientes para abrir a sessão sem request de rede.
- Proprietário e `workoutDayId` do registro devem corresponder à identidade e rota solicitadas.
- Payload inválido não pode ser usado parcialmente.
- Migração não pode apagar um rascunho válido apenas porque os novos campos ainda não existiam.

### Relógio de tempo ativo

`GuidedSession` passará a manter:

- `activeDurationMs`: soma dos intervalos ativos já encerrados;
- `activeSinceMs`: início do intervalo ativo atual, ou `null` quando a sessão estiver pausada.

Na criação, o acumulado será zero e `activeSinceMs` receberá o horário inicial. “Salvar e sair” encerrará o intervalo ativo antes da persistência. A retomada iniciará outro intervalo sem alterar exercício, série ou fase. O resumo usará o acumulado mais o intervalo corrente e manterá o limite atual de 1 a 600 minutos.

Rascunhos legados serão normalizados com `activeDurationMs = max(0, updatedAtMs - startedAtMs)` e `activeSinceMs = null`. O tempo histórico exato anterior à migração é irrecuperável; a normalização preserva somente o intervalo observável e não conta o período após o último salvamento.

### Journal de conclusão

A fila offline será evoluída para um journal versionado de operações de conclusão. Cada operação conterá identificador local, proprietário Better Auth, data, payload e etapa durável:

- `create`: ainda precisa criar o workout log;
- `finish`: já possui `workoutLogId` e precisa executar somente o PATCH;
- `terminal`: o PATCH foi confirmado e a operação funciona como tombstone para a data.

O journal será persistido antes do primeiro efeito remoto. O ID retornado pelo POST será persistido antes do PATCH. Qualquer operação existente para o mesmo proprietário, data e `workoutDayId` impedirá que um rascunho antigo seja oferecido ou submetido novamente. Uma operação terminal deixará de bloquear um novo ciclo quando a data mudar e poderá ser removida após reconciliação online.

Invariantes:

- Falha ao persistir a operação ocorre antes de qualquer POST.
- Replay na etapa `finish` nunca repete o POST.
- Trocar de usuário não permite que B processe operações de A.
- Falha ao remover o rascunho não reabilita “Continuar treino” nem uma segunda conclusão.
- Atualizações read-modify-write do journal são serializadas para evitar perda entre enqueue, avanço de etapa e drain.

Permanece uma janela residual entre o servidor aceitar o POST e o aparelho persistir o `workoutLogId`. Garantia estrita de exatamente uma criação exige idempotência ou operação atômica no servidor e será documentada como risco residual.

### Requisições vinculadas à sessão Better Auth

O `ApiClient` oferecerá um requester vinculado que captura o cookie autenticado uma vez por operação. POST e PATCH usarão esse mesmo cookie, mesmo se a sessão global mudar durante a execução.

O drain receberá o `authUserId` autenticado e processará somente itens desse proprietário. Um 401 tardio do cookie capturado não poderá encerrar uma sessão diferente que tenha se tornado atual.

### Integração da sessão guiada

Ao carregar:

1. consultar o registro local;
2. se houver operação de conclusão para usuário, data e dia, não restaurar o rascunho;
3. se houver registro ativo com snapshot válido, retomar localmente e atualizar em segundo plano apenas quando seguro;
4. se houver registro legado, tentar migrar com cache local compatível e recorrer à API somente quando necessário;
5. criar e persistir nova sessão apenas quando não existir rascunho ou conclusão pendente.

Ao concluir:

1. validar fase e séries;
2. calcular o resumo;
3. persistir a operação `create` no journal;
4. apresentar resumo local e tentar avançar a operação;
5. persistir cada transição antes da próxima request;
6. tentar remover o rascunho, mantendo o journal como proteção caso a remoção falhe.

### Tab bar flutuante

O componente compartilhado `Screen` detectará o contexto da bottom tab bar e acrescentará ao `ScrollView` o inset retornado pelo React Navigation mais o espaçamento da barra flutuante. Fora das tabs, nenhum padding adicional será aplicado. O safe area existente continuará responsável pelo inset nativo; ele não será somado novamente.

As telas afetadas são Hoje, Progresso e Perfil. Rotas fora de `(tabs)` não devem ganhar espaço extra.

### CI

O workflow executará `pnpm --dir apps/mobile test` em pull requests, com dependências instaladas pelo mesmo lockfile usado nos jobs existentes. Build, lint e typecheck atuais serão preservados.

## Tratamento de erros

- Falha de storage antes de registrar a conclusão impede o envio e mantém a ação disponível para retry.
- Falha de transporte após journal persistido mantém a operação para drain e exibe conclusão enfileirada.
- Falha ao remover rascunho após conclusão exibe aviso, mas o tombstone impede nova submissão.
- Registro ou snapshot inválido não é executado; o usuário recebe o estado de erro já adotado pelo fluxo.
- Operações de outro usuário permanecem intocadas até o proprietário autenticar novamente.

## Estratégia de testes

Cada comportamento será implementado em RED-GREEN-REFACTOR.

- Sessão: pausa, retomada e soma de dois intervalos ativos.
- Storage: round-trip do formato novo, migração legada e rejeição de owner/snapshot/tempo inválidos.
- Retomada: API indisponível com snapshot e rascunho válidos abre o treino.
- Tombstone: envio confirmado, falha em `removeItem`, remount e total de POSTs igual a um.
- Journal: persistência antes do POST, avanço `create -> finish -> terminal`, replay somente do PATCH e isolamento entre usuários.
- API: cookie capturado permanece igual nas duas etapas e 401 tardio não encerra outra sessão.
- UI: telas dentro das tabs recebem inset suficiente; telas fora das tabs não recebem.
- CI: o workflow passa a executar a suíte mobile.

## Verificação

- Testes direcionados após cada ciclo TDD.
- `corepack.cmd pnpm --dir apps/mobile test`.
- `corepack.cmd pnpm --dir apps/mobile test:coverage:core`, mantendo no mínimo 85%.
- `corepack.cmd pnpm --dir apps/mobile typecheck`.
- `corepack.cmd pnpm --dir apps/mobile doctor`.
- `corepack.cmd pnpm lint` quando houver mudança no workflow ou formatação compartilhada.
- Busca por sequências `\\u` seguidas de quatro dígitos hexadecimais nos arquivos alterados.
- Inspeção manual em uma plataforma Expo, se o ambiente gráfico estiver disponível.

## Critérios de aceitação

1. “Continuar treino” funciona sem rede quando o rascunho novo ou migrável possui snapshot válido.
2. Uma conclusão persistida ou enfileirada não pode ser submetida novamente após remount, mesmo se a limpeza do rascunho falhar.
3. O tempo fora do treino depois de “Salvar e sair” não integra `durationMin`.
4. POST e PATCH de uma operação usam a mesma sessão capturada, e o replay respeita o proprietário.
5. Ações e conteúdo final de Hoje, Progresso e Perfil ficam acima da tab bar flutuante.
6. A suíte mobile é reproduzida pela CI.
7. Contratos existentes da API e do banco permanecem inalterados.

## Riscos residuais explícitos

- Sem idempotência no servidor, um crash após POST aceito e antes da persistência do ID ainda pode duplicar a criação no replay.
- O cache de Hoje continua sem partição por data; o journal usa data para não transformar essa dívida em bloqueio permanente.
- Rascunhos legados sem snapshot e sem cache compatível não podem ser retomados offline com segurança.
