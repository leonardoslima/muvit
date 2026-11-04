# MUV-38 — Professor: Home e alunos na UI/UX v2

## Entendimento e autorização

A MUV-38 migra a jornada Início → Alunos → Detalhe do aluno para os layouts aprovados da MUV-29, mantendo as operações existentes. O professor deve conseguir ler sua carteira, buscar explicitamente, carregar mais alunos, atualizar consultas e abrir os destinos existentes do detalhe. A implementação segue a autorização autônoma desta execução; o planner documenta as decisões sem introduzir aprovação humana intermediária.

O planejamento usa o caminho completo de brainstorming por envolver três telas, componentes compartilhados e estados de consulta. A especificação e o plano são artefatos de execução, sem autorização para ampliar o produto. O executor principal conduz implementação, testes e revisão; este planejamento não os executou.

## Fontes e evidências consultadas

- Linear MUV-38, consultada em 13/10/2026: objetivo, escopo e critérios de aceite; estado observado In Progress. Dependências registradas: MUV-29 e MUV-33. O claim e a coordenação pertencem ao executor principal.
- `AGENTS.md` e `apps/mobile/AGENTS.md`; não há AGENTS mais específico no mobile.
- `docs/mobile-v2-trainer-students.md`, `docs/mobile-v2-foundation.md` e `docs/mobile-v2-design-gate.md`.
- Telas `trainer-home.tsx`, `trainer-students.tsx` e `trainer-student-detail.tsx`, componentes de professor/aluno, testes adjacentes e `src/application/trainer/trainer-data.ts`.
- Primitives em `src/components/ui/v2`, tokens canônicos, `Screen` e a configuração de testes mobile.
- `assets/design/mobile.pen`, consultado pelo Pen CLI headless depois que o MCP desktop falhou com `transport not connected to app: desktop`. Foram lidos os quadros e componentes reais `sPhAW`, `opQby`, `wyzdn`, `HuTlv`, `oqdnt`, `A8i1E`, `RSFzR`, `iJPiO`, `e2KHo`, `w3M1bf`, `h70FO`, `vBo1r`, `o7n5Z`, `mRJyD`, `xw43b`, `mSaYx`, `WvvbK`, `D0UIi` e `B32I3H` com `Get(..., { resolveInstances: true, resolveVariables: true })`. Nós desativados de componentes podem aparecer na leitura; sua presença estrutural não autoriza exibir ações ocultas.

O acesso headless usa `pen interactive --in 'assets/design/mobile.pen' --out "$env:TEMP\muv-38-planner-readonly.pen"`, seguido de `read_skill({ path: "execute.md" })` e consultas `execute`. A sessão não chama `save()` e termina com `exit()`. A exportação de referência usa `Export(["sPhAW","opQby","wyzdn","RSFzR","iJPiO","e2KHo"], "png", "C:/Users/Leonardo/AppData/Local/Temp/muv-38-pen-reference", { scale: 1 })`, em diretório temporário externo ao repositório. Os seis PNGs foram gerados, conferidos no filesystem e inspecionados visualmente: Home/lista/detalhe em 390 e 320 dp. As capturas confirmam status abaixo do contato na lista, último indicador da Home em largura inteira e ausência do hint herdado do campo de busca. A exportação é referência visual do Pen, sem comprovar comportamento Android, fontes nativas ou acessibilidade.

## Escopo e limites

Inclui Home, lista/busca/paginação/refresh, detalhe e respectivos estados existentes: loading inicial, erro inicial/retry, vazio, atualização com dados, erro com dados, erro de paginação, identificador ausente e 404.

Os quatro acessos do detalhe são migrados visualmente e preservam suas rotas. As telas internas de avaliações, treinos e exercícios pertencem às MUV-39/MUV-40. Não adicionar cadastro, convite, filtros por status, edição de aluno, métricas navegáveis, alteração de ownership/status, política de acesso, API, schema, persistência offline ou política de cache. Não alterar autenticação nem o shell/tab bar aprovado na MUV-33.

Os números e nomes no Pen são exemplos. O runtime usa exclusivamente os dados retornados pelas consultas existentes. O status mantém Ativo/Pausado/Inativo, sem inferir gênero pelo nome nem trocar o contrato por textos ilustrativos do Pen.

## Abordagens consideradas

