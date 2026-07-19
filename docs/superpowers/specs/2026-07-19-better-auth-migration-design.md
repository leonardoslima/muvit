# Migração de autenticação para Better Auth

**Data:** 2026-07-19

## Contexto

O Muvit autentica treinadores e alunos com uma implementação própria baseada em bcrypt, JWT de acesso com 15 minutos, JWT de renovação com 30 dias e contratos HTTP específicos. O dashboard web converte cookies próprios em Bearer Token, enquanto o aplicativo mobile armazena access e refresh tokens no SecureStore e renova o acesso manualmente.

A aplicação ainda não possui usuários reais. A migração pode, portanto, substituir integralmente o modelo atual sem compatibilidade de dados, credenciais, sessões ou endpoints antigos.

## Objetivo

Substituir toda a autenticação própria pelo Better Auth, mantendo somente os recursos atuais de produto: cadastro e login com e-mail e senha, papéis `trainer` e `student`, sessão, logout e proteção das rotas da API.

Ao final, o Better Auth será a única implementação responsável por credenciais, cookies e sessões. Casos de uso de negócio continuarão independentes da biblioteca de autenticação.

## Fora de escopo

- Preservação de usuários, hashes, JWTs ou sessões existentes.
- Login social, passkeys, autenticação multifator ou magic links.
- Verificação de e-mail e recuperação de senha.
- Convite ou criação automática de conta para alunos gerenciados por treinador.
- Compatibilidade temporária com endpoints ou formatos de resposta antigos.
- Alteração dos contratos das rotas de negócio que não seja necessária para trocar a identidade autenticada.

## Decisões aprovadas

- A migração será limpa e destrutiva para dados locais de autenticação.
- Somente treinadores e alunos independentes terão identidade no Better Auth.
- Alunos criados por treinadores continuarão sem conta e sem capacidade de login.
- Web e mobile usarão a sessão padrão do Better Auth baseada em cookie.
- O mobile armazenará o cookie no SecureStore por meio do `expoClient`.
- Todos os endpoints, tokens, cookies, stores e contratos legados serão removidos.
- Cada e-mail será globalmente único e cada identidade terá exatamente um papel imutável.
- A sessão terá duração deslizante de 30 dias, com atualização diária.
- A identidade de autenticação ficará separada dos perfis de domínio.

## Arquitetura

### Fronteiras

O Better Auth será uma dependência de infraestrutura da API. Rotas Fastify validarão a sessão por uma interface de autenticação e entregarão aos casos de uso apenas uma identidade de aplicação resolvida.

```text
cookie Better Auth
  -> Fastify requireAuth
  -> Better Auth getSession
  -> resolvedor de perfil
  -> RequestIdentity { authUserId, profileId, role }
  -> caso de uso
```

`profileId` será o identificador usado pelas regras de negócio e pelas relações atuais. Casos de uso não importarão Better Auth, tipos de cookie, Fastify ou tabelas de sessão.

### Modelo de dados do Better Auth

O schema Drizzle terá as tabelas exigidas pelo Better Auth, com nomes físicos explícitos:

- `auth_users`: identidade, nome, e-mail globalmente único, verificação de e-mail, imagem, papel e timestamps.
- `auth_accounts`: conta de credencial e hash de senha mantido pelo Better Auth.
- `auth_sessions`: token opaco, validade, metadados e vínculo com a identidade.
- `auth_verifications`: registros internos de verificação exigidos pelo núcleo da biblioteca.

O adaptador Drizzle receberá o mapeamento explícito dessas tabelas. `auth_users.role` será um campo adicional obrigatório limitado a `trainer | student`.

### Perfis de domínio

`trainers` receberá `authUserId` obrigatório, único e referenciando `auth_users`. `students` receberá `authUserId` opcional e único; registros gerenciados permanecerão com valor nulo. As colunas `passwordHash` serão removidas das duas tabelas.

Nome, e-mail e avatar permanecerão nos perfis de domínio porque são consumidos pelas consultas e regras atuais. Os campos equivalentes do Better Auth existem para representar a identidade autenticável. Um adaptador de provisionamento manterá esses valores alinhados durante cadastro e futuras atualizações suportadas.

### Provisionamento

O cadastro por e-mail receberá o papel escolhido na interface. Como ambos os papéis permitem cadastro público, esse campo pode fazer parte do input inicial. Um hook de atualização rejeitará qualquer tentativa posterior de alterar `role`, inclusive chamadas diretas ao endpoint genérico de atualização de usuário.

