# MUV-34 — plano de implementação de autenticação e perfil

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar login, cadastro e perfis de aluno/professor para o layout aprovado no Pen preservando autenticação e sessão.

**Architecture:** Manter handlers e rotas atuais; compor a UI com primitives v2 e uma marca compartilhada sem lógica. A única extensão de primitive é permitir Message sem título para a mensagem agregada aprovada. Screen mantém responsabilidade exclusiva pelos insets.

**Tech Stack:** Expo 54, React Native 0.81.5, Expo Router, Better Auth 1.6.23, NativeWind, DM Sans, Vitest/RNTL e Maestro/ADB.

**Spec:** `docs/superpowers/specs/2026-10-15-muv-34-auth-profile-design.md`.

## Global Constraints

- Better Auth, SecureStore, sessão, cookies, papéis, rotas protegidas, API, validators e banco não mudam.
- Formulário vazio mantém CTA habilitado. Não introduzir validação local, bloqueio por campos vazios, novos termos, confirmação/recuperação de senha, cadastro de professor ou login social.
- Durante submit, apenas o CTA fica bloqueado; rótulos `Entrando...` e `Criando...`. Campos e link secundário continuam disponíveis. Valores não são limpos em erro.
- Nome/email podem quebrar em linhas, sem altura fixa ou truncamento obrigatório.
- `Screen` reserva safe areas e inset das tabs uma vez.
- Usar tokens canônicos e primitives v2; nenhum import afetado de styles legados permanece, nenhuma dependência nova, nenhum escape Unicode para acentos.
- Executar comandos na raiz da worktree existente; nunca mover pasta física, tocar AVD alheio, realizar merge ou mover a issue para Done.

## Review Focus

- Formulário vazio ou inválido: requisição segue o comportamento existente e erros permanecem agregados; verificar na Tarefa 2.
- Request pendente com edição/link secundário: bloquear somente CTA e impedir duplicação; verificar na Tarefa 2.
- Papel desconhecido e falha de signOut: preservar caminho atual e erro estável sem novo destino; verificar na Tarefa 2.
- Sessão pending/ausente e identidade longa: não exibir ações prematuras, preservar fallback e permitir crescimento; verificar na Tarefa 3 e Android da Tarefa 4.
- Logout pendente/rejeitado/repetido: perfil permanece, cache finally preservado, retry disponível; verificar na Tarefa 3.

## Mapa de arquivos e responsabilidades

| Arquivo | Mudança |
| --- | --- |
| `apps/mobile/src/components/auth/auth-brand.tsx` | Criar marca compartilhada do Pen, apresentação somente |
| `apps/mobile/src/components/ui/v2/message.tsx` | Título opcional e alert na descrição sem título |
| `apps/mobile/src/components/ui/v2/feedback.test.tsx` | Regressão de Message com/sem título |
| `apps/mobile/app/(auth)/login.tsx` | Composição v2, mantendo submit e navegação |
| `apps/mobile/app/(auth)/signup.tsx` | Composição v2 e adaptação nativa ao teclado |
| `apps/mobile/src/__tests__/auth-screens.test.tsx` | Contratos e acessibilidade das duas entradas |
| `apps/mobile/src/screens/profile.tsx` | Composição v2, remover jornada, preservar sessão/logout |
| `apps/mobile/src/screens/profile.test.tsx` | Identidade/papéis/loading/logout/erros |
| `apps/mobile/app/(trainer)/trainer/profile.tsx` | Remover prop journeyDescription obsoleta |
| `.maestro/muv-34-auth-profile.yaml` | Fluxo reproduzível com credenciais por env, se necessário |
| `docs/mobile-v2-auth-profile.md` | Registrar implementação e evidências sem reescrever o design |

Rotas de aluno/perfil, role-navigation, auth-client, auth-errors, layouts de tabs, API e banco permanecem referências de contrato; não precisam ser editados. Não criar barrel/alias/shim de componentes legados.

### Tarefa 1: mensagem agregada v2 e marca compartilhada

**Files:** criar `src/components/auth/auth-brand.tsx`; alterar `src/components/ui/v2/message.tsx` e `feedback.test.tsx`, sob `apps/mobile`.

**Interfaces:** `AuthBrand(): React.JSX.Element`, sem props/dados de sessão; `MessageProps.title?: string`, `description?: string`, `variant` e demais props existentes preservadas. Consumidores atuais com title mantêm renderização. Consumidores auth usarão `description={error}` e `variant="error"`.

