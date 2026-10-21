# Muvit

Plataforma de treinos para personal trainers e alunos independentes.

Monorepo gerenciado por pnpm + Turborepo.

## Estrutura

```
apps/
  web/          Dashboard do trainer (Next.js 16)
  api/          Backend REST (Fastify)
  mobile/       App do aluno (React Native / Expo) — TODO
packages/
  db/           Schema Drizzle + migrações
  validators/   Schemas Zod compartilhados
  config/       Configs base (TS, Biome)
  ui/           Componentes shadcn/ui — TODO
assets/
  design/       Arquivos do Pencil (.pen) e exports de design
  images/       Mockups e screenshots de referência
```

## Setup

Use Node.js 24 LTS e pnpm 10, conforme o campo `packageManager` da raiz. O CI usa Node.js 24; mantenha a mesma versão principal no desenvolvimento local e nos ambientes de execução da API e da web.

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
cp packages/db/.env.example packages/db/.env
cp apps/api/.env.test.example apps/api/.env.test
cp packages/db/.env.test.example packages/db/.env.test
docker compose up -d postgres postgres_test redis
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333
- API docs: http://localhost:3333/docs
- PostgreSQL de desenvolvimento: `localhost:5432`, banco `muvit`
- PostgreSQL de teste: `localhost:5433`, banco `muvit_api_test`

### Banco de testes e testes de integração

O ambiente local mantém dois bancos PostgreSQL isolados:

- `muvit` em `localhost:5432` é o banco de desenvolvimento usado pela aplicação normalmente.
- `muvit_api_test` em `localhost:5433` é usado exclusivamente pelos testes de integração da API.

Ao executar os testes da API, o script aplica as migrations ao banco configurado em `apps/api/.env.test` e os testes de integração limpam suas tabelas antes de cada caso. A limpeza usa `TRUNCATE ... RESTART IDENTITY CASCADE`: remove os dados de teste, reinicia os contadores de IDs e limpa registros relacionados. Ela não remove o banco, as tabelas ou as migrations.

Nunca aponte `DATABASE_URL` de teste para `muvit`: essa limpeza apagaria os dados de desenvolvimento. A aplicação iniciada em modo de desenvolvimento continua usando apenas os arquivos `.env`, não os `.env.test`.

### Testes no CI

Cada pull request executa `pnpm test` da raiz no job `Test (Turborepo)`, cobrindo as suítes existentes de API, web, mobile, db e validators. O job cria um service PostgreSQL 16 descartável, sem volume persistente, com banco `muvit_api_test` em `localhost:5433` e credenciais fictícias dos exemplos. Não utiliza secrets de produção.

O workflow copia `apps/api/.env.test.example` e `packages/db/.env.test.example` para os respectivos `.env.test`. O comando de testes da API já cria o banco quando necessário e aplica as migrations; as próprias suítes preparam e limpam seus dados, sem executar o seed de demonstração. As tarefas `test` do Turbo têm cache desativado para que cada execução valide o estado real do banco. Falhas na preparação ou nos testes fazem o job falhar; lint, build e typecheck continuam no pipeline, com build dependente da suíte completa.

Para reproduzir localmente após instalar as dependências:

```bash
cp apps/api/.env.test.example apps/api/.env.test
cp packages/db/.env.test.example packages/db/.env.test
docker compose up -d --wait postgres_test
pnpm test
```

Esses comandos usam o banco local de testes e suas tabelas serão limpas pelas suítes. Para QA paralelo em outra worktree, use um PostgreSQL exclusivo e ajuste os dois `.env.test` ignorados para a mesma porta e banco de teste antes de executar `pnpm test`; não utilize o banco compartilhado por outra execução. No PowerShell, use `pnpm.cmd` se `pnpm.ps1` estiver bloqueado.

Ainda não há uma suíte E2E. Quando ela for criada, deverá iniciar a API com o ambiente de teste e reutilizar `muvit_api_test`. Testes de integração e E2E não podem executá-lo simultaneamente, pois ambos precisam controlar e limpar o mesmo estado; cada execução E2E deverá preparar seus próprios dados no início.

### Autenticação e ambiente

O Better Auth é a única fonte de senha, sessão e cookies. A API converte a sessão em identidade de domínio; web e mobile não persistem tokens próprios.

- `BETTER_AUTH_SECRET` deve ser aleatório, ter pelo menos 32 caracteres e ser exclusivo por ambiente.
- `BETTER_AUTH_URL` aponta para a URL pública da API. `WEB_URL` e cada item de `EXPO_TRUSTED_ORIGINS` devem ser origens exatas; não use wildcard em produção.
- `NEXT_PUBLIC_API_URL` e `EXPO_PUBLIC_API_URL` devem apontar para a mesma API alcançável por cada cliente. Builds mobile de produção falham quando a URL pública não está configurada.
- O navegador e o Expo autenticam com o cookie emitido pela API. Cookies de sessão são `HttpOnly`; em HTTPS de produção também devem ser `Secure`. Use `SameSite=Lax` quando web e API forem same-site; topologias realmente cross-site exigem `SameSite=None` junto de `Secure`.
- O desenvolvimento local em HTTP pode usar cookie sem `Secure`, apenas para `localhost` e dispositivos de teste. Produção deve usar HTTPS e origens explícitas.
- Desenvolvimento e testes usam somente PostgreSQL. Não crie SQLite, `index.db` ou outro banco em arquivo no projeto.

## Scripts