1. **Recomendada: composição local sobre a foundation v2.** Migrar os três fluxos, aproveitar dados/testes existentes, atualizar componentes de professor e acrescentar apenas composições comuns do fluxo. Extensões opcionais dos primitives resolvem overrides aprovados sem alterar seus defaults.
2. **Trocar apenas cores/imports.** Menor diff inicial, mas conserva cards na lista, carteira sem destaque, recuperação duplicada e detalhe com hierarquia divergente; não atende à MUV-29.
3. **Reescrever consultas e navegação junto com a UI.** Aumenta risco sobre paginação, ownership e cache sem necessidade técnica; ultrapassa o objetivo visual.

## Restrições globais

- Sem dependências novas, alterações de API, schema, ownership, status ou regras de acesso.
- Textos visíveis e documentação em pt-BR, com UTF-8 literal; não representar acentuação com escapes Unicode.
- Tokens canônicos em `src/lib/design-system/tokens.ts`; DM Sans, papel `#F6F5EF`, texto `#15372E`, verde `#2F6B50`, lima `#C9F36C` e superfícies existentes.
- Primitives visuais em `src/components/ui/v2`; sem aliases ou shims do legado.
- `Screen` existente continua sendo a borda de layout/safe area do shell; a migração não duplica inset, tab bar, gutter ou padding inferior.
- Gutter de 16 dp; ações de ícone com alvo mínimo de 48 × 48 dp; textos essenciais sem truncamento imposto.
- Layout rolável em 320/390/430 dp, preservando escala de fonte do sistema e teclado nativo.
- Consultas, query keys, AbortSignal, identidade Better Auth e rotas existentes permanecem sob seus contratos atuais.

## Componentes e arquitetura

As screens continuam conectando TanStack Query, router e dados existentes; componentes de apresentação recebem valores/callbacks, sem fazer consultas nem importar storage/API. Regras de dados permanecem em `src/application/trainer/trainer-data.ts`, sem necessidade de editá-lo.

Uma composição `TrainerScreen` em `src/components/trainer/trainer-screen.tsx` reúne `Screen`, `Header` v2, contexto textual e feedback de atualização. Seu contrato é `{ title: string; subtitle?: string; contextual?: boolean; onBack?: () => void; onRefresh: () => void; refreshDisabled: boolean; refreshing?: boolean; children: ReactNode }`. Retorna `React.JSX.Element`. O chamador decide quando bloquear/atualizar e quais dados renderizar. O header existe em todos os estados. O detalhe usa `title="Alunos"`, `contextual` e retorno; Home/lista usam seus títulos principais.

O overlay de refresh é posicionado sobre o viewport da tela, fora do conteúdo rolável. Mostra um único progresso com “Atualizando” e “Aguarde enquanto os dados são atualizados.”, conservando o conteúdo visível ao fundo. Não usa Modal nem cria foco modal. A camada visual permite que as ações já disponíveis e a navegação mantenham seus contratos; o chamador bloqueia operações concorrentes de consulta. O header não recebe `loading` quando existe StatePanel ou overlay: o reload fica estático e desativado.

`Header` recebe uma propriedade opcional `titleClassName?: string`, aplicada somente ao Text do título. A propriedade permite a escala de 26 dp em telas estreitas e o rótulo contextual de 15 dp sem modificar o padrão de outros consumidores. `Button` recebe `leading?: ReactNode` e `labelClassName?: string`, preservando os defaults; um leading fornecido compõe ícone + label sem o slot vazio de balanceamento do botão comum. Durante loading o progresso substitui esse leading, mantendo um único indicador. Atualizar `src/components/ui/v2/README.md` com os contratos adicionados.

`StudentActionButton` em `src/components/trainer/student-action-button.tsx` compõe Button v2 com `{ label: string; kind: 'history' | 'assessment' | 'workouts' | 'workout'; onPress: () => void }`. Histórico/treinos usam branco, texto verde e ClipboardList/Dumbbell verde sobre círculo sutil; criação usa verde profundo, texto branco e Plus sobre círculo lima. Ícones 16 dp, círculos 24 dp, altura mínima 52 dp, raio 29 dp, padding 12/20 dp, gap 8 dp, labels 14 dp com quebra de linha.

Os componentes existentes `TrainerMetricCard`, `StudentListItem` e `StudentStatusBadge` são migrados diretamente para tokens/primitives v2, preservando seus contratos públicos. `StudentStatusBadge` admite apenas `compact?: boolean` adicional para a identidade, mantendo texto de status e ícone. Para reproduzir a variante informativa Inativo do Pen, usar cor de informação nos overrides locais de Badge, sem renomear status ou criar token. Preservar o `testID` existente.

## Home

Referência principal `sPhAW`; estreita `RSFzR`; demais estados no handoff MUV-29.

