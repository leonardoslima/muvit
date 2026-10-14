# MUV-37 — Progresso e avaliações do aluno v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar Progresso e Nova avaliação v2, com seleção cumulativa de fotos sem teto, conferência e remoção antes do envio.

**Architecture:** Ampliar somente a quantidade de fotos aceita pelo schema compartilhado, preservando rotas, payload e autorização. Concentrar seleção/envio em application e hook de borda, compartilhar a grade visual com defaults do professor preservados e compor as duas telas com primitives/tokens v2.

**Tech Stack:** TypeScript, Expo 54, React Native 0.81, Expo Router, Expo Image Picker 17, TanStack Query 5, NativeWind 4, Zod 3, Fastify 5, Drizzle, Vitest/RNTL, Biome e Maestro.

**Spec:** `docs/superpowers/specs/2026-10-14-muv-37-student-progress-assessments-design.md`.

## Global Constraints

- Não adicionar dependências, métricas, campos de entrada, filtros, paginação, metas, edição ou exclusão de avaliações.
- Não alterar Perfil, Hoje, sessão guiada, autenticação, ownership ou shell de navegação.
- Preservar TypeScript estrito, UTF-8 literal pt-BR, Zod, Vitest/RNTL e os padrões existentes.
- Usar primitives `src/components/ui/v2` e tokens `src/lib/design-system/tokens.ts`; não importar estilos/primitives legados nas telas migradas, exceto o wrapper estrutural `Screen` existente.
- Preservar DM Sans, gutter de 16 dp, ações principais de referência 58 dp, campos com mínimo 52 dp e alvos de ícone de 48 dp.
- Reservar safe area e tab bar uma única vez pelo `Screen`; não copiar alturas do canvas para a viewport.
- O GET continua `/students/me/assessments?limit=20`, query key `['assessments', 'me']`, na ordem recebida.
- O POST continua `/students/me/assessments`; fotos continuam URLs em `photos?: string[]`, com validação de URL e sem teto de quantidade no schema.
- Preservar data obrigatória, peso positivo até 500 kg, gordura entre 0 e 80% e observações até 2000 caracteres; altura e circunferências são somente leitura no aluno.
- Preservar upload → criação → invalidação → `Avaliação salva!` → `router.back()` após 150 ms; não prometer idempotência, fila offline ou limpeza de uploads órfãos.
- O professor continua selecionando no máximo três fotos, uma por vez; não ganha visor ou seleção múltipla por esta entrega.

Autorização registrada na spec supera o trecho original do ticket que proibia evolução do contrato de fotos. Não solicitar nova aprovação intermediária. Este planner não faz commits; o executor principal conserva os limites de Git/publicação do fluxo vigente.

## Review Focus

1. Resultado atrasado do picker durante envio/desmontagem não muda o snapshot nem causa atualização de tela encerrada — tarefa 5.
2. Oitava foto, URIs repetidas e remoção da primeira preservam ordem, contagem e acesso a cada imagem — tarefas 2, 3 e 5.
3. Falha depois de uploads parciais ou depois do POST conserva dados, sem prometer rollback ou duplicar automaticamente a operação — tarefas 2 e 5.
4. Retry sem dados sai do erro; falha de atualização conserva histórico ou orientação vazia anterior — tarefa 4.
5. Dimensões inválidas, fonte ampliada e viewport estreita não escondem imagem, unidade, upload ou ação de retorno — tarefas 3 e 6.

## Arquivos e responsabilidades