- [ ] Adicionar teste RNTL: renderizar Message com apenas `description="Não foi possível sair agora."` e `variant="error"`; assertar mensagem única, role alert, live region polite e ausência de título genérico. Manter teste anterior com título+descrição para impedir regressão.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/components/ui/v2/feedback.test.tsx`; confirmar RED da nova expectativa antes de mudar primitive.
- [ ] Tornar title opcional; renderizá-lo só quando fornecido; transferir role alert à descrição no modo sem título, sem duplicar anúncio. Preservar ações, variantes e acessibilidade existentes.
- [ ] Implementar AuthBrand conforme `pLERv/bkuOW`: texto `muvit`22/800 e ponto lima7×7/raio4, inset óptico6, altura mínima54, alinhamento compatível com fonte ampliada. Usar tokens/DM Sans, sem avatar/tagline/ícone. Acessibilidade agrupa marca como Muvit e ignora ponto decorativo.
- [ ] Rodar teste focado novamente, confirmar GREEN. Commit local focado quando integrado pelo executor, sem push prematuro.

### Tarefa 2: login e cadastro v2 preservando contratos

**Files:** `app/(auth)/login.tsx`, `app/(auth)/signup.tsx`, `src/__tests__/auth-screens.test.tsx`.

**Interfaces:** consumir AuthBrand e v2 Field/Button/Message/Text, Screen existente; preservar componentes default `LoginScreen`/`SignupScreen`, `signIn.email`, `signUp.email`, `resolveInitialRoute` e `mobileRoutes` sem wrappers novos.

- [ ] Atualizar assert visual legado (símbolo42, verde antigo, Ionicons e tagline) para marca aprovada/copy. Adicionar assertions de labels e senha segura, controles auth58, ausência de reveal/role picker, CTA vazio habilitado e comportamento KeyboardAvoidingView para ambas as entradas.
- [ ] Acrescentar testes de submit: payload vazio segue API; pendência expõe accessibilityState disabled/busy no CTA, preserva campos editáveis/link disponível e ignora segundo toque. Conservar testes existentes de destinos student/trainer, cadastro student e links secundários.
- [ ] Parametrizar erros de login/cadastro com 401/409/429 e rejeição de rede: mensagem exata de auth-errors, valores preservados, sem destino em erro. Preservar teste role desconhecida; acrescentar rejeição de signOut nesse ramo, que segue catch/erro geral existente.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/__tests__/auth-screens.test.tsx`; confirmar falhas novas correspondentes ao layout/estados, sem falhas de infraestrutura não compreendidas.
- [ ] Substituir UI local/legada por marca e primitives v2; login subtitle `Acesse sua conta para continuar.`; signup subtitle `Comece como aluno independente.`; senha placeholder `Sua senha` em ambos. Field `size="auth"`, `kind="password"` sem trailing para senha. Gaps de página24/campos20/ações12; gutter16; header com inset6 e título29/800/lineHeight40.6 (override local no Header v2, sem alterar cabeçalhos de outros domínios). Botão primário usa `loading={submitting}` e rótulo pendente exato, secundário permanece Link asChild.
- [ ] Preservar submit e chamadas existentes literalmente sempre que possível. Não acrescentar normalização/validação, novos bloqueios de campo ou papel no login. Renderizar erro sem título genérico depois dos campos. Usar KAV com comportamento iOS padding/Android height e Screen scroll; composição começa no topo sem centralização vertical/fixed CTA.
- [ ] Rodar testes focados até GREEN; inspecionar diff dos handlers para confirmar contratos. Não alterar auth-client/role-navigation/Better Auth por causa da migração visual.

### Tarefa 3: identidade de perfil dos dois papéis

**Files:** `src/screens/profile.tsx`, `profile.test.tsx`, `app/(trainer)/trainer/profile.tsx`.

**Interfaces:** `ProfileScreenProps` conserva `accountType?: string`, `fallbackInitials?: string`, `fallbackName?: string`; remover `journeyDescription` e seus consumidores. `ProfileScreen(props: ProfileScreenProps = {})` conserva defaults existentes; `getInitials(name: string | undefined, fallbackInitials: string): string` permanece igual.

