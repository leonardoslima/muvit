# Layouts mobile de aluno e professor no Pencil Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Materializar no Pencil os fluxos Mobile MVP de aluno e treinador aprovados no MUV-7, com referências nomeadas, estados explícitos e navegação sem CRUD para treinador.

**Architecture:** Um board de componentes mobile reutilizáveis será criado em uma região vazia do canvas e alimentará frames top-level de 390 px para os dois perfis. O aluno preserva os fluxos funcionais já existentes; o treinador recebe somente acompanhamento contextual de alunos, avaliações e treinos. A especificação registra os nomes canônicos e, após a criação, recebe os IDs materializados dos frames.

**Tech Stack:** Pencil MCP e arquivo .pen 2.17, variáveis do Style Guide Muvit, Expo Router e React Native como consumidores futuros, Linear MUV-7.

## Global Constraints

- Trabalhar em "assets/design/pencil_design.pen" exclusivamente pelas ferramentas Pencil; nunca ler, comparar ou editar o arquivo por ferramentas de texto.
- Antes de cada mutação, reler o estado do canvas. O arquivo possui uma alteração local preexistente e ela não pode ser removida, revertida, movida ou incluída em commit sem escopo confirmado.
- Usar as variáveis existentes do Pencil: "$--background" "#F5F3EF", "$--card" "#FFFFFF", "$--foreground" "#1A1A1A", "$--muted-foreground" "#666666", "$--border" "#D1CCC4", "$--primary" "#2ECC71", "$--color-warning" "#F39C12" e "$--color-error" "#E74C3C".
- Usar "$--font-primary" (Space Grotesk) em títulos e "$--font-secondary" (Inter) em corpo, labels e mensagens.
- Toda cópia visível é pt-BR em UTF-8 literal. A role "trainer" aparece como "Treinador".
- Cada tela é um frame top-level de 390 px, "clip: true", layout vertical e altura "fit_content(844)". O status bar mede 62 px; o wrapper interno usa 20 px laterais, 24–32 px entre seções e 12–16 px entre elementos relacionados.
- Navegação aprovada: aluno em Hoje/Progresso/Perfil; treinador em Início/Alunos/Perfil. A role é resolvida pela sessão, sem seletor manual.
- O treinador pode abrir detalhes, atualizar visualização e sair. Nenhum frame de treinador contém criar, editar, excluir, salvar, publicar, adicionar exercício ou deep link para o dashboard web.
- Não modificar apps, APIs, validators, banco, configurações ou frames desktop nesta entrega.
- Consultar "docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md" antes de cada tarefa e atualizar a tabela de IDs somente ao concluir o canvas.
- Antes de qualquer commit que inclua o .pen, confirmar que a alteração preexistente faz parte do MUV-7 ou pedir orientação ao usuário. Um arquivo .pen é uma única unidade de stage e não permite separar mudanças por hunk com segurança.

---

### Task 1: Auditar o canvas e criar os componentes mobile reutilizáveis

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Modify: "docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md" somente na etapa final de catálogo
- Test: inspeção estrutural e screenshot do board de componentes

**Interfaces:**
- Consumes: variáveis existentes do Pencil, componentes desktop "Button/Primary", "Button/Secondary", "Badge/Active", "Avatar/Initials" e "Card/Container".
- Produces: IDs persistentes "mobileComponentsBoardId", "mobileScreenShellId", "mobileAppHeaderId", "mobileBackHeaderId", "mobileTabBarId", "mobilePrimaryButtonId", "mobileSecondaryButtonId", "mobileSummaryCardId", "mobileStudentRowId", "mobileWorkoutPreviewId", "mobileAssessmentPreviewId", "mobileStatusBadgeId" e "mobileStatePanelId".

- [ ] **Step 1: Registrar o baseline e proteger conteúdo existente**

Executar a partir da raiz:

~~~powershell
git branch --show-current
git status --short
~~~

Confirmar a branch "leonardosilva/muv-7-criar-layouts-mobile-de-aluno-e-professor-no-pencil". Usar "get_app_state" do Pencil com canvas e schema quando necessário. Imprimir apenas as variáveis, os frames top-level e quaisquer frames cujo nome comece por "Mobile /":