| Unidade | Arquivos |
| --- | --- |
| Contrato | Modificar `packages/validators/src/assessments.ts`; criar `packages/validators/src/assessments.test.ts`; modificar `apps/api/src/routes/assessments.test.ts` |
| Serviço do aluno | Modificar `apps/mobile/src/application/assessments/new-assessment.ts` e teste adjacente |
| Apresentação de fotos | Criar `apps/mobile/src/components/assessments/assessment-photo-grid.tsx` e teste adjacente; extrair visual de `trainer-assessment-photos.tsx`, preservando seu teste/API; criar `assessment-photo-viewer.tsx` e teste adjacente no mesmo diretório |
| Progresso | Criar `apps/mobile/src/application/assessments/student-progress.ts` e teste adjacente; criar `apps/mobile/src/components/assessments/student-assessment-card.tsx` e teste adjacente; modificar `apps/mobile/src/screens/progress.tsx` e teste adjacente |
| Formulário | Criar `apps/mobile/src/lib/use-new-assessment.ts` e teste adjacente; modificar `apps/mobile/src/screens/new-assessment.tsx` e teste adjacente |
| Integração | Regenerar SDK em `apps/web/src/lib/api` pela ferramenta existente; manter diff somente se houver alteração pertinente; criar fluxo `apps/mobile/test/student-progress-assessments/flow.yaml` e relatório `docs/muv-37-validation-report.md` |

Não modificar `assessment-photo-list.tsx`: seu consumidor professor usa apresentação 4:3 sem visor. A grade nova atende seleção compartilhada e leitura do aluno. `AssessmentMetric` e `AssessmentMeasurementsCard` existentes são consumidos, não redesenhados. API de produção, schema de banco e migrations não precisam mudar se os testes confirmarem o fluxo existente.

## Tarefa 1 — Ampliar contrato com compatibilidade downstream

**Files:** validator/teste novo e teste HTTP listados acima. Referências: `apps/api/src/routes/assessments.ts`, repositório Drizzle de avaliações e `packages/db/src/schema/assessments.ts`. Consumidores: `apps/mobile/src/application/assessments/assessment-form.test.ts`, `apps/mobile/src/screens/trainer-new-assessment.test.tsx`, `apps/web/src/application/assessments/assessment-form-data.test.ts`, `apps/web/src/app/(app)/students/[id]/assessments/actions.test.ts`.

**Interfaces:** `createAssessmentSchema` e `updateAssessmentSchema` mantêm exports/tipos; `photos` continua array opcional de URLs, sem máximo. Response e JSONB conservam seus tipos.

- [ ] Escrever testes de schema chamados `aceita oito e muitas URLs sem teto de produto` e `preserva validação de URL e limites dos demais campos`. Asserções centrais:

