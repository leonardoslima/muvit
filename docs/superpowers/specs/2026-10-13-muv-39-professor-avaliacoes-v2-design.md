# MUV-39 — Professor: avaliações de alunos na UI/UX v2

## Entendimento e autorização

Migrar lista, detalhe e criação de avaliações do professor para o Pen aprovado, preservando consulta, paginação, validação, upload, feedback e navegação existentes. O professor deve conseguir ler o histórico de um aluno, abrir seu registro e criar uma avaliação com data, medidas, fotos e observações opcionais conforme o contrato atual.

O planner segue brainstorming em profundidade de especificação por envolver três telas e composição compartilhada, seguido de writing-plans. A execução autônoma recebida autoriza estes artefatos sem aprovação humana intermediária. Nenhuma decisão altera o produto; alterações de código, testes, Git, Linear e evidência nativa pertencem ao executor principal.

## Fontes e leitura atual

- Aceite atual da MUV-39, capturado no Linear pelo executor principal em 13/10/2026: lista, detalhe, nova avaliação e estados existentes; layouts conforme Pen, consulta/criação funcionais e testes relevantes passando. Dependências MUV-30/MUV-33 concluídas.
- `AGENTS.md`, `apps/mobile/AGENTS.md`, `docs/mobile-v2-trainer-assessments.md`, `docs/mobile-v2-foundation.md` e `docs/mobile-v2-design-gate.md`.
- Screens e testes `trainer-assessments`, `trainer-assessment-detail` e `trainer-new-assessment`; quatro componentes existentes em `src/components/assessments`; contratos `assessment-data.ts`, `assessment-form.ts`, `uploads.ts` e `packages/validators/src/assessments.ts`.
- `TrainerScreen`, `Screen`, primitives v2, tokens e configuração Vitest. Os quatro componentes de apresentação de avaliações são atualmente exclusivos do professor; não são usados por Progresso do aluno.
- Pen CLI headless: `pen.cmd interactive --in assets/design/mobile.pen --out "$env:TEMP\muv-39-planner-readonly.pen"`. Leitura `Get` dos quadros `c3VpNz`, `vEb96`, `yFUlq`, componentes `gwq9N`, `NtjQg`, `S8jXyf` e seções de campos/fotos. A sessão terminou por `exit()` sem `save()`.
- Exportação PNG dos nós `c3VpNz`, `vEb96`, `yFUlq`, `iKraZ` e `umdvq` em `C:/Users/Leonardo/AppData/Local/Temp/muv-39-planner-frames`. Lista, detalhe e formulário com uma foto foram inspecionados visualmente. Exportação não comprova runtime nativo.

O Pen confirmou lista com duas métricas lado a lado, detalhe com linhas de leitura sem superfícies de card e fotos de leitura em contêiner 4:3 com `mode: contain`. O formulário tem campos simples, upload na próxima posição da grade e remoção compacta sobre a imagem. A altura expandida do canvas não define altura do dispositivo.

## Abordagens

1. **Escolhida: migrar a apresentação existente e reutilizar TrainerScreen.** Mantém consultas, regras e testes; adapta os quatro componentes de avaliações e acrescenta somente composição de título e fotos selecionadas. Estende o wrapper por propriedades opcionais para rótulo/estado do retorno e ausência de refresh no formulário.
2. Trocar cores/imports mantendo a estrutura antiga: insuficiente, pois conservaria cards no detalhe, fotos cortadas e recuperação duplicada.
3. Reescrever serviços, consulta e formulário: risco desnecessário sobre upload/cache/ownership; não atende à restrição de migração visual.

## Restrições globais

- Sem dependências novas, alterações de API, schemas, autenticação, ownership, cache, regras de validação ou limites de fotos.
- Textos visíveis e documentação em pt-BR com UTF-8 literal, sem escapes Unicode de acentuação.
- Tokens canônicos de `src/lib/design-system/tokens.ts`, DM Sans, papel, verde profundo e lima da foundation.
- Primitives visuais de `src/components/ui/v2`; sem aliases ou shims para o legado.
- `Screen` mantém safe areas e inset da tab bar; não duplicar gutter, tab bar ou padding inferior nas screens.
- Gutter de 16 dp, campos de referência de 52 dp, CTA de referência de 58 dp e alvos de ícone de 48 × 48 dp; conteúdo pode crescer.
- Layout rolável em 320/390/430 dp, com fonte do sistema ampliada e teclado nativo.
- Fora de escopo: Home/alunos, treinos/exercícios, edição, exclusão, busca, filtros, gráficos, comparação, câmera, seleção múltipla, visor de fotos, fila offline, rascunho persistente e novos campos.

## Componentes e fronteiras

Screens mantêm TanStack Query/router/picker na borda e continuam usando funções de `src/application/assessments`; não mover regras de domínio para componentes visuais. Não alterar rotas: o Stack de alunos continua dentro da tab Alunos, com Início/Alunos/Perfil fornecidos pelo shell.