~~~js
Print(GetVariables())
Get((n,c) => c.depth === 0 && Print(n.id, "|", n.name, "|", c.bounds.width, "x", c.bounds.height))
Get(n => n.name && n.name.startsWith("Mobile /") && Print("MOBILE", n.id, "|", n.name))
~~~

Registrar os IDs e nomes retornados na execução atual. Não chamar Delete, Move, Replace ou Update sobre um node que não tenha sido criado durante este plano.

- [ ] **Step 2: Criar o board e os componentes com nomes canônicos**

Encontrar espaço vazio abaixo do conteúdo existente e inserir somente frames nomeados. Executar em blocos pequenos, mantendo o board e cada componente raiz como "placeholder: true" até todos os filhos do bloco existirem:

~~~js
mobileBoardPos=FindEmptySpace({width:1720,height:1320,direction:"bottom",padding:96})
mobileComponentsBoardId=Insert(document,{type:"frame",name:"Mobile / Components — Muvit",x:mobileBoardPos.x,y:mobileBoardPos.y,width:1720,height:1320,layout:"none",fill:"$--background",clip:true,placeholder:true})
mobileScreenShellId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Screen shell",x:32,y:48,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,reusable:true,placeholder:true})
mobileAppHeaderId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / App header",x:472,y:48,width:342,layout:"vertical",gap:6,reusable:true,placeholder:true})
mobileBackHeaderId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Back header",x:856,y:48,width:342,layout:"horizontal",justifyContent:"space_between",alignItems:"center",reusable:true,placeholder:true})
mobileTabBarId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Tab bar",x:472,y:230,width:342,height:56,layout:"horizontal",justifyContent:"space_between",alignItems:"center",padding:[6,12],cornerRadius:"$--radius-pill",fill:"#FFFFFFB3",reusable:true,placeholder:true})
mobilePrimaryButtonId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Primary button",x:856,y:230,width:342,height:48,layout:"horizontal",justifyContent:"center",alignItems:"center",cornerRadius:"$--radius-md",fill:"$--primary",reusable:true,placeholder:true})
mobileSecondaryButtonId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Secondary button",x:856,y:302,width:342,height:48,layout:"horizontal",justifyContent:"center",alignItems:"center",cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
~~~

Adicionar em seguida os filhos visíveis de cada componente: status bar, título, subtítulo, ícones Lucide, label de botão, item ativo/inativo de tab, avatar, rótulo e valor. Dar nome humano a todo filho. Usar "$--font-primary" para títulos e "$--font-secondary" para os demais textos.

- [ ] **Step 3: Completar cartões e painéis de estado**

Inserir no mesmo board os componentes restantes e sua estrutura interna:

~~~js
mobileSummaryCardId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Summary card",x:472,y:406,width:342,layout:"vertical",gap:8,padding:16,cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
mobileStudentRowId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Student row",x:856,y:406,width:342,height:72,layout:"horizontal",gap:12,alignItems:"center",padding:[12,16],cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
mobileWorkoutPreviewId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Workout preview",x:472,y:596,width:342,layout:"vertical",gap:8,padding:16,cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
mobileAssessmentPreviewId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Assessment preview",x:856,y:596,width:342,layout:"vertical",gap:8,padding:16,cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
mobileStatusBadgeId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / Status badge",x:472,y:824,layout:"horizontal",alignItems:"center",padding:[4,8],cornerRadius:"$--radius-pill",fill:"$--color-success-bg",reusable:true,placeholder:true})
mobileStatePanelId=Insert(mobileComponentsBoardId,{type:"frame",name:"Mobile / Component / State panel",x:856,y:824,width:342,layout:"vertical",gap:12,alignItems:"center",padding:24,cornerRadius:"$--radius-md",fill:"$--card",stroke:"$--border",strokeWidth:1,reusable:true,placeholder:true})
~~~

O State panel precisa ter ícone, título, descrição e slot para ação. Criar as quatro instâncias de referência no board com cópias: "Carregando", "Sem conteúdo", "Não foi possível carregar" e "Concluído".

- [ ] **Step 4: Remover placeholders e verificar o board**

Remover "placeholder: true" somente nos componentes preenchidos e fazer a inspeção estrutural:

