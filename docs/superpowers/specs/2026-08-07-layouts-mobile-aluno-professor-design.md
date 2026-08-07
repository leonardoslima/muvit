# Layouts mobile de aluno e professor no Pencil

## Contexto

A issue [MUV-7](https://linear.app/muvit/issue/MUV-7/criar-layouts-mobile-de-aluno-e-professor-no-pencil) define o design que antecede a evolução do Mobile MVP. Hoje, "apps/mobile" implementa somente o fluxo autenticado de aluno: login, cadastro de aluno independente, treino do dia, registro de treino, progresso, nova avaliação e perfil. A sessão diferente de "student" é redirecionada ao login.

O mesmo aplicativo passará a atender treinadores. O Pencil deve consolidar a experiência visual do aluno e definir uma experiência de acompanhamento para o treinador, sem antecipar mudanças de API, Expo Router ou regras de autorização. As issues MUV-8, MUV-16, MUV-17, MUV-18 e MUV-19 consumirão este design.

## Fontes de verdade

- Issue MUV-7 e as issues dependentes do projeto Mobile MVP.
- "assets/design/pencil_design.pen", incluindo o Style Guide e os componentes reutilizáveis existentes.
- "apps/mobile/app/_layout.tsx" e "apps/mobile/app/(tabs)/_layout.tsx", para a navegação e o guard atuais.
- "apps/mobile/src/screens", para os fluxos funcionais já disponíveis ao aluno.
- "apps/mobile/src/lib/styles.ts", para os tokens visuais atuais.
- "AGENTS.md" da raiz e "apps/mobile/AGENTS.md".

## Objetivo

Criar no Pencil referências mobile claras, completas e reutilizáveis para:

- redesenhar os fluxos funcionais existentes do aluno;
- habilitar uma navegação própria de treinador;
- acompanhar alunos, avaliações e treinos em modo leitura;
- documentar estados de carregamento, vazio, erro e sucesso;
- permitir que os tickets de implementação trabalhem sem decisões de experiência em aberto.

## Decisões aprovadas

- O design trata a role de API "trainer" como **Treinador** na cópia visível em pt-BR. “Professor” e “personal” são sinônimos do mesmo perfil no contexto da issue.
- A role é resolvida pela sessão autenticada; não existe seletor de perfil, troca manual de role ou tela de escolha após o login.
- O cadastro existente continua criando somente aluno independente. Cadastro, convite ou onboarding de treinador não fazem parte desta entrega.
- A experiência do aluno mantém três destinos principais: **Hoje**, **Progresso** e **Perfil**.
- A experiência do treinador possui três destinos principais: **Início**, **Alunos** e **Perfil**.
- Avaliações e treinos do treinador ficam contextualizados dentro do detalhe do aluno, sem uma quarta aba.
- O treinador consulta informações, atualiza a visualização e navega entre detalhes. Criar, editar, excluir, publicar ou montar avaliações, planos e exercícios não fazem parte do mobile.
- Não haverá atalho para o dashboard web enquanto não existir um contrato explícito de deep link.
- O MUV-7 é uma entrega de design. O guard de sessão, as rotas e as chamadas de dados serão modificados somente nas issues de implementação.

## Arquitetura de navegação

### Fluxo compartilhado

Login e Criar conta permanecem compartilhados entre as experiências. Após autenticar, a sessão decide o destino inicial:

- aluno segue para **Hoje**;
- treinador segue para **Início**;
- pessoa não autenticada permanece no fluxo de autenticação.

O login exibe validação, submissão e erro de credencial sem mudar a estrutura da tela. O estado de sucesso não exige uma tela intermediária: o redirecionamento para a navegação da role é o feedback de conclusão.

### Aluno

| Destino | Intenção principal | Navegação de continuidade |
| --- | --- | --- |
| Hoje | Encontrar e iniciar o treino do dia. | Abrir exercício, iniciar registro e retornar após finalizar. |
| Progresso | Consultar o histórico de avaliações e iniciar a avaliação própria já existente. | Abrir a nova avaliação e voltar ao histórico atualizado. |
| Perfil | Consultar identidade e encerrar a sessão. | Sair e retornar ao login. |

O fluxo de treino preserva o comportamento já implementado: o aluno abre detalhes de exercício em uma superfície inferior, inicia o registro do dia, marca séries, informa repetições e carga e finaliza. A finalização apresenta feedback de sucesso antes de devolver o usuário à experiência de Hoje. O indicador de conteúdo offline continua explícito no treino disponível em cache.

### Treinador

| Destino | Intenção principal | Navegação de continuidade |
| --- | --- | --- |
| Início | Entender rapidamente a operação e chegar aos alunos. | Abrir a lista de alunos ou um aluno destacado. |
| Alunos | Localizar e abrir um aluno vinculado. | Abrir o detalhe do aluno. |
| Perfil | Consultar identidade e encerrar a sessão. | Sair e retornar ao login. |

O detalhe do aluno é o hub de acompanhamento. Ele contém identificação, resumo útil, última avaliação e plano ativo. Os cards de avaliação e treino levam às respectivas listas e detalhes somente de leitura:

- **Avaliações:** lista cronológica, estado sem avaliações e detalhe com medidas, notas e foto quando disponível.
- **Treinos:** lista de planos, estado sem plano ativo e detalhe de plano com dias, exercícios, séries, repetições, carga, descanso e notas quando disponíveis.

Os detalhes não exibem botão de criar, editar, excluir, salvar, publicar ou adicionar exercício. Atualização manual é permitida como ação simples de recarregamento.

## Inventário de frames do Pencil

Cada referência final usa o nome canônico "Mobile / <role> / <fluxo> / <estado>". Frames de tela são top-level, têm largura de 390 px, "clip: true" e altura baseada no conteúdo com referência inicial de 844 px. A árvore de componentes fica separada das telas e nenhum frame desktop existente é movido, renomeado ou alterado.

### Componentes compartilhados

- "Mobile / Component / Screen shell"
- "Mobile / Component / App header"
- "Mobile / Component / Back header"
- "Mobile / Component / Tab bar"
- "Mobile / Component / Primary button"
- "Mobile / Component / Secondary button"
- "Mobile / Component / Summary card"
- "Mobile / Component / Student row"
- "Mobile / Component / Workout preview"
- "Mobile / Component / Assessment preview"
- "Mobile / Component / Status badge"
- "Mobile / Component / State panel"

Os componentes reutilizam os tokens e a intenção visual dos componentes atuais do arquivo Pencil. Adaptações de densidade, área de toque e disposição são específicas do mobile e não alteram as instâncias desktop.

### Referências de aluno

- "Mobile / Aluno / Login / default"
- "Mobile / Aluno / Login / submitting-error"
- "Mobile / Aluno / Cadastro / default"
- "Mobile / Aluno / Cadastro / submitting-error"
- "Mobile / Aluno / Hoje / treino-ativo"
- "Mobile / Aluno / Hoje / carregando"
- "Mobile / Aluno / Hoje / sem-treino"
- "Mobile / Aluno / Hoje / erro"
- "Mobile / Aluno / Exercício / detalhes"
- "Mobile / Aluno / Registro de treino / default"
- "Mobile / Aluno / Registro de treino / carregando-erro"
- "Mobile / Aluno / Registro de treino / sucesso"
- "Mobile / Aluno / Progresso / com-avaliações"
- "Mobile / Aluno / Progresso / carregando-vazio-erro"
- "Mobile / Aluno / Nova avaliação / default"
- "Mobile / Aluno / Nova avaliação / enviando-erro-sucesso"
- "Mobile / Aluno / Perfil / default"

### Referências de treinador

- "Mobile / Treinador / Início / default"
- "Mobile / Treinador / Início / carregando-vazio-erro"
- "Mobile / Treinador / Alunos / lista"
- "Mobile / Treinador / Alunos / carregando-vazio-erro"
- "Mobile / Treinador / Aluno / detalhe"
- "Mobile / Treinador / Aluno / carregando-erro"
- "Mobile / Treinador / Avaliações / lista"
- "Mobile / Treinador / Avaliações / vazio-erro"
- "Mobile / Treinador / Avaliação / detalhe"
- "Mobile / Treinador / Treinos / lista"
- "Mobile / Treinador / Treinos / vazio-erro"
- "Mobile / Treinador / Treino / detalhe"
- "Mobile / Treinador / Perfil / default"

Estados unidos pelo hífen pertencem ao mesmo frame de referência e aparecem como variantes claramente separadas, com label de estado. Isso evita duplicar telas cuja estrutura é idêntica e, ao mesmo tempo, torna explícito o comportamento que a implementação deve cobrir.

## Sistema visual mobile

O design usa os tokens atuais do aplicativo, sem introduzir paleta paralela:

- fundo: "#F7F7F2";
- superfície: "#FFFFFF";
- texto principal: "#18201B";
- texto secundário: "#647067";
- borda: "#DFE4DC";
- ação primária: "#2F6F4E";
- destaque: "#D9902F";
- erro: "#B42318".

O texto usa Inter. O título de tela possui escala consistente; títulos de card, corpo, labels e mensagens de estado preservam hierarquia legível sem reduzir o contraste. Conteúdo visível permanece em pt-BR com caracteres UTF-8 literais.

As telas seguem esta estrutura:

1. status bar de 62 px;
2. wrapper de conteúdo com 20 px laterais;
3. espaçamento de 24–32 px entre seções e 12–16 px entre elementos relacionados;
4. tab bar flutuante ao final da pilha, com três itens, extremidades em cápsula, destaque verde para o destino selecionado e área tocável confortável.

O layout usa frames verticais e horizontais com sizing dinâmico. Textos longos usam crescimento com largura fixa e não são posicionados por dimensões arbitrárias. O conteúdo deve caber sem corte, inclusive quando notas ou nomes de exercício forem mais extensos.

## Estados e feedback

O componente "State panel" segue uma estrutura única: ícone compreensível, título, explicação e ação apenas quando ela é possível.

- **Carregando:** skeleton ou indicador com texto curto; a hierarquia da tela permanece reconhecível.
- **Vazio:** explica por que não há conteúdo e qual é o próximo passo permitido. Exemplo de aluno: “Quando seu treinador publicar um treino ativo, ele aparece aqui.” Exemplo de treinador: “Nenhum aluno vinculado para acompanhar.”
- **Erro:** explica que a carga falhou e oferece “Tentar novamente” ou atualização manual, sem descartar o contexto já visível.
- **Sucesso:** confirma somente ações que realmente ocorrem no mobile, como finalizar treino ou salvar a avaliação própria do aluno.
- **Offline:** aparece no contexto do treino do aluno quando o conteúdo vem do cache, sem sugerir que uma ação de edição foi sincronizada.

## Interações e acessibilidade

- Todo destino de tab informa visual e textualmente o item selecionado.
- Cards de aluno, avaliação e treino mostram affordance de abertura e mantêm área tocável de pelo menos 44 px.
- A superfície inferior de detalhes de exercício possui título, botão de fechar e retorno de foco ao gatilho.
- Campos de login, cadastro, registro de treino e nova avaliação possuem label ou placeholder inequívoco, teclado apropriado e mensagem de erro próxima ao campo quando aplicável.
- A ação primária fica alcançável na metade inferior da tela quando o fluxo permitir.
- A lista de aluno pode ser atualizada manualmente; ela não depende de busca ou filtro nesta primeira referência.
- Cópias e estados distinguem “sem conteúdo” de “não foi possível carregar”.

## Handoff para implementação

MUV-8 implementa as referências de aluno sem remover os comportamentos atuais. MUV-16 usa a decisão de entrada por role, estrutura os guards e monta as tabs de treinador. MUV-17 implementa Início, Alunos e detalhe de aluno. MUV-18 e MUV-19 implementam as referências de leitura de avaliações e treinos.

Após criar os frames, o PR de design deve listar os nomes canônicos e os IDs devolvidos pelo Pencil para cada tela top-level. Assim, cada ticket dependente poderá apontar para uma referência estável sem depender de coordenadas no canvas.

## Alternativas descartadas

- Uma quarta aba de acompanhamento para treinador foi descartada porque avaliações e treinos pertencem ao contexto de um aluno e duplicariam a navegação.
- Um fluxo mobile completo de CRUD para treinador foi descartado por ampliar o MVP e competir com o dashboard web. A decisão aprovada é consulta e atualização simples.
- Um seletor manual de role foi descartado porque a sessão já contém a identidade necessária e criaria uma transição ambígua.
- Busca e filtros de alunos não aparecem na referência base porque ainda dependeriam de contrato de endpoint; a lista simples e a atualização manual atendem o fluxo essencial.

## Fora do escopo

- Alterar autenticação, Expo Router, chamadas de API, validators, banco ou permissões.
- Criar, editar, excluir, publicar ou montar avaliações, planos e exercícios no fluxo de treinador.
- Criar cadastro ou onboarding de treinador.
- Criar deep links para o dashboard web.
- Redesenhar as telas desktop existentes no arquivo Pencil.
- Adicionar dependências ao monorepo.

## Verificação

- Conferir visualmente cada frame top-level e cada estado com screenshot do Pencil.
- Verificar contraste, alinhamento, área tocável, conteúdo sem corte e clareza da navegação de cada role.
- Confirmar que todos os destinos listados possuem origem e destino explícitos no design.
- Conferir que o treinador não possui CTA mutável nos cards, listas ou detalhes.
- Executar "git diff --check".
- Procurar escapes Unicode de quatro dígitos no documento alterado e preservar a acentuação em UTF-8 literal.

## Critérios de aceite

- O arquivo Pencil contém os fluxos essenciais de aluno e treinador necessários para o Mobile MVP.
- A navegação de aluno e treinador é clara, isolada por role e não deixa decisões de experiência em aberto.
- Os layouts documentam estados de carregamento, vazio, erro e sucesso aplicáveis.
- Avaliações e treinos do treinador são consultáveis a partir do detalhe do aluno e não expõem criação ou edição.
- Componentes e tokens compartilhados são identificáveis, sem alterar os frames desktop existentes.
- Os nomes e IDs dos frames finais ficam registráveis no PR de design.