| Comando | Descrição |
| --- | --- |
| `pnpm dev` | Inicia os workspaces em modo de desenvolvimento. |
| `pnpm build` | Gera o build dos workspaces. |
| `pnpm lint` | Executa as verificações do Biome no monorepo. |
| `pnpm format` | Formata os arquivos do monorepo com o Biome. |
| `pnpm test` | Executa os testes dos workspaces. |
| `pnpm typecheck` | Executa a verificação de tipos dos workspaces. |
| `pnpm db:generate` | Gera migrations do banco com o Drizzle Kit. |
| `pnpm db:migrate` | Aplica as migrations no banco local. |
| `pnpm db:studio` | Abre o Drizzle Studio para inspecionar o banco. |
| `pnpm db:seed` | Recria os dados de demonstração para testes manuais. |
| `pnpm mobile:start` | Inicia o servidor de desenvolvimento do Expo. |
| `pnpm mobile:go` | Inicia o Metro em modo Expo Go; use o QR code ou pressione `a` para abrir no Android. Recursos que exigem módulos nativos ausentes no Expo Go precisam do Development Build. |
| `pnpm mobile:android` | Inicia o Metro em localhost e abre o Development Build no Android conectado por ADB (emulador ou USB). |
| `pnpm mobile:android:build` | Compila e instala o Development Build no Android e inicia o Metro, sem login no EAS. Use na primeira execução ou após alterações nativas. |
| `pnpm mobile:ios` | Abre o app mobile no iOS. |
| `pnpm mobile:web` | Abre o app mobile no navegador. |
| `pnpm mobile:test` | Executa os testes do app mobile. |
| `pnpm mobile:typecheck` | Executa a verificação de tipos do app mobile. |
| `pnpm mobile:doctor` | Verifica a configuração e as dependências do projeto Expo. |

Para compilar o Android localmente, instale o Android SDK pelo Android Studio e configure `ANDROID_HOME` com o caminho do SDK. Como alternativa, após gerar o diretório `apps/mobile/android`, configure `sdk.dir` em `apps/mobile/android/local.properties` com o caminho local do SDK, usando barras `/`. Esse arquivo é específico da máquina e deve permanecer ignorado pelo Git.

No Windows, o Ninja 1.10.2 distribuído com o CMake 3.22.1 pode falhar com `build.ninja still dirty after 100 tries` ao acessar os caminhos longos de dependências do pnpm. Confira a versão de `<SDK>/cmake/3.22.1/bin/ninja.exe --version`; a versão 1.13.2 inclui suporte a caminhos longos. Para atualizar, baixe `ninja-win.zip` da [release oficial](https://github.com/ninja-build/ninja/releases/tag/v1.13.2), preserve uma cópia do executável antigo e substitua o `ninja.exe` nesse diretório do SDK. A alteração é local à máquina e pode precisar ser reaplicada após reinstalar o CMake pelo SDK Manager.

### Conexão Android com o Metro

Execute `pnpm.cmd mobile:android` na raiz da worktree desejada. O comando usa `--localhost`; ao abrir o Android, o Expo configura o reverse ADB da porta do Metro. Isso evita depender do IP Wi-Fi do computador. Para um aparelho físico sem ADB, use `pnpm.cmd mobile:start` em uma rede compartilhada e acessível pelo aparelho.

Se a development build tentar reabrir um endereço LAN antigo e mostrar `ENETUNREACH`, abra o projeto novamente pelo comando Android; apenas tocar em Reload repete a URL anterior. Para recuperar manualmente a conexão na porta padrão, execute `adb devices -l`, confirme o serial e use `adb -s <serial> reverse tcp:8081 tcp:8081`. Depois abra `muvit://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081` com `adb -s <serial> shell am start -a android.intent.action.VIEW -d <URL> com.anonymous.muvit`. No PowerShell, coloque a URL entre aspas. O reverse exige que o app use localhost; ele não redireciona uma URL com IP LAN. Refaça-o após reconectar ou reiniciar o Android, se necessário.

Antes de iniciar outro Metro, confira `http://127.0.0.1:8081/status` e a origem do processo que ocupa a porta. Não reutilize nem encerre um Metro de outra worktree sem verificar seu projeto. Se precisar manter duas instâncias, use `pnpm.cmd mobile:android --port 8082` na segunda e confirme a porta na URL e em `adb -s <serial> reverse --list`. No Windows, se `adb` não estiver no PATH, use `<SDK>/platform-tools/adb.exe`.

### Evidências e artefatos de QA

Capturas, vídeos, logs, exports do Pencil e relatórios de execução ficam em `artifacts/<issue>/<execucao>/`, na raiz da worktree, e são ignorados pelo Git. Testes, fluxos Maestro, scripts e assets necessários para reproduzir o ambiente continuam versionados. Veja o [fluxo de artefatos de QA](docs/operations/qa-artifacts.md) para estrutura, comandos, compartilhamento e limpeza.

### Dados de demonstração

Depois de aplicar as migrations, execute `pnpm.cmd db:seed` na raiz. O comando publica as imagens fictícias de demonstração no R2, verifica o acesso público e prepara um professor autenticável, dez alunos gerenciados sem login, um aluno independente autenticável, 24 exercícios globais, quatro exercícios privados, 28 avaliações com medidas e três fotos individuais (frente, perfil e costas), 11 planos com 32 dias, 159 prescrições e 52 registros de treino com 897 séries. Todos os dados são fictícios e gerados de forma reproduzível com Faker.

- Dashboard — professor: `trainer@muvit.dev` / `12345678`
- Mobile — aluno independente: `aluno.independente@muvit.dev` / `12345678`

Os dez alunos gerenciados não possuem conta ou senha. As identidades Better Auth existentes são reutilizadas, sem redefinir senhas. O seed recria os dados das contas demo; alunos do professor criados manualmente fora dos dez emails `aluno01@muvit.dev` a `aluno10@muvit.dev` são preservados. Execute somente em ambiente de desenvolvimento. Configuração de imagens, limites e cenários disponíveis: [seed de demonstração](docs/operations/demo-seed.md).