~~~js
Update(mobileComponentsBoardId,{placeholder:false})
Get(mobileComponentsBoardId,(n,c) => c.problems && Print(n.name,"|",c.parentCtx && c.parentCtx.node.name,"|",c.problems))
Get(mobileComponentsBoardId,(n,c) => n.type === "text" && !n.fill && Print("TEXT WITHOUT FILL",n.name))
Print(Get(mobileComponentsBoardId,{depth:2}))
~~~

Corrigir qualquer linha retornada por "c.problems" ou "TEXT WITHOUT FILL" antes de seguir. Gerar um screenshot do board e verificar contraste, espaçamento e legibilidade dos labels.

- [ ] **Step 5: Verificar e commitar o board de componentes**

Se o baseline confirmar que o .pen inteiro está no escopo do MUV-7, executar:

~~~powershell
git diff --check
git status --short
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): cria componentes mobile do Muvit"
~~~

Se a alteração preexistente não puder ser atribuída ao MUV-7, não executar "git add assets/design/pencil_design.pen"; pedir ao usuário que confirme o escopo antes de qualquer stage do arquivo.

### Task 2: Construir autenticação e cascas de navegação dos dois perfis

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Test: screenshots de autenticação, tab bar de aluno e tab bar de treinador

**Interfaces:**
- Consumes: todos os IDs de componente produzidos pela Task 1.
- Produces: "studentLoginDefaultId", "studentLoginStateId", "studentSignupDefaultId", "studentSignupStateId", "studentTabBarId", "studentProfileId", "trainerTabBarId" e "trainerProfileId", correspondendo aos frames de Login, Cadastro e Perfil aprovados.
- Names materializados: "Mobile / Aluno / Login / default", "Mobile / Aluno / Login / submitting-error", "Mobile / Aluno / Cadastro / default", "Mobile / Aluno / Cadastro / submitting-error", "Mobile / Aluno / Perfil / default" e "Mobile / Treinador / Perfil / default".

- [ ] **Step 1: Criar frames de login e cadastro de aluno**

Posicionar os frames em sequência usando FindEmptySpace e compor status bar, marca Muvit, título, subtítulo, inputs, mensagem de erro e botões. A cópia é:

| Frame | Título | Subtítulo | Ação primária |
| --- | --- | --- | --- |
| Login | Entrar | Acesse seus treinos e registre sua evolução. | Entrar |
| Cadastro | Criar conta | Comece como aluno independente. | Criar conta |

Usar "Email" e "Senha" no Login; "Nome", "Email" e "Senha" no Cadastro. O botão secundário alterna entre "Criar conta independente" e "Já tenho conta".

~~~js
authPos=FindEmptySpace({width:390,height:900,direction:"right",padding:72})
studentLoginDefaultId=Insert(document,{type:"frame",name:"Mobile / Aluno / Login / default",x:authPos.x,y:authPos.y,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,placeholder:true})
studentLoginContentId=Insert(studentLoginDefaultId,{type:"frame",name:"Login content",layout:"vertical",gap:18,padding:[62,20,24,20],width:"fill_container"})
Insert(studentLoginContentId,{type:"text",name:"Login title",fontFamily:"$--font-primary",fontSize:28,fill:"$--foreground",content:"Entrar"})
Insert(studentLoginContentId,{type:"text",name:"Login subtitle",fontFamily:"$--font-secondary",fontSize:15,lineHeight:1.45,fill:"$--muted-foreground",textGrowth:"fixed-width",width:"fill_container",content:"Acesse seus treinos e registre sua evolução."})
Update(studentLoginDefaultId,{placeholder:false})
~~~

- [ ] **Step 2: Criar variantes de submissão e erro**

Copiar cada frame base e trocar somente o estado necessário:

- submissão desabilita a ação primária e mostra "Entrando..." ou "Criando...";
- erro mostra painel compacto em "$--color-error-bg" com "Não foi possível entrar. Confira seus dados e tente novamente.";
- o sucesso direciona para a tab bar da role e não recebe frame intermediário.

Criar as variantes com os nomes canônicos da interface produzida. Não adicionar opção de cadastrar treinador.

- [ ] **Step 3: Criar shells de tab bar e perfis**

Criar uma tab bar de aluno com Hoje, Progresso e Perfil, e uma de treinador com Início, Alunos e Perfil. Em cada caso, apenas o item atual recebe ícone preenchido, label "$--primary" e cápsula de destaque. Compor os perfis com avatar, nome de exemplo, e-mail, badge de role e botão secundário "Sair".