```ts
const photos = Array.from({ length: 8 }, (_, index) => `https://cdn.test/${index}.jpg`);
expect(createAssessmentSchema.safeParse({ date: '2026-10-14', photos }).success).toBe(true);
expect(updateAssessmentSchema.safeParse({ photos }).success).toBe(true);
expect(createAssessmentSchema.safeParse({ date: '2026-10-14', photos: ['inválida'] }).success).toBe(false);
```

- [ ] Parametrizar ausência, `[]`, uma, seis, oito e 100 URLs; exigir falha para peso 501, gordura 81, data inválida e observações com 2001 caracteres.
- [ ] Adicionar ao teste HTTP existente `aluno cria e consulta avaliação com oito fotos em ordem` e `atualização conserva oito URLs`; usar `signupStudent`/`signupTrainer` e `createStudent`, com dados próprios por teste. Exigir 201/200 e array idêntico no GET e PATCH; URL inválida deve retornar 400. Preservar testes existentes de isolamento/papéis.
- [ ] Executar `pnpm.cmd --filter @muvit/validators test` e `pnpm.cmd --dir apps/api test src/routes/assessments.test.ts`; confirmar falha por quantidade antes da alteração. API exige `.env.test` e banco de teste preparados pelo executor; não contornar o script de migration/teste nem usar banco de produção.
- [ ] Remover somente `.max(6)` de `photos` em `packages/validators/src/assessments.ts`; não remover `.url()`, mudar opcionais nem criar schema paralelo para esconder divergência.
- [ ] Reexecutar os dois comandos e `pnpm.cmd --filter @muvit/validators typecheck`, `pnpm.cmd --dir apps/api typecheck`; esperar todos verdes.
- [ ] Com a API atualizada servindo OpenAPI, executar `pnpm.cmd --dir apps/web api:gen`; revisar diff gerado. Tipos já usam `Array<string>` e podem não mudar. Executar `pnpm.cmd --dir apps/web test src/application/assessments/assessment-form-data.test.ts "src/app/(app)/students/[id]/assessments/actions.test.ts"` e `pnpm.cmd --dir apps/web typecheck`. Não modificar SDK manualmente nem incorporar churn sem relação.

## Tarefa 2 — Seleção normalizada e envio de todas as fotos

**Files:** `apps/mobile/src/application/assessments/new-assessment.ts` e `.test.ts`.

**Interfaces:** manter `AssessmentPhotoInput`, `toOptionalNumber`, `toSupportedContentType` e `submitAssessment`. Alterar `AssessmentFormValues` para `{ date: string; weightKg: string; bodyFatPct: string; notes: string; photos: readonly AssessmentPhotoInput[] }`. `buildAssessmentPayload(input: { date: string; weightKg: string; bodyFatPct: string; notes: string; photoUrls?: readonly string[] }): CreateAssessmentInput` usa o tipo existente de `assessment-data.ts`. Criar `normalizeAssessmentPhotoSelection(assets: readonly { uri?: string; mimeType?: string }[]): AssessmentPhotoInput[] | null`; `null` significa lote inválido. `submitAssessment` continua `Promise<void>` e recebe os mesmos adaptadores `api`, `uploadPhoto`, `invalidateAssessments`.

- [ ] Adaptar testes antigos de uma foto para `photos: [photo]`, sem perder assertions de parsing/vírgula, trim, ausência de foto, POST self-scoped e invalidação.
- [ ] Adicionar testes `normaliza lote JPEG/PNG em ordem sem deduplicar`, `rejeita lote misto inteiro sem URI ou MIME válido`, `envia oito fotos sequencialmente na ordem` e `não cria quando falha o segundo upload`. No terceiro, exigir oito chamadas de upload, POST com as oito URLs, e eventos `upload-1 ... upload-8, post, invalidate`; no quarto exigir zero POST/invalidação e nenhuma tentativa de upload da terceira foto.
- [ ] Cobrir rejeição do POST e rejeição da invalidação separadamente; ambas propagam erro, e a segunda não repete POST. Cobrir ausência de URLs como `photos: undefined`, nunca `['']`.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/application/assessments/new-assessment.test.ts`; confirmar RED pela nova interface/comportamento.
- [ ] Implementar helpers e upload com laço sequencial; manter payload e upload fora da screen. Não adicionar imports nativos em application, novos limites, deduplicação, retries automáticos ou limpeza remota.
- [ ] Reexecutar teste específico; esperar GREEN. Executar regressão `pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-form.test.ts src/lib/uploads.test.ts` para verificar auxiliares compartilhados preservados.

## Tarefa 3 — Grade compartilhada e conferência nativa

**Files:** novos `assessment-photo-grid.tsx/.test.tsx`, `assessment-photo-viewer.tsx/.test.tsx` e wrapper existente `trainer-assessment-photos.tsx`.

**Interfaces:** exportar `AssessmentPhotoGrid(props: AssessmentPhotoGridProps): React.JSX.Element`, com `photos: readonly { uri: string }[]`, `disabled?: boolean`, `onOpen?: (index: number) => void`, `onAdd?: () => void`, `onRemove?: (index: number) => void`, `maxPhotos?: number`, `addLabel?: string`, `emptyHint?: string`, `description?: string`, `testID?: string`. Ausência de `maxPhotos` significa sem teto; ausência dos callbacks oculta a ação correspondente. Exportar `AssessmentPhotoViewer(props: { photos: readonly string[]; index: number | null; onIndexChange: (index: number) => void; onClose: () => void }): React.JSX.Element | null`. Índice nulo/inválido não abre Modal. O wrapper do professor mantém assinatura atual e passa máximo três, cópias atuais e `trainer-assessment-photo-grid`.

