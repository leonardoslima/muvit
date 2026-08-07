# Alinhamento da área autenticada web ao Pencil

## Contexto

A área autenticada do dashboard web implementa parcialmente os fluxos definidos em `assets/design/pencil_design.pen`. Dashboard, perfil do aluno, exercícios, avaliações, cadastro de aluno e treinos já possuem rotas ou componentes, mas divergem da composição visual aprovada e não cobrem todos os estados do Pencil. Relatórios e Configurações ainda não existem como funcionalidades completas.

Esta etapa alinha a área autenticada ao Pencil, implementa telas e estados ausentes e adiciona o suporte de banco e API necessário. A landing page pública e o app mobile ficam fora do escopo, salvo ajustes compatíveis em contratos compartilhados consumidos por eles.

## Fontes de verdade

- Design: `assets/design/pencil_design.pen`.
- Tokens visuais: variáveis do Pencil e `apps/web/src/app/globals.css`.
- Arquitetura e convenções: `AGENTS.md` da raiz e arquivos locais de `apps/web`, `apps/api`, `packages/db` e `packages/validators`.
- Contratos atuais: schemas de `packages/validators` e OpenAPI/SDK gerado.
- Identidade: Better Auth permanece a única fonte de sessão, senha e e-mail de login.

## Frames do Pencil no escopo

- `dM0L4`: Trainer Dashboard — Muvit.
- `Wg556`: Student Profile — Muvit.
- `WGclk`: Workout Builder — Muvit.
- `XOIIZ`: Workout Builder — Empty Screen State.
- `FsBnA`: Exercise Library — Muvit.
- `grTSd`: New Custom Exercise Modal — Muvit.
- `yDgPu`: New Student — Step 1.
- `GTg6a`: New Student — Step 2.
- `Z6aKg`: New Student — Step 3.
- `WHVaZ`: Physical Assessment — Record New.
- `s268U`: Physical Assessment — History.
- `pdDTg`: Reports & Evolution — Muvit.
- `DkxTf`: Settings — My Profile.
- `mCtHf`: Settings — Plan & Billing.
- `y0Ydi`: Settings — Notifications.

## Objetivo

Entregar a área autenticada completa e consistente com o Pencil em desktop de 1440 px, com adaptação responsiva funcional, estados acessíveis e dados reais. As novas capacidades de perfil, relatórios, preferências de notificações e cobrança interna devem ser persistidas e autorizadas no back-end.

## Estratégia de entrega

O trabalho será executado em fatias verticais. Cada fluxo inclui banco, validators, API, SDK, web e testes quando essas camadas forem necessárias. A ordem aprovada é:

1. fundações compartilhadas;
2. telas existentes;
3. cadastro de aluno e avaliações;
4. construtor de treinos;
5. relatórios;
6. configurações.

Cada fatia deve terminar em software testável e visualmente verificável antes da próxima.

## Arquitetura

### Banco e contratos

`packages/db` ampliará o perfil do treinador e criará representações próprias para preferências de notificação, assinatura e faturas internas. `packages/validators` concentrará os contratos compartilhados de perfil, relatórios, notificações e cobrança. Mudanças opcionais devem preservar consumidores existentes.

O enum de planos existente continuará aceitando `free`, `starter`, `pro` e `team`. A coluna atual `trainers.plan` permanece como leitura rápida e compatível do plano vigente; detalhes de periodicidade, status e renovação pertencem à assinatura.

### API

Cada capacidade terá rota fina, caso de uso focado e porta de repositório orientada ao consumidor. Implementações Drizzle permanecerão nos módulos correspondentes. As rotas usarão `request.identity.profileId`; nenhum endpoint aceitará um ID de treinador fornecido pelo cliente para determinar ownership.

Contratos principais:

- `GET /trainers/me`: retorna perfil profissional do treinador autenticado.
- `PATCH /trainers/me`: atualiza nome, e-mail, telefone, bio, especialidades e avatar.
- `GET /trainers/me/notification-preferences`: retorna preferências efetivas, incluindo defaults.
- `PATCH /trainers/me/notification-preferences`: persiste ativações, canais e prazo de inatividade.
- `GET /trainers/me/subscription`: retorna catálogo, assinatura atual, uso de alunos e faturas.
- `PATCH /trainers/me/subscription`: altera plano e periodicidade internamente.
- `GET /trainers/me/invoices/:id`: retorna documento imprimível de uma fatura pertencente ao treinador.
- `GET /reports/students/:studentId`: retorna agregados do aluno no período autorizado.

O SDK web será regenerado depois de estabilizar o OpenAPI.

### Web

Server Components carregam dados iniciais e validam acesso. Client Components ficam restritos a filtros, formulários, drawers, wizards, gráficos e outras interações reais. Regras de payload, parsing e agregação testável permanecem em `src/application` ou `src/lib`, não em componentes nem Server Actions.

Primitives existentes em `src/components/ui` serão reutilizados. Composições compartilhadas só serão criadas quando houver repetição comprovada, como layout de Configurações, shell de página, campos de estado e superfícies de gráfico.