Usar "Mariana Costa" e "mariana@example.com" para Aluno; "João Silva" e "joao@example.com" para Treinador.

- [ ] **Step 4: Verificar navegação e layout**

Para cada frame, usar:

~~~js
Get(studentLoginDefaultId,(n,c) => c.problems && Print(n.name,"|",c.problems))
Get(studentProfileId,(n,c) => c.problems && Print(n.name,"|",c.problems))
Get(trainerProfileId,(n,c) => c.problems && Print(n.name,"|",c.problems))
~~~

Gerar screenshot de um frame de autenticação e um perfil de cada role. Conferir que nenhuma tela registra uma escolha manual de role.

- [ ] **Step 5: Verificar e commitar autenticação e shells**

~~~powershell
git diff --check
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): adiciona entrada e navegação mobile"
~~~

Aplicar a mesma trava de escopo da Task 1 antes de stage do .pen.

### Task 3: Criar as referências de treino do aluno

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Test: screenshots de Hoje, detalhe de exercício e registro de treino

**Interfaces:**
- Consumes: Screen shell, App header, Back header, Tab bar, Workout preview, State panel e Primary button.
- Produces: "studentTodayActiveId", "studentTodayLoadingId", "studentTodayEmptyId", "studentTodayErrorId", "studentExerciseDetailsId", "studentWorkoutLogDefaultId", "studentWorkoutLogStateId" e "studentWorkoutLogSuccessId".
- Names materializados: "Mobile / Aluno / Hoje / treino-ativo", "Mobile / Aluno / Hoje / carregando", "Mobile / Aluno / Hoje / sem-treino", "Mobile / Aluno / Hoje / erro", "Mobile / Aluno / Exercício / detalhes", "Mobile / Aluno / Registro de treino / default", "Mobile / Aluno / Registro de treino / carregando-erro" e "Mobile / Aluno / Registro de treino / sucesso".

- [ ] **Step 1: Criar a tela Hoje com treino ativo**

Criar o frame com cabeçalho "Treino de hoje", subtítulo "Hipertrofia A · Terça", badge opcional "Offline", três previews de exercício e CTA "Iniciar treino". Usar os exemplos "Agachamento livre", "Supino reto" e "Remada baixa"; cada preview mostra séries, repetições e descanso.

~~~js
studentTodayPos=FindEmptySpace({width:390,height:1000,direction:"right",padding:72,nodeId:studentProfileId})
studentTodayActiveId=Insert(document,{type:"frame",name:"Mobile / Aluno / Hoje / treino-ativo",x:studentTodayPos.x,y:studentTodayPos.y,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,placeholder:true})
studentTodayContentId=Insert(studentTodayActiveId,{type:"frame",name:"Hoje content",layout:"vertical",gap:16,padding:[62,20,20,20],width:"fill_container"})
Insert(studentTodayContentId,{type:"text",name:"Hoje title",fontFamily:"$--font-primary",fontSize:28,fill:"$--foreground",content:"Treino de hoje"})
Insert(studentTodayContentId,{type:"text",name:"Hoje subtitle",fontFamily:"$--font-secondary",fontSize:15,fill:"$--muted-foreground",content:"Hipertrofia A · Terça"})
studentTodayTabId=Insert(studentTodayContentId,{type:"ref",name:"Aluno tabs Hoje",ref:mobileTabBarId,width:"fill_container"})
Update(studentTodayActiveId,{placeholder:false})
~~~

- [ ] **Step 2: Criar estados de Hoje**

Criar três frames de referência:

- carregando: skeleton de título e três cartões;
- sem treino: State panel com "Sem treino ativo" e "Quando seu treinador publicar um treino ativo, ele aparece aqui.";
- erro: State panel com "Não foi possível carregar o treino" e botão "Tentar novamente".

O erro não pode usar a cópia de vazio nem esconder o tab bar.

- [ ] **Step 3: Criar detalhe de exercício e registro**

Criar "Mobile / Aluno / Exercício / detalhes" com uma superfície inferior sobre o shell de Hoje, título "Agachamento livre", grupo muscular, séries, repetições, descanso, notas e botão "Fechar".

Criar "Mobile / Aluno / Registro de treino / default" com Back header, título "Hipertrofia A", cartões de exercício e linhas de séries. Cada linha mostra número da série, status concluído, campo "reps" e campo "kg". O rodapé contém "Finalizar treino".

