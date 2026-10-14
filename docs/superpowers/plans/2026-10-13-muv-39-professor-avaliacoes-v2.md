# MUV-39 — Professor: avaliações de alunos v2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar lista, detalhe e nova avaliação do professor ao Pen aprovado preservando todas as operações e estados existentes.

**Architecture:** Migrar as screens e componentes de apresentação existentes para tokens/primitives v2. Reutilizar TrainerScreen com extensões opcionais compatíveis e manter serviços, query keys, schema, upload, validação e rotas atuais. Acrescentar somente título responsivo e grade de fotos selecionadas do domínio.

**Tech Stack:** Expo SDK 54, React Native 0.81, Expo Router 6, React 19, TanStack Query 5, NativeWind 4, TypeScript, Zod, Vitest e React Native Testing Library existentes.

**Spec:** `docs/superpowers/specs/2026-10-13-muv-39-professor-avaliacoes-v2-design.md`.

## Global Constraints

- Sem dependências novas, alterações de API, schemas, autenticação, ownership, cache, regras de validação ou limites de fotos.
- Textos visíveis e documentação em pt-BR com UTF-8 literal, sem escapes Unicode de acentuação.
- Tokens canônicos de `src/lib/design-system/tokens.ts`, DM Sans, papel, verde profundo e lima da foundation.
- Primitives visuais de `src/components/ui/v2`; sem aliases ou shims para o legado.
- `Screen` mantém safe areas e inset da tab bar; não duplicar gutter, tab bar ou padding inferior nas screens.
- Gutter de 16 dp, campos de referência de 52 dp, CTA de referência de 58 dp e alvos de ícone de 48 × 48 dp; conteúdo pode crescer.
- Layout rolável em 320/390/430 dp, com fonte do sistema ampliada e teclado nativo.
- Fora de escopo: Home/alunos, treinos/exercícios, edição, exclusão, busca, filtros, gráficos, comparação, câmera, seleção múltipla, visor de fotos, fila offline, rascunho persistente e novos campos.

## Review Focus

- 404 após cache ou paginação deve ocultar todos os registros anteriores; cobrir nas tarefas 2/3.
- Avaliação de outro aluno não deve expor data, notas ou fotos; cobrir na tarefa 3.
- Fotos repetidas, dimensões inválidas e remoção da primeira devem preservar ordem/labels/proporção; cobrir na tarefa 4.
- Campos e retorno durante sucesso/invalidação devem ficar bloqueados, inclusive nos 150 ms; cobrir na tarefa 4.
- Mudanças opcionais de TrainerScreen não podem retirar atualização nem alterar retorno dos consumidores existentes; cobrir na tarefa 1.

## Preparação do executor

Ler spec, regras mobile e handoff da MUV-30. Reutilizar branch/worktree já escolhidas; não criar recursos novos. Confirmar arquivos `.env` ignorados copiados pelo executor principal antes de setup/testes/builds, sem imprimir valores. Cada implementador é responsável somente pelos arquivos atribuídos e deve preservar alterações concorrentes. Não executar commits pelo planner; commits abaixo pertencem ao executor principal após revisão de cada entrega.

### Tarefa 1: composição contextual e título responsivo

**Arquivos:** modificar `apps/mobile/src/components/trainer/trainer-screen.tsx` e teste adjacente; criar `apps/mobile/src/components/assessments/assessment-heading.tsx` e teste adjacente.

**Interfaces:** TrainerScreen mantém seus props e acrescenta `backLabel?: string`, `backDisabled?: boolean`, `onRefresh?: () => void`; defaults do retorno permanecem. `AssessmentHeading({ title: string; subtitle?: string }): React.JSX.Element` exporta título/contexto responsivos sem API/router.