- [ ] Escrever testes da grade para oito imagens mais upload, leitura sem adicionar/remover, abertura com índice correto, exclusão da primeira/última e URIs repetidas. Exigir `Remover foto N`, alvos 48 dp e estilo do círculo/X aprovado; disabled não chama callbacks. Eventos de load com largura/altura zero, NaN ou ausente mantêm fallback 1:2; dimensões válidas atualizam proporção.
- [ ] Escrever testes do visor para `Foto 1 de 8`, próxima/anterior, extremos desabilitados, uma imagem sem controles, imagem `contain`, `onRequestClose` Android e índice inválido. Exigir ausência de upload/remoção/download/compartilhamento.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/components/assessments/assessment-photo-grid.test.tsx src/components/assessments/assessment-photo-viewer.test.tsx`; confirmar RED antes de implementação.
- [ ] Extrair a grade real do professor para o componente compartilhado, mantendo layout medido em duas colunas/gap existente e fallback; reaproveitar tokens, Text, IconButton/Header/Button v2. Tornar upload sempre disponível no aluno, na próxima célula, inclusive em disabled; aplicar círculo Upload verde claro conforme Pen. Manter estilos específicos do professor por props/classes locais do wrapper quando necessário para não redesenhá-lo.
- [ ] Implementar visor com Modal, safe area nativa e Header contextual; manter foco acessível no contexto modal e retorno para o controle originador quando viável. Não usar router ou criar rota. Navegação não faz wrap.
- [ ] Reexecutar testes novos e `pnpm.cmd --dir apps/mobile test src/components/assessments/trainer-assessment-photos.test.tsx src/components/assessments/assessment-readout.test.tsx src/screens/trainer-new-assessment.test.tsx`; esperar GREEN e manutenção de seleção individual/máximo três no professor.

## Tarefa 4 — Progresso v2 com medidas existentes, fotos e estados

**Files:** `student-progress.ts/.test.ts`, `student-assessment-card.tsx/.test.tsx`, `src/screens/progress.tsx/.test.tsx`.

**Interfaces:** `buildStudentProgressReadout(assessment: Assessment, previousAssessment?: Assessment): StudentProgressReadout`, com `StudentProgressReadout = { dateLabel: string; weightLabel: string; bodyFatLabel: string; weightComparison?: string; bodyFatComparison?: string; heightLabel?: string }`; `Assessment` vem de `assessment-data.ts`. `StudentAssessmentCard(props: { assessment: Assessment; previousAssessment?: Assessment; onOpenPhoto: (index: number) => void }): React.JSX.Element`. `ProgressScreen` preserva seu export/rota. Grade/visor vêm da tarefa 3; índice e conjunto aberto pertencem à apresentação da screen.

- [ ] Acrescentar testes puros de DD/MM/AAAA e fallback de data, decimal pt-BR, nulo/inválido sem zero inventado, gordura zero válida, métricas parciais e comparações adjacentes sem pular registro. Exigir `2 kg a menos`, `2 p.p. a mais`, `Sem alteração em kg`; sem referência/valor ausente, comparação é `undefined`.
- [ ] Acrescentar testes de card para altura/circunferências somente recebidas, ausência de seção vazia, observações longas sem truncamento, oito fotos e abertura de cada índice sem remover anexos. Preservar testID `assessment-card-${assessment.id}`.
- [ ] Ampliar testes existentes da screen: endpoint exato e ordem; erro inicial → retry pendente mostra loading, sem erro/segunda ação concorrente; falha de atualização com histórico conserva card e Message/Tentar novamente; resposta vazia anterior + falha conserva orientação; Nova avaliação permanece visível em todos os estados.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/application/assessments/student-progress.test.ts src/components/assessments/student-assessment-card.test.tsx src/screens/progress.test.tsx`; confirmar RED. Para refresh, expor QueryClient na fixture e invalidar/refetch a query real; não mockar a decisão de estado da própria screen.
- [ ] Implementar formatter puro e card v2; reutilizar as composições de métricas existentes onde coincidirem com Pen. Screen mantém GET/query key atuais, ordenação recebida e uma recuperação com guard síncrono. Diferenciar ausência de resposta de resposta vazia; `isFetching` sem dados prevalece no retry. Message v2 fornece ação integrada com mínimo 48 dp; não manter StatePanel sobre histórico em falha de refresh.
- [ ] Conectar grade de leitura/visor e Nova avaliação à rota existente; retirar padding inferior local duplicado. Reexecutar testes específicos e `pnpm.cmd --dir apps/mobile typecheck`; esperar GREEN.