- [ ] **Step 4: Criar feedback de carregamento, erro e sucesso do registro**

Usar a mesma composição do registro para:

- carregando: conteúdo indisponível com indicador e "Carregando treino...";
- erro: State panel com "Treino indisponível", "Não foi possível abrir este treino agora." e "Tentar novamente";
- sucesso: confirmação "Treino finalizado" e "Seu registro foi salvo.", seguida de botão "Voltar para Hoje".

Não desenhar sincronização de edição ou ações administrativas nesse fluxo.

- [ ] **Step 5: Verificar e commitar o fluxo de treino**

Usar Get com "c.problems" em todos os IDs de frame produzidos e obter screenshots de Hoje ativo, detalhe de exercício e registro sucesso. Confirmar que a superfície inferior possui botão de fechar e que o CTA de finalizar está visível.

~~~powershell
git diff --check
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): referencia fluxo de treino do aluno"
~~~

### Task 4: Criar progresso, nova avaliação e perfil do aluno

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Test: screenshots de Progresso e Nova avaliação

**Interfaces:**
- Consumes: Screen shell, App header, Tab bar, Assessment preview, State panel, Primary button e Secondary button.
- Produces: "studentProgressDefaultId", "studentProgressStatesId", "studentNewAssessmentId" e "studentNewAssessmentStatesId"; o perfil do aluno é "studentProfileId" da Task 2.
- Names materializados: "Mobile / Aluno / Progresso / com-avaliações", "Mobile / Aluno / Progresso / carregando-vazio-erro", "Mobile / Aluno / Nova avaliação / default" e "Mobile / Aluno / Nova avaliação / enviando-erro-sucesso".

- [ ] **Step 1: Criar Progresso com avaliações**

Compor título "Progresso", ação circular "+", lista de três Assessment previews e dados de exemplo:

| Data | Peso | Gordura |
| --- | --- | --- |
| 2026-08-07 | 68,2 kg | 19,4% |
| 2026-07-07 | 69,0 kg | 20,1% |
| 2026-06-07 | 70,1 kg | 21,0% |

Cada preview pode exibir notas curtas, mas não cria gráfico ou dependência nova.

~~~js
studentProgressPos=FindEmptySpace({width:390,height:980,direction:"right",padding:72,nodeId:studentTodayActiveId})
studentProgressDefaultId=Insert(document,{type:"frame",name:"Mobile / Aluno / Progresso / com-avaliações",x:studentProgressPos.x,y:studentProgressPos.y,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,placeholder:true})
studentProgressContentId=Insert(studentProgressDefaultId,{type:"frame",name:"Progresso content",layout:"vertical",gap:16,padding:[62,20,20,20],width:"fill_container"})
Insert(studentProgressContentId,{type:"text",name:"Progresso title",fontFamily:"$--font-primary",fontSize:28,fill:"$--foreground",content:"Progresso"})
studentProgressAddId=Insert(studentProgressContentId,{type:"frame",name:"Nova avaliação action",width:44,height:44,layout:"horizontal",justifyContent:"center",alignItems:"center",cornerRadius:"$--radius-pill",fill:"$--primary"})
Insert(studentProgressAddId,{type:"text",name:"Nova avaliação plus",fontFamily:"$--font-secondary",fontSize:22,fill:"$--primary-foreground",content:"+"})
Update(studentProgressDefaultId,{placeholder:false})
~~~

- [ ] **Step 2: Criar estados de Progresso**

No frame "Mobile / Aluno / Progresso / carregando-vazio-erro", apresentar três variantes com label:

- "Carregando avaliações...";
- "Nenhuma avaliação registrada.";
- "Não foi possível carregar suas avaliações." com "Tentar novamente".

- [ ] **Step 3: Criar Nova avaliação e seus feedbacks**

Criar campos "AAAA-MM-DD", "Peso (kg)", "Gordura corporal (%)", "Notas" e ação secundária "Adicionar foto". A ação primária é "Salvar".

No frame de estados, representar:

- enviando: "Salvando..." com inputs desabilitados;
- erro: mensagem próxima ao campo inválido ou ao envio;
- sucesso: "Avaliação salva" e retorno claro para Progresso.

Não adicionar campos que não existam no fluxo atual.