`TrainerScreen` recebe somente três extensões opcionais: `backLabel?: string` (default `Voltar para alunos`), `backDisabled?: boolean` (default `false`) e `onRefresh?: () => void` (ausência omite a ação). `refreshDisabled` mantém seu contrato atual. Home/alunos mantêm seus valores/defaults e devem passar nos testes existentes. Header não recebe loading quando já há progresso dedicado. O overlay já existente acompanha o viewport e preserva conteúdo/navegação.

`AssessmentHeading({ title: string; subtitle?: string }): React.JSX.Element` em `src/components/assessments/assessment-heading.tsx` renderiza título e contexto, medindo sua largura com `onLayout`. Com largura útil até 320 dp usa título 26/31,2 dp; acima, 30/36 dp. Isto cobre as referências 320/390/430 dp sem depender de altura fixa ou de mocks globais novos.

`AssessmentListItem` conserva `{ assessment: Assessment; onPress: () => void }`. Usa Card v2 acionável com raio 20 dp, padding 20 dp, data 20 dp, ChevronRight decorativo, duas colunas flexíveis para peso/gordura e observações em até duas linhas. O card inteiro é a única ação; seu nome acessível atual permanece.

`AssessmentMetric` conserva `{ label: string; value: string }` e passa a compor linha com label secundário flexível e valor forte à direita, gap de 16 dp e padding vertical de 8 dp. Labels/valores podem quebrar em tela pequena/fonte ampliada. `AssessmentMeasurementsCard` conserva seu nome e props, mas renderiza seção sobre o papel, sem Card ou superfície própria. `AssessmentPhotoList` conserva `{ dateLabel: string; photos: string[] }`; adiciona rótulo visível Foto N e usa imagem `contain` em área 4:3, sem ações de remoção/leitura adicional.

`TrainerAssessmentPhotos({ photos: readonly AssessmentPhotoInput[]; disabled: boolean; onAdd: () => void; onRemove: (index: number) => void }): React.JSX.Element` em `src/components/assessments/trainer-assessment-photos.tsx` concentra somente apresentação da seleção. Grade em duas colunas com gap 12 dp, contagem e upload na próxima célula; terceira foto inicia outra linha e três fotos ocultam upload. Cada miniatura preserva a proporção da imagem obtida em `Image.onLoad`, validando largura/altura positivas finitas, com referência temporária 1:2 antes da leitura; metadados visuais não entram no payload. A posição de upload mantém referência 1:2 e mínimo suficiente para seus textos.

A remoção usa X de 16 dp em círculo sólido verde de 28 dp sobre a imagem, dentro de alvo transparente 48 dp, nome `Remover foto N`, sem botão largo. Desabilitada, usa fundo de ação desabilitada e X verde escuro, sem opacidade global que reduza legibilidade. Upload usa borda tracejada, ícone Upload, `Adicionar foto` e `Envie fotos da evolução do aluno, se desejar.`; sem fotos mostra `Até 3 fotos · JPEG ou PNG`, com fotos mostra `1 foto selecionada` ou `N fotos selecionadas`.

## Lista e estados

Header contextual `Aluno` retorna ao detalhe; sem studentId, `Alunos` retorna à carteira. `Atualizar` permanece visível, estático/desabilitado durante consulta ou contexto indisponível. Conteúdo disponível inclui título `Avaliações`, contexto `Histórico de medidas e avaliações deste aluno.`, Nova avaliação e linhas recebidas. Erro/loading inicial conservam o header; StatePanel ocupa a área útil sem card ou ações duplicadas.

| Condição | Conteúdo e ações |
| --- | --- |
| studentId ausente | Aluno inválido; sem request; retorno Alunos; refresh desabilitado |
| Loading/retry sem dados | StatePanel como único progresso; retorno habilitado; refresh desabilitado |
| Erro inicial recuperável | StatePanel orienta atualizar pelo cabeçalho; refresh habilitado; sem Tentar novamente no corpo |
| 404, inclusive após dados ou paginação | Ocultar dados anteriores; avaliações indisponíveis; somente retorno acionável |
| Vazio | Explicação sem CTA duplicado; Nova avaliação permanece única criação |
| Atualização com dados | Preservar itens; overlay existente como único progresso; refresh/paginação desabilitados |
| Falha de atualização | Preservar itens e Message de erro; refresh habilitado |
| Próxima página | Preservar itens; botão Carregando mais... é o único progresso; refresh/paginação bloqueados |
| Erro de próxima página | Preservar itens; Message e Tentar carregar mais; refresh habilitado |

Manter GET com `limit=25`, offset igual à soma de itens carregados, ordem retornada, total e query key `['trainer', 'assessments', studentId]`. Datas DD/MM/AAAA; métricas pt-BR com kg/%; nulo/inválido vira Não informado, nunca zero inventado. Não copiar amostras do Pen para fixtures de produção.

