# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

O Muvit atende dois perfis no mesmo produto mobile: o aluno independente, que usa o celular para encontrar, executar e registrar o treino prescrito, e o professor/personal, correspondente à role `trainer`, que acompanha seus alunos e seus dados de treino. A sessão autenticada resolve o perfil; não existe seletor manual de role.

O aluno precisa consultar o treino do dia, iniciar ou retomar uma sessão guiada, registrar séries, atravessar períodos de descanso, concluir com segurança e acompanhar avaliações e evolução. O professor/personal precisa, nos cards próprios, acessar sua operação, localizar alunos e consultar avaliações e treinos; as ações específicas desse perfil evoluem em MUV-16 a MUV-19.

## Product Purpose

O Muvit é uma plataforma de treinos para personal trainers e alunos independentes. O dashboard do professor organiza a prescrição e o app mobile aproxima o aluno da execução cotidiana, registrando o que aconteceu no treino e sua evolução. O sucesso do mobile é permitir que cada perfil chegue rapidamente ao seu próximo trabalho, entenda o estado atual e recupere a jornada sem perder progresso.

## Positioning

O Muvit conecta a prescrição do professor à execução guiada do aluno e ao histórico de evolução no mesmo produto. O mobile não é apenas uma consulta de conteúdo: para o aluno, ele é o lugar de executar uma série por vez e registrar a conclusão; para o professor/personal, ele será uma superfície contextual de acompanhamento e operações essenciais, respeitando as regras da API.

## Operating Context

O app é uma aplicação Expo/React Native usada em telas móveis, com suporte configurado para Android e iOS; o iOS declara suporte a tablet. O uso ocorre com conectividade variável: o treino do aluno pode ser carregado do cache, a sessão guiada mantém um rascunho local e uma conclusão pode aguardar sincronização pela fila offline. O usuário também pode interromper a sessão, salvar e sair, retomar depois ou encerrá-la explicitamente.

O backend REST e os validators compartilhados são a autoridade dos contratos e das regras de domínio. A sessão Better Auth é a fonte de identidade, cookie e papel; o mobile não cria tokens próprios. Dados privados persistidos devem ser particionados pela identidade autenticada e os dados de treino do aluno usam as rotas self-scoped existentes.

## Capabilities and Constraints

- O fluxo atual do aluno inclui autenticação e cadastro de aluno independente, Hoje, visão geral e detalhes do treino, sessão guiada por exercício e série, descanso, retomada, saída segura, conclusão, fila offline, Progresso, Nova avaliação e Perfil.
- A experiência do professor/personal compartilhará o app e a foundation visual, mas sua entrada por role, guards, navegação própria e superfícies de alunos, avaliações e treinos pertencem aos cards MUV-16 a MUV-19.
- Loading, vazio, erro, retry, offline, sucesso, retomada, confirmação de saída e conclusão são estados funcionais que precisam permanecer compreensíveis durante qualquer refinamento.
- A navegação e o conteúdo definidos no MUV-7 continuam sendo referência funcional e de UX. O Pencil em `assets/design/pencil_design.pen` não é uma especificação visual pixel a pixel; a direção visual será registrada em `DESIGN.md` e evoluída com Impeccable.
- Better Auth, API, validators, banco, permissões, contratos self-scoped e regras de negócio existentes não mudam nesta consolidação.
- O cadastro disponível cria somente aluno independente. Cadastro, convite ou onboarding de professor/personal não fazem parte desta etapa.
- O app atualmente está configurado para interface clara; dark mode, novas funcionalidades de negócio, redesign geral e polish final do aplicativo permanecem fora do MUV-20.
- Textos visíveis e documentação do produto usam pt-BR com acentuação em UTF-8 literal.

## Brand Commitments

O nome Muvit e a linguagem de movimento são compromissos existentes do produto. O app já usa as expressões “movimento que transforma” e “SEU TREINO, NO SEU RITMO” em superfícies de marca. Essas expressões não devem ser ampliadas para claims de resultado, prova social ou métricas que não existam no produto.

## Evidence on Hand

- `README.md` descreve a plataforma de treinos, os perfis do dashboard e do mobile e os dados de demonstração.
- `assets/design/pencil_design.pen` contém as referências de fluxo e UX produzidas no MUV-7; seus nomes e estados também estão registrados em `docs/superpowers/specs/2026-08-07-layouts-mobile-aluno-professor-design.md`.
- `apps/mobile` contém a implementação atual do aluno, os componentes UI compartilhados, os tokens executáveis, os testes de tela e os serviços de sessão/offline.
- As issues Linear MUV-7, MUV-8, MUV-16, MUV-17, MUV-18 e MUV-19 registram escopo e dependências do Mobile MVP.
- Não há evidência confirmada neste ticket para depoimentos, clientes, métricas de impacto, disponibilidade de produção ou uma identidade visual diferente da já implementada.

## Product Principles

- **O próximo passo deve ser claro:** o aluno deve encontrar, iniciar, retomar ou concluir o treino sem perder o contexto.
- **Continuidade é parte do produto:** progresso parcial, falhas de rede e sincronização pendente devem ser tratados sem apagar trabalho nem prometer um estado que não foi confirmado.
- **Cada perfil tem um trabalho próprio:** a role vem da sessão, e a navegação de aluno e professor/personal permanece isolada.
- **Estado informa decisão:** loading, vazio, erro, retry, offline, confirmação e sucesso precisam explicar o que ocorreu e qual ação é segura.
- **Uma base compartilhada reduz atrito:** aluno e professor/personal devem reconhecer a mesma linguagem estrutural, mesmo quando seus fluxos e permissões forem diferentes.

## Accessibility & Inclusion

O mobile deve respeitar safe area, teclado e rolagem de conteúdo variável. Controles interativos precisam ter áreas tocáveis confortáveis, labels acessíveis, estado desabilitado perceptível e feedback que não dependa apenas de cor. Inputs devem indicar unidade, conteúdo esperado e teclado apropriado; textos longos não devem ser cortados por dimensões rígidas. Erros recuperáveis oferecem retry quando a operação permitir, e a sessão não termina implicitamente por uma saída de rota.