- [ ] **Step 4: Validar fluxo de aluno**

Gerar screenshots de Progresso preenchido, vazio e Nova avaliação. Usar Get para confirmar que todas as mensagens do aluno têm fill e que os frames não têm problemas de clipping.

- [ ] **Step 5: Verificar e commitar as referências de progresso**

~~~powershell
git diff --check
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): referencia progresso e avaliação do aluno"
~~~

### Task 5: Criar Início, Alunos e Perfil do treinador

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Test: screenshots de Início, Alunos e Perfil do treinador

**Interfaces:**
- Consumes: Screen shell, App header, Tab bar, Summary card, Student row, State panel e Secondary button.
- Produces: "trainerHomeDefaultId", "trainerHomeStatesId", "trainerStudentsListId" e "trainerStudentsStatesId"; o perfil de treinador é "trainerProfileId" da Task 2.
- Names materializados: "Mobile / Treinador / Início / default", "Mobile / Treinador / Início / carregando-vazio-erro", "Mobile / Treinador / Alunos / lista" e "Mobile / Treinador / Alunos / carregando-vazio-erro".

- [ ] **Step 1: Criar o Início do treinador**

Compor saudação "Bom dia, João", subtítulo "Acompanhe seus alunos de onde estiver.", dois Summary cards "Alunos ativos" "24" e "Avaliações recentes" "6", seção "Alunos para acompanhar" e CTA de texto "Ver todos os alunos".

O CTA navega para Alunos. Não incluir métricas editáveis, botão de criar aluno ou qualquer ação administrativa.

~~~js
trainerHomePos=FindEmptySpace({width:390,height:1000,direction:"right",padding:72,nodeId:studentProgressDefaultId})
trainerHomeDefaultId=Insert(document,{type:"frame",name:"Mobile / Treinador / Início / default",x:trainerHomePos.x,y:trainerHomePos.y,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,placeholder:true})
trainerHomeContentId=Insert(trainerHomeDefaultId,{type:"frame",name:"Início content",layout:"vertical",gap:20,padding:[62,20,20,20],width:"fill_container"})
Insert(trainerHomeContentId,{type:"text",name:"Início greeting",fontFamily:"$--font-primary",fontSize:28,fill:"$--foreground",content:"Bom dia, João"})
Insert(trainerHomeContentId,{type:"text",name:"Início subtitle",fontFamily:"$--font-secondary",fontSize:15,lineHeight:1.45,fill:"$--muted-foreground",textGrowth:"fixed-width",width:"fill_container",content:"Acompanhe seus alunos de onde estiver."})
trainerHomeTabId=Insert(trainerHomeContentId,{type:"ref",name:"Treinador tabs Início",ref:mobileTabBarId,width:"fill_container"})
Update(trainerHomeDefaultId,{placeholder:false})
~~~

- [ ] **Step 2: Criar estados de Início**

No frame de estados, representar:

- carregando: skeleton da saudação e cartões;
- vazio: "Nenhum aluno vinculado para acompanhar.";
- erro: "Não foi possível carregar seu resumo." com "Tentar novamente".

- [ ] **Step 3: Criar a lista de Alunos**

Criar App header "Alunos", atualização manual "Atualizar" e quatro Student rows: "Mariana Costa", "Rafael Costa", "Ana Luiza" e "Pedro Alves". Cada linha mostra avatar, nome, última atividade curta e chevron.

Criar o frame de estados com "Carregando alunos...", "Nenhum aluno vinculado para acompanhar." e "Não foi possível carregar os alunos." com "Tentar novamente".

- [ ] **Step 4: Verificar navegação e limite de escopo**

Gerar screenshots do Início e da lista. Executar:

~~~js
Get(trainerHomeDefaultId,(n,c) => c.problems && Print(n.name,"|",c.problems))
Get(trainerStudentsListId,(n,c) => c.problems && Print(n.name,"|",c.problems))
Get(trainerHomeDefaultId,n => n.type === "text" && /Criar|Editar|Excluir|Salvar|Publicar/.test(n.content || "") && Print("FORBIDDEN TRAINER CTA",n.name,n.content))
Get(trainerStudentsListId,n => n.type === "text" && /Criar|Editar|Excluir|Salvar|Publicar/.test(n.content || "") && Print("FORBIDDEN TRAINER CTA",n.name,n.content))
~~~