## Detalhe e identidade

Header contextual `Avaliações` retorna ao histórico, ou `Alunos` à carteira quando falta studentId. Preservar GET `/assessments/:assessmentId`, AbortSignal e query key. Checar `assessment.studentId === studentId` antes de qualquer exposição; contexto divergente é indisponível com refresh desabilitado. 404 prevalece sobre cache anterior. Ausência de dados durante erro mostra StatePanel e recuperação somente pelo header.

Conteúdo: data como título, `Avaliação do aluno`, métricas principais, circunferências recebidas, fotos e observações. Peso/altura/gordura ausentes ou inválidos usam Não informado. Somente chaves recebidas aparecem nas nove circunferências; seção vazia usa Não informado. Não há IMC no detalhe. Observações vazias usam Não informado e texto extenso cresce. Filtrar somente URLs vazias antes de mostrar todas as fotos recebidas, inclusive mais de três; sem fotos omitir a seção. Atualização/falha seguem overlay/mensagem da lista, sem botão no rodapé.

## Formulário e envio

Header contextual somente com retorno `Avaliações`; sem studentId, `Alunos`. Não há refresh. Retorno, campos, fotos e salvar ficam bloqueados durante envio/sucesso. Formulário rolável permite foco/teclado com `KeyboardAvoidingView` na borda e `keyboardShouldPersistTaps="handled"`, sem nova política de formulário.

Título `Nova avaliação`, contexto `Registre medidas e fotos para acompanhar a evolução. Somente a data é obrigatória.`; seções sem cards para métricas principais, circunferências, fotos e observações. Data inicia em `todayIsoDate()`, formato AAAA-MM-DD; 12 campos numéricos mantêm teclado decimal, unidade e vírgula. Usar Field v2 simples; NumericField com +/- não corresponde a estes campos aprovados.

| Campo | Placeholder vazio |
| --- | --- |
| Peso / Altura / Gordura | Ex.: 70,5 / Ex.: 170 / Ex.: 20,5 |
| Peito / Cintura / Quadril | Ex.: 95 / Ex.: 80 / Ex.: 100 |
| Braços direito e esquerdo | Ex.: 32,5 |
| Coxas direita e esquerda | Ex.: 55 |
| Panturrilhas direita e esquerda | Ex.: 36 |
| Observações | Adicione observações sobre a avaliação |

Preservar primeira falha em mensagem global, sem validação por campo/a cada tecla. IMC é leitura derivada, uma casa decimal pt-BR, sem propriedade no payload; sem peso/altura positivos usa Informe peso e altura. Peso até 500 kg, altura até 300 cm, gordura 0–80%, circunferências positivas, observações até 2000 caracteres; schema de URLs segue máximo seis e formulário segue máximo três.

Picker continua uma imagem por vez, `allowsEditing: true`, `quality: 0.7`, JPEG/PNG. Cancelar mantém seleção. Sequência existente: validar dados → upload das fotos → validar URLs/payload → POST → invalidar histórico e resumo do professor → Avaliação salva! → retorno após 150 ms. Botão Salvando avaliação... usa um único progresso. Falha de formato/upload/POST conserva dados/fotos e mensagens existentes. Falha de invalidação depois do POST pode cair em erro genérico; não prometer ausência de criação ou idempotência.

## Riscos e evidência necessária

- Extensão do wrapper comum deve preservar defaults/testes de Home/alunos; não editar suas screens. MUV-35 está ativa em outra run: não tocar Hoje, visão geral, rota de exercício ou contratos de workout.
- Uma foto repetida ou remoção da primeira pode trocar índices; chaves precisam incluir URI e posição, e nome Foto N deve refletir a ordem atual. Eventos de dimensão inválidos mantêm fallback sem dividir por zero.
- Cache com 404 ou avaliação de outro aluno nunca deve ficar visível sob a mensagem de erro. Testes precisam verificar ausência do conteúdo sensível.
- Não confundir PNG do Pen com verificação Android. Execução principal deve buscar evidência real de lista/detalhe/formulário, retorno, atualização, teclado, fotos e salvamento no dispositivo/emulador, usando Maestro quando disponível; limitações devem ser registradas.
- Testes RNTL cobrem contratos e estados; fonte ampliada, clipping, foco, gestos, leitura de tela e proporções finais exigem inspeção nativa. Sem decisão de produto pendente identificada na leitura atual.

## Self-review do planejamento

Spec confrontada com o aceite, handoff, gate e capturas atuais. Rotas, estados, limites, prioridade de 404, identidade e sequência de envio estão explícitos. Escopo é um domínio; não exige decomposição em outras issues. Não foram executados testes de implementação pelo planner; o plano entrega os ciclos e comandos ao executor.