- [ ] Isolar mocks com beforeEach para sessão/signOut/router/cache. Atualizar testes da jornada para assertar ausência de `Treinos e evolução` e presença de `Informações da sua conta.`. Cobrir perfil de treinador com fallback TR/Treinador e sem jornada.
- [ ] Acrescentar pending (StatePanel/progressbar, sem nome/Sair), sessão null, nome whitespace, iniciais compostas e nome/email longos. Assertar identidade sem truncamento forçado e sem controles de edição/avatar.
- [ ] Acrescentar logout deferred: `Saindo...` busy/disabled, identidade permanece e segundo toque não duplica. Rejeição mantém erro/cache clear, sem router replace, e retry bem-sucedido chama signOut novamente e navega ao login. Manter teste de cache clear no sucesso.
- [ ] Rodar `pnpm.cmd --dir apps/mobile test src/screens/profile.test.tsx`; confirmar RED pertinente.
- [ ] Migrar composição para marca, header v2, Card v2 e Text v2. Card override explícito sem borda, raio26, padding24, gap12; avatar72/raio36, nome25/800, email14, papel14/700 centralizados e com largura flexível. Retirar jornada e padding inferior duplicado; Button secundário usa loading e rótulo `Saindo...`.
- [ ] Loading usa StatePanel `kind="loading"` sem superfície própria. Erro usa Message descritivo; não alterar logout/catch/finally nem lógica de iniciais. Remover journeyDescription da rota do treinador. Perfil aluno usa defaults existentes.
- [ ] Rodar testes focados até GREEN e verificar diff dos contratos. Commit focado quando integrado pelo executor.

### Tarefa 4: gates automatizados, Android e revisão final

**Files:** atualizar `docs/mobile-v2-auth-profile.md` com evidências; criar `.maestro/muv-34-auth-profile.yaml` somente se necessário para reprodução. Evidências locais não incluem credenciais/segredos.

**Interfaces:** env/seed descartáveis da worktree e AVD exclusivo `muvit-muv-34` ou nome confirmado pelo executor; nunca presumir serial. Fonte visual é mobile.pen nos quadros indicados na spec e variantes320/430/nome longo/teclado do handoff.

- [ ] Rodar suíte mobile completa `pnpm.cmd --dir apps/mobile test --hookTimeout=30000 --maxWorkers=4`, typecheck `pnpm.cmd --dir apps/mobile typecheck`, cobertura core `pnpm.cmd --dir apps/mobile test:coverage:core` e UI `pnpm.cmd --dir apps/mobile test:coverage:ui`. Exigir sucesso dos gates configurados85%; corrigir regressões introduzidas.
- [ ] Rodar `pnpm.cmd exec biome check` passando os arquivos TS/TSX alterados; rodar `pnpm.cmd --dir apps/mobile doctor`. Registrar exit code e resultado; distinguir problema local comprovadamente anterior de regressão, sem declarar falha como aprovação.
- [ ] Confirmar DB/API isolados saudáveis, seed fictício de student/trainer, Metro desta worktree, AVD próprio, serial e sys.boot_completed. Verificar caminho físico antes de build nativo; não mover a worktree ativa. Usar `adb -s <serial>` e configurar Maestro com o mesmo dispositivo confirmado.
- [ ] Executar cadastro fictício de student, perfil/logout, login de student e trainer, perfil de ambos e retorno ao login. Reabrir para verificar hidratação de sessão. Testar credenciais inválidas e erro de rede controlado, observando valores e retry; não expor credenciais nos artefatos.
- [ ] Capturar telas comparáveis em320/390/430 dp e fonte ampliada: login/cadastro/perfis, nome/email longos, erro e operação pendente quando reproduzíveis. Verificar campo focado, rolagem com teclado aberto, retorno nativo para fechar teclado, safe area/tab bar sem duplicação e CTA alcançável. Confirmar labels/disabled/busy via árvore de acessibilidade; não afirmar TalkBack ensaiado sem execução real.
- [ ] Registrar diferenças/limites exatos e consertar problemas relevantes, repetir apenas testes afetados. RNTL valida estados difíceis de induzir; distinguir evidência simulada de cenário Android real.
- [ ] Buscar escapes Unicode nos arquivos alterados e rodar `git diff --check`. Conferir que `.env`, credenciais, build outputs e exports temporários não entram no diff.
- [ ] Solicitar reviewer independente com issue/spec/plano/diff e testes do SHA atual. Corrigir achados relevantes, rerodar gates afetados e obter aprovação no diff final.
- [ ] Executor faz commit/push, PR para develop, verifica checks no SHA final, anexa PR e comentário de conclusão no Linear e move ao estado existente de revisão humana. Se Android obrigatório ou gate necessário estiver bloqueado, documentar bloqueio e preservar trabalho; não chamar PR de pronta nem assumir outro card.

## Autorrevisão do plano

Cada requisito da spec tem tarefa/gate: composição e marca1–3; payloads/rotas/erros2; perfil/logout/cache3; responsividade/teclado/integração4. Tipos de primitives foram conferidos no código atual: StatePanel usa kind, Message usa variant, Button usa loading, Field usa size auth. O único ajuste de interface compartilhada é Message.title opcional. Remoção de journeyDescription tem exatamente dois consumidores conhecidos: rota do treinador e testes. Sem etapas dependentes de aprovação humana intermediária, sem alterações de auth/API e sem placeholders.