O último par de consultas deve retornar vazio.

- [ ] **Step 5: Verificar e commitar a casca do treinador**

~~~powershell
git diff --check
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): adiciona acompanhamento mobile do treinador"
~~~

### Task 6: Criar o detalhe de aluno e as consultas de avaliação e treino do treinador

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Test: screenshots do detalhe de aluno, avaliação e treino em leitura

**Interfaces:**
- Consumes: Back header, Student row, Summary card, Assessment preview, Workout preview, State panel e Status badge.
- Produces: "trainerStudentDetailId", "trainerStudentStatesId", "trainerAssessmentsListId", "trainerAssessmentStatesId", "trainerAssessmentDetailId", "trainerWorkoutsListId", "trainerWorkoutStatesId" e "trainerWorkoutDetailId".
- Names materializados: "Mobile / Treinador / Aluno / detalhe", "Mobile / Treinador / Aluno / carregando-erro", "Mobile / Treinador / Avaliações / lista", "Mobile / Treinador / Avaliações / vazio-erro", "Mobile / Treinador / Avaliação / detalhe", "Mobile / Treinador / Treinos / lista", "Mobile / Treinador / Treinos / vazio-erro" e "Mobile / Treinador / Treino / detalhe".

- [ ] **Step 1: Criar o detalhe do aluno**

Criar Back header com "Mariana Costa", avatar, e-mail, objetivo "Hipertrofia", Summary cards "Última avaliação" e "Treino ativo" e dois cards de continuidade:

- "Avaliações" com subtítulo "3 registros";
- "Treinos" com subtítulo "Hipertrofia A ativo".

Cada card abre a lista correspondente. O frame de carregando-erro usa apenas skeleton e State panel "Não foi possível carregar o aluno." com "Tentar novamente".

~~~js
trainerStudentPos=FindEmptySpace({width:390,height:1050,direction:"right",padding:72,nodeId:trainerHomeDefaultId})
trainerStudentDetailId=Insert(document,{type:"frame",name:"Mobile / Treinador / Aluno / detalhe",x:trainerStudentPos.x,y:trainerStudentPos.y,width:390,height:"fit_content(844)",layout:"vertical",fill:"$--background",clip:true,placeholder:true})
trainerStudentContentId=Insert(trainerStudentDetailId,{type:"frame",name:"Aluno detail content",layout:"vertical",gap:16,padding:[62,20,20,20],width:"fill_container"})
Insert(trainerStudentContentId,{type:"text",name:"Aluno detail title",fontFamily:"$--font-primary",fontSize:28,fill:"$--foreground",content:"Mariana Costa"})
Insert(trainerStudentContentId,{type:"text",name:"Aluno objective",fontFamily:"$--font-secondary",fontSize:15,fill:"$--muted-foreground",content:"Objetivo: Hipertrofia"})
trainerAssessmentsLinkId=Insert(trainerStudentContentId,{type:"ref",name:"Avaliações navigation card",ref:mobileAssessmentPreviewId,width:"fill_container"})
trainerWorkoutsLinkId=Insert(trainerStudentContentId,{type:"ref",name:"Treinos navigation card",ref:mobileWorkoutPreviewId,width:"fill_container"})
Update(trainerStudentDetailId,{placeholder:false})
~~~

- [ ] **Step 2: Criar lista e detalhe de avaliações**

Criar lista cronológica de três avaliações e um estado "Nenhuma avaliação registrada." O detalhe mostra data, peso, gordura corporal, notas e a área de foto quando ela existir.

Usar cópias de texto:

- título: "Avaliação de 7 de agosto";
- peso: "68,2 kg";
- gordura corporal: "19,4%";
- notas: "Boa evolução de força e consistência nos treinos.".

Não desenhar botão de editar, salvar, excluir ou adicionar avaliação.

- [ ] **Step 3: Criar lista e detalhe de treinos**

Criar lista de planos com "Hipertrofia A" ativo e "Condicionamento" arquivado. O estado vazio diz "Nenhum treino disponível para este aluno.".

O detalhe de "Hipertrofia A" apresenta os dias "Treino A" e "Treino B"; em cada dia, exercise rows mostram nome, séries, repetições, carga, descanso e notas. Usar "Agachamento livre", "Supino reto" e "Remada baixa" como dados de referência.