Após criar `auth_users`, um hook provisionará exatamente um perfil:

- `trainer` cria um registro em `trainers` com `authUserId` preenchido;
- `student` cria um registro independente em `students`, também com `authUserId` preenchido.

Se o perfil não puder ser criado, o adaptador removerá imediatamente a identidade recém-criada e abortará o cadastro. Chaves estrangeiras com cascade removerão registros auxiliares eventualmente criados. Um teste de integração verificará que a falha não deixa identidade órfã.

## Configuração do Better Auth

A instância será configurada na API com:

- adaptador oficial para Drizzle e PostgreSQL;
- e-mail e senha habilitados;
- `BETTER_AUTH_SECRET` validado pelo ambiente;
- `baseURL` explícita por ambiente;
- sessão com `expiresIn` de 30 dias e `updateAge` de um dia;
- papel como campo adicional obrigatório do usuário;
- origens confiáveis restritas ao dashboard e aos schemes do aplicativo;
- compartilhamento de cookie entre subdomínios somente quando configurado em produção;
- rate limit explícito para cadastro e login;
- plugin Expo no servidor.

Cookies serão HTTP-only, `SameSite=Lax` e `Secure` quando a aplicação estiver em produção. Origens genéricas do Expo serão aceitas apenas no ambiente de desenvolvimento.

## Contratos HTTP e autorização

O handler padrão do Better Auth será montado no Fastify em `/api/auth/*`. Os clientes usarão as operações nativas:

- `signUp.email` para cadastro;
- `signIn.email` para login sem seleção de papel;
- `getSession` para recuperar identidade e sessão;
- `signOut` para revogar a sessão e expirar o cookie.

`requireAuth` e `requireRole` continuarão existindo como interfaces Fastify usadas pelas rotas de negócio. Suas implementações deixarão de validar JWT e passarão a consultar `auth.api.getSession()`. O resolvedor converterá o usuário autenticado em `RequestIdentity` e localizará o perfil correspondente por `authUserId`.

Uma sessão sem perfil relacionado será tratada como inconsistente: a API responderá `401`, registrará o problema sem dados sensíveis e impedirá a execução do caso de uso.

## Dashboard web

O dashboard terá um cliente Better Auth apontado para a API. Login, cadastro e logout chamarão esse cliente em vez do SDK OpenAPI legado.

O proxy usará somente a presença do cookie de sessão para redirecionamento otimista. Essa checagem não será considerada autorização. Páginas, Server Actions e chamadas protegidas continuarão validando a sessão na API.

O cliente da API deixará de montar `Authorization: Bearer`. Em chamadas server-side, ele encaminhará o header `Cookie` recebido pelo Next.js. CORS permitirá credenciais apenas para origens configuradas.

Os arquivos de cookies próprios, actions ligadas aos endpoints antigos e tipos gerados de autenticação serão removidos. O SDK OpenAPI continuará atendendo somente às rotas de negócio.

## Aplicativo mobile

O mobile usará `createAuthClient` com `expoClient`, scheme do Muvit e SecureStore. O estado autenticado será derivado da sessão do Better Auth, sem store de access token, refresh token ou ID de usuário duplicado.

Chamadas às rotas de negócio obterão o cookie com `authClient.getCookie()`, enviarão o header `Cookie` e usarão `credentials: "omit"` para evitar interferência do runtime nativo. Uma resposta `401` invalidará o estado local da sessão; não existirá tentativa de refresh manual.

A hidratação e o redirecionamento do Expo Router dependerão do estado de sessão fornecido pelo cliente Better Auth. A fila offline e o registro de push continuarão condicionados a uma sessão autenticada.

## Seed

O seed não escreverá hashes ou contas de credencial diretamente. Um orquestrador pertencente à API criará por `auth.api.signUpEmail()` o treinador demo e um aluno independente dedicado aos testes do mobile. Em seguida, passará os IDs dos perfis para as rotinas determinísticas de domínio mantidas em `packages/db`.

Os dez alunos vinculados ao treinador demo continuarão preenchendo o dashboard, avaliações, planos e histórico, mas não terão identidade, senha ou login. O aluno independente será um décimo primeiro registro, não vinculado ao treinador, com plano e histórico mínimos suficientes para exercitar o fluxo principal do mobile. As credenciais impressas e documentadas serão somente as do treinador e desse aluno independente.