## Tarefa 5 — Formulário v2, picker cumulativo e estados de envio

**Files:** `src/lib/use-new-assessment.ts/.test.tsx` e `src/screens/new-assessment.tsx/.test.tsx`.

**Interfaces:** `useNewAssessment(): UseNewAssessmentResult` retorna `{ values: AssessmentFormValues; submitting: boolean; picking: boolean; success: boolean; error: string | undefined; setField: (field: 'date' | 'weightKg' | 'bodyFatPct' | 'notes', value: string) => void; addPhotos: () => Promise<void>; removePhoto: (index: number) => void; submit: () => Promise<void> }`. Hook consome tarefa 2, `useApiClient`, picker, query client, upload e timer; screen consome hook/grade/visor e mantém somente índice do preview. `NewAssessmentScreen` conserva export/rota.

- [ ] Escrever testes do hook ou por screen com dependências reais do hook mockadas: seleção de oito + segunda seleção acrescenta em ordem; cancelar preserva tudo; lote inválido preserva anterior e mostra cópia da spec; picker rejeitado libera bloqueio; remoção renumera e última limpa; picker concorrente abre uma vez.
- [ ] Testar resultado atrasado do picker após iniciar envio e após desmontagem; não alterar snapshot nem criar nova operação. No envio, capturar cópia de valores/fotos; editar um campo enquanto pendente não altera payload enviado. Usar promises controladas e `act`, não sleeps arbitrários.
- [ ] Atualizar testes existentes para plural `Adicionar fotos`, prévias e payload com oito URLs. Cobrir falhas de upload/POST/invalidação preservando campos/fotos, mensagem `Não foi possível salvar sua avaliação.`, ação habilitada para novo envio e ausência de retorno indevido. Cobrir dupla chamada síncrona de submit, não somente botão disabled.
- [ ] Cobrir sucesso com ações adicionar/remover/salvar desabilitadas, `Avaliação salva!` antes de `router.back()`, retorno após 150 ms e cancelamento do timer ao desmontar. Campos mantêm comportamento editável do aluno, sem copiar bloqueio total do professor.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/lib/use-new-assessment.test.tsx src/screens/new-assessment.test.tsx`; confirmar RED.
- [ ] Implementar hook usando guard/ref síncrono para picker e submissão e proteção de montagem/resultado obsoleto. Usar opções exatas do picker da spec; não solicitar câmera, criar limite de seleção nem ativar crop junto com múltipla seleção. Preservar cópias de erro/sucesso e API self-scoped.
- [ ] Compor formulário sem Card extra onde Pen apresenta campos diretos, com Header contextual, Field v2, grade, Message v2 e Button v2. Usar KeyboardAvoidingView e rolagem com teclado na borda; se necessário, acrescentar prop opcional `keyboardShouldPersistTaps` ao `Screen` existente, default preservado, sem wrapper de navegação novo. Em tal caso, adicionar teste em `apps/mobile/src/components/ui/screen.test.tsx` antes da extensão e executar regressões dos consumidores do wrapper.
- [ ] Conectar preview sem perder valores/scroll; back Android fecha o visor antes de sair. Botão salvar tem único indicador loading e label `Salvando avaliação...`. Reexecutar testes novos/alterados e `pnpm.cmd --dir apps/mobile typecheck`; esperar GREEN.

## Tarefa 6 — Integração, evidência nativa e documentação final

**Files:** fluxo Maestro e relatório da tabela; handoff `docs/mobile-v2-student-progress.md` somente para registrar implementação/contrato atual sem apagar histórico aprovado. Testes adjacentes só recebem correções de lacunas observadas, sem nova funcionalidade.

**Interfaces:** app/API integrados das tarefas 1–5; rotas existentes `/progress` e `/new-assessment`; appId e URL Expo devem vir da instância realmente usada pelo executor. Não copiar porta do fluxo foundation como se fosse a atual.

- [ ] Executar `pnpm.cmd --filter @muvit/validators test`, `pnpm.cmd --filter @muvit/validators typecheck`, `pnpm.cmd --dir apps/api test src/routes/assessments.test.ts src/routes/uploads.test.ts` e `pnpm.cmd --dir apps/api typecheck`; esperar GREEN. Rodar demais testes API se o diff efetivo alcançar módulos além do contrato.
- [ ] Executar `pnpm.cmd --dir apps/mobile test`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile test:coverage:core`, `pnpm.cmd --dir apps/mobile test:coverage:ui` e `pnpm.cmd --dir apps/mobile doctor`; esperar testes/types verdes, cobertura mínima 85% e doctor sem impedimento não explicado. Não reduzir pisos.
- [ ] Executar Biome nos arquivos de código efetivamente alterados com `pnpm.cmd exec biome check <arquivos>`; executar `git diff --check` e `rg -n '\\u[0-9a-fA-F]{4}' <arquivos-textuais-alterados>`. Corrigir escapes usados para acentuação e erros de whitespace. Não formatar o monorepo inteiro.
- [ ] Reutilizar as exportações PNG dos frames `R8DMP`, `YQWga`, `ZCD1f` e `bUVFV` já confirmadas pelo executor principal; consultar os demais estados Pen necessários por MCP e comparar composição real antes das capturas finais. Não editar o `.pen` nem apresentar screenshot de design como execução do app. Registrar indisponibilidade do MCP se ocorrer.
- [ ] Criar fluxo Maestro real em `apps/mobile/test/student-progress-assessments/flow.yaml`: login aluno no ambiente autorizado → Progresso → Nova avaliação → campos com vírgula → biblioteca → selecionar oito imagens → adicionar mais uma seleção → abrir primeira/última → voltar → remover primeira e depois última remanescente em cenário próprio → cancelar biblioteca → selecionar novamente → salvar → retorno Progresso → abrir foto registrada. Usar imagens sintéticas de teste no dispositivo, nunca dados pessoais reais; não introduzir bypass de auth/dados em produção. Quebrar o fluxo em cenários no mesmo diretório se o seletor do SO exigir preparação distinta.
- [ ] Executar `maestro test apps/mobile/test/student-progress-assessments/flow.yaml` na instância preparada pelo executor. Capturar loading/vazio/erro/retry, falha com dados, formulário vazio/preenchido/oito fotos, visor, envio/erro/sucesso e retorno. Estados de rede devem ser provocados no ambiente de teste de forma controlada; não afirmar cenário não observado.
- [ ] Inspecionar Android em larguras representativas 320/390/430 dp, fonte ampliada, teclado aberto, observações longas, leitura de tela/labels, botão de retorno nativo e rolagem até upload/salvar. Registrar configuração efetiva e limitações; não alterar recursos globais de dispositivo sem ownership do executor. RNTL não substitui este gate visual.
- [ ] Atualizar handoff e `docs/muv-37-validation-report.md` com autorização da mudança de schema, inexistência de migration, compatibilidade professor/web, ordem de disponibilização API antes do app, SHA observado, comandos/exit codes, capturas e cenários não reproduzidos. Não declarar pronto se Android/visual permanecerem bloqueados; devolver evidência ao executor principal para o fluxo de revisão vigente.

## Self-review do plano

A spec está coberta pelas tarefas: contrato/rollout em 1 e 6; seleção/envio em 2 e 5; fotos/visor em 3; histórico/medidas/estados em 4; ergonomia e comparação Pen em 5 e 6. Cada tarefa de produto começa com comportamento RED e termina com GREEN específico; tarefas de integração registram evidência real. As cinco condições de Review Focus possuem testes ou inspeção explícitos nas tarefas responsáveis. Interfaces usam tipos existentes e não introduzem módulo de domínio dependente de React Native.

Nenhum teste de implementação ou execução Android foi realizado pelo planner. Os documentos orientam o executor; a inspeção visual do Pen, disponibilidade dos serviços de teste e resultados das verificações devem ser confirmados por ele. Não há bloqueio de produto pendente após a autorização recebida.