- [ ] Escrever testes RED no wrapper: sem onRefresh não existe Atualizar; backLabel customizado é acessível; backDisabled bloqueia callback; defaults continuam Voltar para alunos e Atualizar. Preservar teste de overlay com exatamente um progressbar.
- [ ] Escrever teste RED do heading: `fireEvent(..., 'layout', { nativeEvent: { layout: { width: 288, height: 80, x: 0, y: 0 } } })` aplica 26 dp; largura 358 aplica 30 dp; título e subtítulo ficam presentes e sem numberOfLines.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/components/trainer/trainer-screen.test.tsx src/components/assessments/assessment-heading.test.tsx`; esperar falha pelas novas propriedades/comportamentos antes de implementar.
- [ ] Implementar somente extensões compatíveis; omitir action quando não houver onRefresh, encaminhar backDisabled ao Header e manter defaults. Heading usa `onLayout`, Text v2 e medidas da spec. Não alterar Header global nem Home/alunos.
- [ ] Reexecutar os dois testes; esperar PASS. Executar também `pnpm.cmd --dir apps/mobile test src/screens/trainer-home.test.tsx src/screens/trainer-students.test.tsx src/screens/trainer-student-detail.test.tsx` para demonstrar preservação dos consumidores.
- [ ] Revisar diff; executor principal pode comitar como `feat(mobile): preparar composição de avaliações v2 (MUV-39)`.

### Tarefa 2: histórico e estados de consulta

**Arquivos:** modificar `apps/mobile/src/screens/trainer-assessments.tsx`, teste adjacente, `apps/mobile/src/components/assessments/assessment-list-item.tsx` e teste adjacente.

**Interfaces:** consome TrainerScreen/AssessmentHeading da tarefa 1; preserva `AssessmentListItemProps = { assessment: Assessment; onPress: () => void }`. Mantém `listAssessments(api, { kind: 'student', studentId }, { limit: 25, offset, signal })` e query key atual.

- [ ] Adaptar testes RED: erro inicial tem Atualizar no header e nenhum Tentar novamente; loading tem retorno + refresh desabilitado + um progressbar; aluno inválido/404 têm retorno contextual + refresh desabilitado e nenhum botão de corpo. Retry pelo header refaz GET; retorno usa dismissTo correto.
- [ ] Acrescentar testes RED com promises adiadas: refresh mantém item e mostra overlay único; paginação usa somente Carregando mais... e não overlay; refresh e paginação bloqueiam concorrência; vazio tem exatamente um Nova avaliação. Preservar testes de 25 itens, offset acumulado, erro de página e 404 após cache/página.
- [ ] Atualizar teste do item: data e métricas pt-BR/nulas, duas linhas de notas, um único botão Abrir avaliação de DD/MM/AAAA, callback único e ausência de botão Abrir separado. Incluir texto longo para garantir ausência de truncamento nas métricas.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/screens/trainer-assessments.test.tsx src/components/assessments/assessment-list-item.test.tsx`; registrar RED esperado contra UI antiga.
- [ ] Migrar a screen para TrainerScreen contextual: title Aluno ou Alunos no fallback, backLabel correto, refetch protegido por studentId; usar StatePanel v2 sem action, Message v2 e Button v2. Com dados, ScrollView interno, Heading e CTA; remover padding inferior manual e Atualizar/Voltar duplicados. Overlay somente em refetch com dados, excluindo próxima página e estados indisponíveis.
- [ ] Migrar item para Card v2 acionável, ChevronRight decorativo e duas colunas flexíveis; raio/padding/fontes da spec. Preservar formatação de dados existentes, sem introduzir busca/comparação ou alterar total/getNextPageParam.
- [ ] Reexecutar os testes e esperar PASS. Conferir imports afetados sem `lib/styles`/primitives legados, mantendo somente Screen via wrapper.
- [ ] Revisar diff; executor principal pode comitar como `feat(mobile): migrar histórico de avaliações para v2 (MUV-39)`.

### Tarefa 3: detalhe, identidade e leitura de fotos

**Arquivos:** modificar `apps/mobile/src/screens/trainer-assessment-detail.tsx`, teste adjacente, `apps/mobile/src/components/assessments/assessment-metric.tsx`, `assessment-measurements-card.tsx` e `assessment-photo-list.tsx`; criar `apps/mobile/src/components/assessments/assessment-readout.test.tsx` para os três componentes de leitura.

**Interfaces:** consome tarefa 1. Preserva props públicas `AssessmentMetricProps`, `AssessmentMeasurementsCardProps` e `AssessmentPhotoListProps`; getAssessment e query key existentes. Não altera validators ou dados.