## Perfil do treinador e Better Auth

O perfil profissional armazenará nome, telefone, bio, especialidades e avatar. O e-mail exibido na tela é também o e-mail de login e deve permanecer sincronizado com Better Auth.

`PATCH /trainers/me` coordenará a atualização da identidade Better Auth e do perfil de domínio. O módulo de negócio dependerá de uma porta pequena para atualizar a identidade, mantendo Better Auth isolado em infraestrutura de autenticação. Se a segunda gravação falhar, a primeira será compensada para restaurar o valor anterior. E-mail duplicado e falha de sincronização serão erros esperados e traduzidos na borda.

Após sucesso, a sessão, a sidebar e a tela devem refletir nome, avatar e e-mail atualizados sem exigir novo login.

## Preferências e envio de notificações

As preferências serão um recurso um-para-um por treinador, com defaults explícitos quando ainda não houver linha persistida. Elas cobrem:

- alerta de inatividade de aluno, com quantidade configurável de dias;
- vencimento próximo do plano de treino;
- avaliação pendente ou desatualizada;
- novo cadastro de aluno vinculado;
- canal `email`, `push` ou `both` quando aplicável;
- ativação independente de cada evento.

O job diário existente passará a buscar e respeitar as preferências do treinador antes de enviar mensagens. O alerta de novo cadastro será disparado no fluxo de criação de aluno vinculado. Falhas de entrega não podem desfazer a criação do aluno; serão registradas sem dados sensíveis.

## Assinatura e cobrança interna

Não haverá gateway, checkout, cartão, cobrança, estorno nem webhooks nesta etapa. O back-end modelará catálogo, assinatura e histórico para sustentar a interface e as regras de limite.

Planos e limites de alunos ativos:

- `free`: 3;
- `starter`: 15;
- `pro`: 50;
- `team`: ilimitado.

O limite será validado no caso de uso de criação e reativação de aluno. Tentativas acima do limite retornam erro de domínio claro e não persistem mudança parcial.

Uma alteração de plano ou periodicidade entra em vigor imediatamente e cria uma fatura interna com status `issued`. Nenhuma fatura é marcada como `paid` automaticamente. Faturas históricas já pagas podem existir em seed ou migração de demonstração. O documento de fatura será uma página imprimível pertencente ao treinador autenticado.

## Relatórios

`/reports` exige seleção de aluno e aceita os períodos `30d`, `90d`, `6m`, `all` ou intervalo personalizado. Datas customizadas devem formar um intervalo válido. A API verificará que o aluno pertence ao treinador autenticado antes de consultar qualquer dado.

A resposta agregada conterá somente dados derivados de avaliações, planos, logs e séries existentes:

- evolução de peso e percentual de gordura;
- mudanças de medidas entre a primeira e a última avaliação do período;
- fotos de comparação quando existirem;
- treinos concluídos, aderência e frequência por dia;
- melhores cargas, progressão e volume por exercício;
- tendência média de RPE;
- resumo determinístico baseado nos agregados;
- sinalização de dados insuficientes por seção.

O resumo não usará serviço de IA. A exportação em PDF será atendida por uma versão imprimível da rota e pelo diálogo de impressão do navegador, evitando uma dependência de geração de PDF no servidor.

## Shell e responsividade

O desktop de 1440 px é a referência de fidelidade. Sidebar, tipografia, espaçamento, cartões, tabelas e cabeçalhos devem reproduzir a hierarquia do Pencil usando os tokens atuais. Não serão introduzidos hexadecimais quando existir token equivalente.

Em viewports menores:

- a navegação passa a uma apresentação compacta acessível;
- tabelas preservam colunas importantes e usam overflow horizontal quando necessário;
- grids e painéis laterais viram pilhas;
- drawers usam superfície fixa e backdrop;
- nenhuma ação ou informação essencial fica inacessível.

Não será inventado um segundo design mobile detalhado.

## Fluxos existentes

### Dashboard

`/dashboard` alinhará cabeçalho, métricas e tabela ao frame `dM0L4`, usando os agregados e alunos reais já disponíveis. Falha parcial de métricas não deve ocultar a navegação nem ações principais.

### Perfil do aluno

`/students/[id]` adotará o cabeçalho, abas e composição em três colunas do frame `Wg556`. Visão geral, informações pessoais, avaliações e treinos continuarão baseados nos contratos atuais. Cada card deve cobrir loading, erro, vazio e conteúdo sem duplicar regra de negócio.

### Cadastro de aluno

`/students/new` será um wizard de três etapas correspondente a `yDgPu`, `GTg6a` e `Z6aKg`:

1. informações básicas;
2. objetivos e restrições;
3. sucesso e próximos passos.

O rascunho permanece apenas em memória no navegador até a confirmação da segunda etapa. Recarregar ou abandonar a rota o descarta. Não haverá registro parcial nem armazenamento persistente de dados pessoais. A etapa final oferece criar treino, registrar avaliação ou abrir o perfil criado.