Não desenhar botão de editar, salvar, criar plano, adicionar exercício ou publicar.

- [ ] **Step 4: Verificar o modo leitura**

Executar a auditoria em todos os frames de treinador:

~~~js
trainerFrameIds=[trainerStudentDetailId,trainerAssessmentsListId,trainerAssessmentDetailId,trainerWorkoutsListId,trainerWorkoutDetailId]
for (const frameId of trainerFrameIds) {
  Get(frameId,(n,c) => c.problems && Print("CLIP",frameId,n.name,c.problems))
  Get(frameId,n => n.type === "text" && /Criar|Editar|Excluir|Salvar|Publicar|Adicionar exercício/.test(n.content || "") && Print("FORBIDDEN",frameId,n.name,n.content))
}
~~~

Corrigir todas as linhas impressas antes de gerar screenshots de detalhe de aluno, detalhe de avaliação e detalhe de treino.

- [ ] **Step 5: Verificar e commitar os detalhes de treinador**

~~~powershell
git diff --check
git add assets/design/pencil_design.pen
git diff --cached --check
git commit -m "feat(design): referencia detalhes de aluno no mobile"
~~~

### Task 7: Catalogar referências, validar a entrega e atualizar o Linear

**Files:**
- Modify: "assets/design/pencil_design.pen"
- Modify: "docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md"
- Test: screenshots por seção, auditoria estrutural e diff final

**Interfaces:**
- Consumes: todos os IDs de frame e componente produzidos nas Tasks 1–6.
- Produces: tabela de IDs no documento de especificação e comentário de handoff no MUV-7.

- [ ] **Step 1: Imprimir o catálogo final de telas**

Executar uma única leitura que produz uma linha por frame top-level novo:

~~~js
Get((n,c) => c.depth === 0 && n.name && n.name.startsWith("Mobile /") && Print(n.id,"|",n.name,"|",c.bounds.width,"x",c.bounds.height))
~~~

Copiar exatamente os pares retornados, em ordem de nome, para uma nova tabela "Referências Pencil materializadas" logo após a seção "Handoff para implementação" da especificação. A tabela tem duas colunas: "Frame" e "Node ID".

- [ ] **Step 2: Fazer a revisão visual por seção**

Gerar screenshots somente após cada seção estar completa:

- board de componentes;
- autenticação e aluno;
- Início e Alunos do treinador;
- detalhe de aluno, avaliação e treino do treinador.

Para cada screenshot, verificar: layout não colapsado, nenhum conteúdo cortado, contraste suficiente, espaçamento consistente, tab bar visível e título da tela claro.

- [ ] **Step 3: Rodar auditoria final de clipping e de cópia proibida**

Executar:

~~~js
Get((n,c) => n.name && n.name.startsWith("Mobile /") && c.problems && Print("CLIP",n.id,n.name,c.problems))
Get((n,c) => n.name && n.name.startsWith("Mobile / Treinador") && n.type === "text" && /Criar|Editar|Excluir|Salvar|Publicar|Adicionar exercício/.test(n.content || "") && Print("FORBIDDEN TRAINER COPY",n.id,n.name,n.content))
~~~

Não encerrar a tarefa enquanto qualquer linha for impressa. Corrigir diretamente os nodes identificados, sem recriar a tela inteira.

- [ ] **Step 4: Registrar o handoff no Linear**

Criar um comentário no MUV-7 com o título "Referências Pencil para implementação". Abaixo dele, inserir as seções "Componentes compartilhados", "Aluno" e "Treinador". Em cada seção, adicionar um bullet por par real devolvido no Step 1, no formato "nome canônico — node ID". Encerrar com: "Escopo aprovado: o treinador consulta alunos, avaliações e treinos; criação e edição permanecem fora do mobile." Não incluir texto-modelo, IDs inventados ou referências ausentes.

- [ ] **Step 5: Executar verificação final e commitar documentação de handoff**

~~~powershell
git diff --check
rg -n -F '\u' docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md
git status --short
git add assets/design/pencil_design.pen docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md
git diff --cached --check
git commit -m "docs(design): registra referências do MUV-7"
~~~

Tratar saída vazia do rg como sucesso. Antes do stage, confirmar que o status contém somente os arquivos de design e especificação pertencentes ao MUV-7; preservar qualquer item externo.