- [ ] Escrever/adaptar testes RED: header sempre preservado, recovery somente pelo Atualizar, sem botões duplicados; loading/refetch com um único progressbar; retorno Alunos sem studentId e Avaliações no contexto completo. Manter casos 404 após cache, dados nulos e nove medidas.
- [ ] Reforçar teste de outro aluno com notes e URL exclusivas: `queryByText`/`queryByLabelText` não encontram data/notas/fotos; Atualizar fica desabilitado. Testar ausência de seção Fotos quando URLs estão vazias e leitura de quatro URLs válidas sem teto de três.
- [ ] No readout, testar label/valor, somente medidas recebidas, Não informado sem medidas, Foto N visível, acessibilidade com data, `resizeMode === 'contain'`, `aspectRatio === 4 / 3` e ausência de ações de remoção.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/screens/trainer-assessment-detail.test.tsx src/components/assessments/assessment-readout.test.tsx`; esperar RED nos novos requisitos de header/contain/composição.
- [ ] Migrar screen para TrainerScreen + Heading, remover Cards e atualizar rodapé. Renderizar seções sobre papel, com linhas de métricas, preservando todas as condições de identidade/404 antes do conteúdo e as mensagens de erro atuais. Usar refetch protegido por IDs e refresh bloqueado em contexto indisponível.
- [ ] Migrar os três componentes de leitura para tokens/Text v2; manter nomes/props existentes. Métrica permite quebra de label/valor; fotos recebem label visível e contain no contêiner 4:3. Não adicionar IMC, visor, limite de leitura ou novas queries.
- [ ] Reexecutar testes; esperar PASS. Conferir texto longo e número zero válido sem convertê-lo em ausência; payload nunca é montado aqui.
- [ ] Revisar diff; executor principal pode comitar como `feat(mobile): migrar detalhe de avaliação para v2 (MUV-39)`.

### Tarefa 4: criação, seleção de fotos e estados de envio

**Arquivos:** modificar `apps/mobile/src/screens/trainer-new-assessment.tsx` e teste adjacente; criar `apps/mobile/src/components/assessments/trainer-assessment-photos.tsx` e teste adjacente. Não modificar application/validators/upload sem falha funcional comprovada fora da apresentação.

**Interfaces:** consome tarefa 1. Exporta `TrainerAssessmentPhotos({ photos: readonly AssessmentPhotoInput[]; disabled: boolean; onAdd: () => void; onRemove: (index: number) => void }): React.JSX.Element`. Dados e callbacks pertencem à screen; componente guarda somente proporção visual recebida por onLoad e não acessa picker/API/router.

- [ ] Escrever testes RED da grade: zero/uma/duas fotos mostram upload na próxima posição; três ocultam; Foto N e Remover foto N são únicos; callback recebe índice correto. Remover primeira/repetir URI preserva labels e chaves válidas. `fireEvent(image, 'load', { nativeEvent: { source: { width: 100, height: 200 } } })` resulta em aspectRatio 0,5; dimensão zero/NaN mantém fallback seguro. Em disabled, adicionar/remover não chamam callbacks e não dependem de opacidade.
- [ ] Adaptar testes RED de screen para nome Adicionar foto em qualquer seleção <3, retorno contextual sem Atualizar, placeholders da spec nos 12 numéricos e Observações, data local/IMC calculado e ausência de IMC no payload. Manter testes atuais de MIME, cancelamento, máximo três, remoção, validação anterior/posterior ao upload e preservação em falhas.
- [ ] Acrescentar/reter promises adiadas no POST e invalidação: nenhum campo/picker/remoção/retorno/submit efetivo enquanto pendente; sucesso transitório também bloqueia controles. Após conclusão, Avaliação salva! e dismissTo após 150 ms; nenhuma navegação adicional. Falha de invalidação conserva mensagem genérica existente, sem afirmar que o registro não foi criado.
- [ ] Executar `pnpm.cmd --dir apps/mobile test src/screens/trainer-new-assessment.test.tsx src/components/assessments/trainer-assessment-photos.test.tsx`; confirmar RED dos requisitos novos antes de implementar.
- [ ] Implementar grade conforme spec: duas colunas/gap 12, foto proporcional, rótulo abaixo, X sólido compacto/alvo 48, upload tracejado e contagem. Dimensões assíncronas da imagem nunca afetam seleção nem payload; proteger callback disabled também no componente.
- [ ] Migrar screen para TrainerScreen sem onRefresh, backDisabled conforme formDisabled e heading; manter estado/efeitos/sequência de submit atuais. Field v2 simples com teclado decimal e placeholders aprovados, seções sem cards, IMC somente leitura, Message v2 global e Button v2 com loading único. Remover label variável do picker e buttons largos de remoção.
- [ ] Inserir KeyboardAvoidingView na borda do conteúdo, comportamento nativo de iOS quando aplicável e ScrollView com keyboardShouldPersistTaps handled. Usar Screen/wrapper para insets, sem padding inferior duplicado. Se mock nativo precisar da nova exportação, limitar alteração de `apps/mobile/test/react-native.mock.ts` ao host necessário e declarar esse arquivo ao coordenador antes da edição.
- [ ] Reexecutar testes; esperar PASS. Reexecutar `pnpm.cmd --dir apps/mobile test src/application/assessments/assessment-form.test.ts src/application/assessments/assessment-data.test.ts` para confirmar contratos preservados.
- [ ] Revisar diff; executor principal pode comitar como `feat(mobile): migrar formulário de avaliação para v2 (MUV-39)`.

### Tarefa 5: revisão integrada e evidência nativa

**Arquivos:** documentação local `docs/mobile-v2-trainer-assessments.md` para registrar implementação/evidência real, se necessário; evidências externas ao diff conforme workflow do coordenador. Não editar Pen ou outras issues.

**Interfaces:** tarefas 1–4 completas; nenhuma interface nova.

- [ ] Executar `pnpm.cmd --dir apps/mobile test --hookTimeout=30000`, `pnpm.cmd --dir apps/mobile typecheck`, `pnpm.cmd --dir apps/mobile test:coverage:core`, `pnpm.cmd --dir apps/mobile test:coverage:ui` e `pnpm.cmd --dir apps/mobile doctor`; registrar resultado real e limitações, sem alterar limites/configuração para esconder falhas. Piso core 85% permanece bloqueante.
- [ ] Executar Biome apenas nos TS/TSX alterados com `pnpm.cmd exec biome check <arquivos alterados>`; esperar sucesso. Não usar lint monorepo sem motivo técnico. Executar `git diff --check` e buscar escapes de acentuação com `rg -n '\\u[0-9a-fA-F]{4}' <arquivos textuais alterados>`; nenhum escape introduzido para texto pt-BR.
- [ ] Inspecionar imports dos arquivos afetados com `rg -n 'lib/styles|components/ui/(button|card|field|inline-message|state-panel)' <screens e componentes alterados>`; nenhum legado visual no fluxo migrado. Screen por TrainerScreen continua permitido.
- [ ] Obter evidência Android real via Expo/dispositivo/emulador e Maestro quando disponível: lista → detalhe → retorno → nova avaliação; refresh e paginação; vazio/erro inicial/404; picker/cancelamento/remoção/limite; teclado decimal/foco e salvar. Comparar visualmente às referências Pen em 320/390/430 dp e texto ampliado. Não substituir evidência Android por testes/PNG do Pen.
- [ ] Registrar quais cenários foram reproduzidos e limitações de hardware/auth/rede/fotos. Não declarar sucesso nativo para cenário não observado nem ampliar o produto para facilitar QA.
- [ ] Executor principal faz revisão independente no SHA final e aplica somente ajustes fundamentados no aceite/spec. Entrega deve preservar fronteira da run MUV-35 e reportar gates incompletos sem merge indevido.

## Execução — 2026-10-13

As tarefas 1–4 foram implementadas. A suíte mobile passou com 64 arquivos e 560 testes; typecheck, cobertura core (93,97% statements), cobertura UI (89,07% statements) e Biome dos arquivos TS/TSX alterados passaram. expo-doctor passou 16/17 verificações, com divergências preexistentes de versão para sentry-expo e @react-navigation/bottom-tabs. O build debug instalou e abriu no emulador com o bundle Metro desta worktree, mas o login manual não avançou para a área autenticada. Não há evidência visual/runtime autenticada de lista, detalhe, formulário, teclado, picker ou salvamento; as capturas anteriores eram de outra implementação. A revisão independente de código está registrada na entrega da PR. A PR permanece sem merge para revisão humana.

## Self-review do plano

Mapeamento de cobertura: composição/títulos na tarefa 1; lista/estados/paginação na 2; identidade/métricas/fotos de leitura na 3; campos/fotos selecionadas/envio/teclado na 4; revisão de contratos e evidência nativa na 5. Interfaces usadas mantêm os tipos existentes; adições são somente visuais/opcionais. Os cinco riscos do Review Focus possuem testes atribuídos. O registro de execução acima é a fonte do status dos gates e descreve explicitamente os cenários nativos ainda não reproduzidos.