### Avaliações

`/students/[id]/assessments/new` alinhará métricas, medidas, fotos e notas ao frame `WHVaZ`. `/students/[id]/assessments` alinhará histórico, gráficos e comparação ao frame `s268U`. Uploads continuam usando o fluxo presign existente. Histórico vazio, avaliação única, ausência de medidas ou fotos e erro de carregamento terão estados próprios.

### Exercícios

`/exercises` alinhará grade, busca, filtros e ações ao frame `FsBnA`. O modal de exercício personalizado seguirá `grTSd`. Biblioteca vazia, filtro sem resultado, erro e criação pendente ou inválida serão explícitos e acessíveis.

### Treinos

`/workouts` será o construtor canônico conforme a especificação aprovada em `docs/superpowers/specs/2026-07-30-construtor-treinos-design.md`, usando `WGclk` e `XOIIZ`. O fluxo inclui painel de detalhes, dias, tabela, estado vazio, drawer de exercícios, confirmações destrutivas e salvamento real. `/workouts/new?studentId=...` continuará como redirecionamento compatível.

## Configurações

As rotas `/settings/profile`, `/settings/notifications` e `/settings/billing` compartilharão sidebar secundária e cabeçalho. Entradas “Integrações” e “Privacidade e Segurança”, visíveis no menu do Pencil sem frames correspondentes, aparecerão desabilitadas com indicação “Em breve”; não serão criadas rotas sem design ou regra aprovada.

Formulários terão labels visíveis, erros associados aos campos, feedback de salvamento e prevenção de submissão concorrente. Alterações de plano e periodicidade exigem confirmação.

## Estados e tratamento de erros

Todas as telas com dados remotos cobrirão loading, erro, vazio e sucesso. Estados parciais serão usados quando uma seção puder continuar útil apesar da falha de outra.

Erros esperados incluem:

- sessão ausente ou papel incorreto;
- recurso fora do ownership do treinador;
- e-mail já utilizado;
- falha compensada de sincronização com Better Auth;
- limite de alunos excedido;
- plano ou periodicidade inválidos;
- intervalo de relatório inválido;
- relatório sem dados suficientes;
- fatura inexistente ou pertencente a outro treinador.

Detalhes internos não serão expostos ao usuário.

## Acessibilidade

- Navegação e abas terão semântica e estado ativo perceptíveis.
- Inputs terão labels associados, mensagens com `role="alert"` e foco no primeiro erro relevante.
- Botões apenas com ícone terão nome acessível.
- Diálogos e drawers gerenciarão foco, `Escape` e retorno ao gatilho.
- Gráficos terão resumo textual ou tabela equivalente.
- Cores de estado não serão o único meio de comunicação.
- Ações destrutivas usarão `ConfirmationDialog`.

## Verificação

- Testes de validators para entradas válidas, limites e refinamentos.
- Testes de migration, constraints e relações quando aplicável.
- Testes unitários de casos de uso e agregadores.
- Testes de rota para autenticação, autorização, respostas e erros de domínio.
- Testes do job de notificações respeitando preferências.
- Teste da compensação na atualização de e-mail.
- Testes web de estados e interações com Testing Library.
- Comparação visual em navegador local a 1440 px contra cada frame do escopo.
- Verificação responsiva, teclado, foco, overflow e console.
- `pnpm.cmd --filter @muvit/validators test` e `typecheck`.
- `pnpm.cmd --filter @muvit/db typecheck` e `migrate:test`.
- `pnpm.cmd --dir apps/api test` e `typecheck`.
- `pnpm.cmd --dir apps/web test`, coberturas aplicáveis e `typecheck`.
- `pnpm.cmd exec biome check` limitado aos workspaces afetados.
- `git diff --check`.
- Busca por sequências de escape Unicode nos arquivos textuais alterados.

## Fora do escopo

- Landing page pública.
- Redesign ou novas funcionalidades do app mobile.
- Processamento real de pagamentos.
- Checkout, cartões, webhooks, estornos ou integração com gateway.
- Geração de texto por IA.
- Rotas completas de Integrações ou Privacidade e Segurança sem frames aprovados.
- Alteração do arquivo `.pen`.

## Critérios de aceite

- Todos os frames autenticados listados possuem rota ou estado correspondente na web.
- O desktop em 1440 px corresponde visualmente ao Pencil e a interface permanece funcional em viewports menores.
- Dados exibidos vêm da API; não há mocks de produção ou valores demonstrativos hardcoded nas telas autenticadas.
- Perfil e e-mail de login permanecem sincronizados com Better Auth.
- Preferências controlam os envios de notificação correspondentes.
- Limites de plano são aplicados pelo back-end sem cobrança real.
- Relatórios respeitam período e ownership e apresentam estados de dados insuficientes.
- Fluxos existentes preservam contratos e links compatíveis.
- Testes e verificações aplicáveis passam sem alterações fora do escopo.