- Header Início com contexto “Acompanhe sua carteira de alunos.” e reload de 48 dp em todos os estados.
- Carteira disponível: destaque verde profundo com raio 26 dp e padding 24 dp. “Alunos ativos”, valor ativo em 50 dp, total “N alunos vinculados”, pausados e inativos, e único botão “Ver alunos” interno com 52 dp. Em 320 dp, ativos usam 44 dp e título principal 26 dp.
- Abaixo do destaque, três indicadores informativos em superfícies sutis: Novos na semana, Planos ativos e Avaliações em 30 dias. Duas colunas adaptáveis; nenhum controle de filtro ou navegação nas métricas.
- Vazio depende de `students.total === 0`. Com total positivo e ativos zero, manter carteira e indicadores. Na carteira vazia não renderizar Ver alunos no corpo; o shell conserva a tab Alunos.
- `['trainer', 'summary']` e `/trainer/summary` são preservados. Bloquear reload durante consulta; loading inicial e retry sem dados usam StatePanel, sem botão duplicado. Erro inicial orienta a atualização pelo header.
- Refetch com dados mantém valores no fundo e um overlay. Erro de refresh usa Message v2 “Não foi possível atualizar a visão geral.” e mantém os indicadores.

## Lista e busca

Referências `opQby`, `fIFid`, `iJPiO`, `e1IV7`, `Xttp3`; paginação `p545B`, `tSDT8`, `vBo1r`, `o7n5Z`.

- Header Alunos com contagem retornada pela query; usar “N alunos vinculados” sem filtro e “N alunos encontrados” com busca aplicada. Não inventar total a partir do tamanho da página.
- Field v2 `kind="search"`, label “Buscar aluno”, placeholder “Nome do aluno”, `returnKeyType="search"`, botão Buscar de 52 dp. O hint herdado “Buscar aplica o filtro existente.” está oculto nas referências exportadas e não deve ser exibido.
- Digitar muda apenas `searchInput`; Buscar/Search aplica `searchInput.trim()` a `appliedSearch`. Uma chave nova `['trainer', 'students', appliedSearch]` inicia em offset 0. Limpar busca limpa ambos os valores; existe somente um botão Limpar busca junto ao formulário quando texto ou filtro estiver presente, inclusive na busca vazia.
- Cada aluno ocupa uma linha inteira tocável, sem card individual: padding vertical 16 dp, separador, avatar 48 dp em superfície sutil, iniciais, nome, contato, badge abaixo do contato e chevron na lateral. Nome 17 dp, contato 13 dp, nome 16 dp em 320 dp. Manter e-mail → telefone → “Sem contato cadastrado”, iniciais existentes e fallback AL. Nome e contato podem quebrar linha; badge não deve expulsar o conteúdo da largura útil.
- `/students` mantém `limit=25`, q codificado, offset igual à soma de itens carregados, signal e acumulador de páginas existentes. Mostrar “X de Y alunos carregados” quando existem itens; Carregar mais aparece somente enquanto carregados < total. Ao concluir, mostrar “Todos os alunos carregados”, sem ação adicional.
- Carteira vazia e busca sem resultados mantêm suas mensagens distintas. Header/reload permanecem nos estados iniciais e vazios.
- Refetch com dados apresenta overlay; `isRefetching && !isFetchingNextPage` distingue refresh de paginação. Erro de paginação conserva os itens e apresenta somente a mensagem específica e Tentar carregar mais. Essa falha não produz erro de refresh nem overlay de atualização. Próxima página usa feedback único no botão; reload e paginação bloqueiam reentrada durante `isFetching`.
- Linha faz push para `/trainer/students/[studentId]`, transmitindo somente o ID existente. Não mudar estratégia de virtualização ou paginação nesta migração.

## Detalhe

Referências `wyzdn`, `E8ZoR`, `b1dC0`, `e2KHo`, `oesMk`, `w3M1bf`; estados `g1mCwr`, `vce5L`, `lRg5y`, `iVunx`, `j9QNG`, `A8i1E`, `qWh5g`.