O comando público de seed será ajustado para executar esse orquestrador. A idempotência será preservada por uma operação `ensure` que reutiliza identidades demo encontradas pelo e-mail e cria as ausentes pelo Better Auth, além das chaves determinísticas já usadas no cenário de domínio.

## Erros e observabilidade

Erros do Better Auth serão traduzidos nas bordas web e mobile para mensagens estáveis em pt-BR:

- credenciais inválidas terão mensagem genérica sem indicar se o e-mail existe;
- e-mail já cadastrado terá mensagem de conflito estável;
- excesso de tentativas orientará o usuário a aguardar;
- falhas inesperadas usarão mensagem neutra e detalhes apenas nos logs da API.

Senha, hash, cookie, token de sessão, secret e headers sensíveis nunca serão registrados nem retornados em erro. Logs de inconsistência identificarão apenas o tipo do problema e um correlation ID quando disponível.

## Remoção do legado

A implementação eliminará:

- dependências `@fastify/jwt` e `bcryptjs`;
- `JWT_SECRET` e exemplos de ambiente relacionados;
- helpers próprios de senha, access token e refresh token;
- plugin de validação JWT;
- casos de uso e repositório de signup, login, refresh e usuário atual;
- rotas `/auth/signup/trainer`, `/auth/signup/student`, `/auth/login`, `/auth/refresh` e `/auth/me`;
- schemas compartilhados e respostas contendo `accessToken` ou `refreshToken`;
- clientes OpenAPI e mocks desses endpoints;
- cookies `muvit_access` e `muvit_refresh`;
- store mobile de tokens e lógica de renovação;
- testes e documentação que descrevam o mecanismo removido.

O `AGENTS.md` específico de autenticação será atualizado no mesmo diff para substituir regras de JWT e bcrypt por regras de sessão Better Auth, resolução de perfil e proteção de cookies.

## Testes

### Banco e API

- Schema e migration das tabelas Better Auth e vínculos de perfil.
- Cadastro de treinador e aluno independente com perfil correto.
- Criação de aluno gerenciado sem `authUserId`.
- Rejeição de e-mail duplicado entre papéis.
- Login, sessão, logout, expiração e renovação deslizante.
- Bloqueio por papel e resolução correta de `profileId`.
- Falha de provisionamento sem identidade órfã.
- Sessão válida com perfil ausente retornando `401`.
- Rotas de negócio autenticadas por cookie.
- Seed determinístico e idempotente, com dez alunos gerenciados sem login e um aluno independente autenticável.

### Web

- Login, cadastro e logout pelo cliente Better Auth.
- Mensagens de erro traduzidas.
- Redirecionamento otimista do proxy pela presença do cookie.
- Validação real de sessão nas páginas protegidas.
- Encaminhamento de cookie em chamadas server-side.

### Mobile

- Inicialização do cliente Expo com SecureStore.
- Hidratação e redirecionamento conforme a sessão.
- Inclusão do cookie em chamadas protegidas.
- Limpeza do estado local após logout ou `401`.
- Condicionamento da fila offline e do push à sessão.

## Verificação final

Serão executados, a partir da raiz, migrations do banco de teste, testes específicos e completos de `packages/db`, `apps/api`, `apps/web`, `apps/mobile` e `packages/validators`, além de typecheck, Biome e build dos workspaces afetados.

Antes de concluir, o diff será pesquisado por escapes Unicode indevidos e o repositório será pesquisado por identificadores legados como `JWT_SECRET`, `muvit_access`, `muvit_refresh`, `refreshToken`, `passwordHash`, `@fastify/jwt` e `bcryptjs`. Ocorrências históricas em documentos de planos antigos serão avaliadas separadamente; código, configuração e documentação operacional atuais não poderão depender do mecanismo removido.

## Critérios de aceite

- Treinador e aluno independente conseguem cadastrar, entrar, manter sessão e sair no cliente correspondente.
- Aluno gerenciado continua sem conta de autenticação.
- Todas as rotas protegidas usam sessão Better Auth e preservam as regras atuais de papel e propriedade.
- Nenhum endpoint, token, cookie, dependência ou código de execução da autenticação legada permanece.
- O seed demo preserva os dez alunos gerenciados do dashboard, adiciona um aluno independente para o mobile e produz somente as credenciais Better Auth válidas do treinador e do aluno independente.
- Migration, testes, typecheck, lint e build relevantes passam com evidência atual.