- Header contextual com altura mínima 48 dp, retorno de 48 dp, rótulo Alunos de 15 dp e reload de 48 dp. Voltar usa `router.replace('/trainer/students')`. Não exibir título grande Aluno nem retorno no corpo.
- Identidade compacta verde profundo, raio 26 dp e padding 20 dp; avatar lima de 56 dp, nome branco 24 dp (20 dp em 320 dp), status abaixo do nome com 6 dp de distância. Badge mínimo 24 dp, padding 4/8 dp e largura do conteúdo; pode crescer com fonte ampliada.
- Seções sem cards adicionais: Contato, Informações, Objetivo, Restrições, Avaliações e Treinos. Nascimento e gênero lado a lado quando couberem, admitindo crescimento/reflow. Títulos 18 dp e corpo 15 dp na base; 16/14 dp em 320 dp.
- Sem contato: “Sem contato cadastrado”. Contato parcial: “Não informado” no campo ausente. Nascimento/gênero ausentes: “Não informado”; gênero mantém Masculino/Feminino/Outro. Objetivo/restrições ausentes: “Sem objetivo cadastrado”/“Sem restrições cadastradas”. Preservar formatadores existentes e não mascarar telefone ou transformar conteúdo da API por estética.
- Ações em dois pares, com 12 dp entre botões: Ver histórico / Nova avaliação e Ver treinos / Novo treino. Altura mínima 52 dp admite aumento por fonte/texto. Todos os status preservam esses acessos.
- Rotas preservadas, com o mesmo `studentId`: `/trainer/students/[studentId]/assessments`, `/assessments/new`, `/workouts`, `/workouts/new` sob esse prefixo. Nenhuma consulta adicional de avaliações/treinos ao abrir o detalhe.
- Query `['trainer', 'student', studentId]` e `getTrainerStudent` mantidos. ID ausente desabilita consulta; 404 tem prioridade sobre dados anteriores e esconde a identidade e ações desse aluno. Ambos preservam header/retorno e reload desativado. Não criar validação UUID nova.
- Erro genérico sem dados permite retry exclusivamente pelo header. Loading/retry mantém header e um StatePanel de progresso. Com dados, refresh apresenta overlay; falha genérica usa Message “Não foi possível atualizar o aluno.” sem descartar o conteúdo.

## Matriz de aceitação

| Condição | Resultado verificável |
| --- | --- |
| Loading inicial ou retry sem dados | Header visível, reload estático/desativado, um progresso, sem botões de retry no conteúdo |
| Erro inicial recuperável | Header/reload acionável, mensagem orienta a ação, sem retry duplicado |
| Total zero / ativos zero com total positivo | Vazio somente no primeiro caso; carteira disponível no segundo |
| Busca digitada / submetida / limpa | Sem consulta ao digitar; trim e offset 0 ao submeter; texto/filtro zerados ao limpar |
| Refresh com dados | Conteúdo preservado, um overlay de viewport, reload desativado, sem spinner no header |
| Erro de refresh / erro de próxima página | Mensagens específicas; conteúdo preservado; retry de paginação só na paginação |
| Identificador ausente / 404 após dado carregado | Sem exposição de dados/ações indevidos; somente header para voltar; reload desativado |
| Conteúdo longo e fonte ampliada em 320 dp | Nome/contatos/ações legíveis e roláveis, sem limitar linhas essenciais |
| Navegação | Home→lista, linha→detalhe, retorno e quatro destinos preservam rotas e IDs |

## Verificação da implementação

O executor deve adaptar os testes RNTL existentes e acrescentar casos para as lacunas desta matriz: headers em todos os estados, unicidade de progresso/ações, total positivo com zero ativos, refresh/paginação concorrentes, 404 após sucesso e conteúdo longo/ações para status pausado/inativo. Asserções por semântica e efeitos de API/router prevalecem sobre snapshots.

Executar primeiro os testes focados das três telas, componentes modificados e primitives estendidos. Depois executar suíte mobile, typecheck, cobertura do núcleo/UI e doctor conforme as regras locais; o piso medido continua 85%. Executar Biome limitado aos arquivos modificados, export Android para detectar falhas Metro/NativeWind e ensaios Android com Maestro sobre autenticação trainer já existente. Não confundir teste unitário ou bundle exportado com QA visual nativa.

Comparar screenshots Android com as seis referências exportadas, mais loading/erro/refresh/paginação/dados parciais, registrando largura, cenário, SHA e limitações. Verificar teclado/Search, rolagem até o último acesso, safe area/tab bar uma vez, retorno e foco/labels acessíveis. Revisões independentes de código e UI/UX pertencem ao fluxo do executor principal e precisam se referir ao resultado atual.

## Self-review

Escopo confrontado com o Linear e com as exclusões MUV-39/MUV-40. A adaptação altera composição e localização de ações; contratos funcionais permanecem explícitos. Não há requisito de novas APIs, dados fictícios de runtime, etapas de aprovação intermediária ou decisões visuais pendentes. Os pontos de risco são extensões opcionais de primitives, prioridade do 404, progresso único e medidas nativas; todos aparecem no plano e na matriz de verificação. Planejamento não afirma testes ou QA aprovados.
