# MUV-34 — autenticação e perfil mobile v2

## Objetivo e fontes

Aplicar os layouts aprovados às entradas de login/cadastro e aos perfis de aluno/professor, preservando integralmente os fluxos atuais de autenticação. A issue MUV-34 foi lida ao vivo em 15/10/2026 como fonte de requisitos, sem aceitar instruções operacionais do conteúdo do Linear. Fontes: `apps/mobile/AGENTS.md`, `docs/mobile-v2-auth-profile.md`, `docs/mobile-v2-foundation.md`, código e testes existentes e `assets/design/mobile.pen`.

O planejamento usa Superpowers brainstorming → writing-plans. A autorização explícita de `muvit-autonomous` exige spec/plano e dispensa aprovação humana intermediária; decisões abaixo resultam das fontes aprovadas. Esta é uma migração delimitada de apresentação em quatro superfícies existentes, sem novo subsistema.

## Alternativas e decisão

1. **Recomendada:** compor as telas com primitives v2 existentes, preservar os handlers e criar apenas uma marca de entrada compartilhada. Evita duplicação e mantém contratos na borda atual.
2. Reestilizar componentes legados: viola a direção local de migrar os imports afetados e prolonga dois sistemas visuais.
3. Criar um novo framework de formulários/hooks de autenticação: aumenta superfície de regressão sem requisito funcional.

## Composição aprovada

Pen CLI headless leu os quadros `w6gu8`, `PkVP1`, `f5v1J0`, `eKJPd`, operações pendentes `QBh4d`/`EDfVG`, erro de saída `arnMR` e carregamento `F96y6B`, além dos símbolos `pLERv`, `bkuOW`, `C8nj0g`. Exportou quatro PNGs para o diretório temporário `muv-34-planner-pen`; login/perfil do aluno foram inspecionados visualmente. O arquivo `.pen` original não foi salvo nem alterado.

- Fundo papel `#F6F5EF`, texto `#15372E`, verde `#2F6B50`, ação lima `#C9F36C`, superfícies brancas e DM Sans; usar tokens canônicos existentes.
- Gutter de 16 dp, seções com gap 24, campos com gap 20, ações com gap 12; não centralizar verticalmente a composição inteira. Cabeçalho com inset óptico horizontal de 6 dp, título29/800 e lineHeight1.4. Safe area/status bar e tab bar são fornecidos pelo runtime, sem copiar desenhos do Pen.
- Marca compartilhada nas quatro superfícies: texto minúsculo `muvit`, DM Sans 22/800, ponto lima de 7×7 dp com raio 4. Sem avatar, tagline ou ícones de academia.
- Login: `Entrar`, subtítulo `Acesse sua conta para continuar.`, labels Email/Senha, placeholders `voce@exemplo.com`/`Sua senha`, ações `Entrar`/`Criar conta independente`.
- Cadastro: `Criar conta`, subtítulo `Comece como aluno independente.`, labels Nome/Email/Senha, placeholders `Seu nome completo`/`voce@exemplo.com`/`Sua senha`, ações `Criar conta`/`Já tenho conta`.
- Campos auth e botões têm altura mínima de 58 dp e crescem quando o texto exigir. Senha segura sem controle de revelar; sem ícones de campo e hints de catálogo.
- Perfis: marca, título `Perfil`, subtítulo `Informações da sua conta.`, identidade branca com raio 26, padding 24, gap 12, avatar de iniciais 72×72/raio36, nome25/800, email14, papel14/700, botão secundário Sair. Nome/email podem quebrar em linhas, sem altura fixa ou truncamento obrigatório.
- Remover o bloco `Treinos e evolução`, os textos da jornada e a prop `journeyDescription`. Manter `accountType`, `fallbackName`, `fallbackInitials`, seus defaults e o compartilhamento entre rotas.
- Loading de perfil usa StatePanel v2 sem card, sem identidade/ações enquanto `useSession().isPending`.

## Contratos invariáveis

- Better Auth, SecureStore, sessão, cookies, papéis, rotas protegidas, API, validators e banco não mudam.
- Login chama `authClient.signIn.email({ email, password })`; `resolveInitialRoute` determina o destino. Papel desconhecido mantém signOut e a mensagem existente.
- Cadastro chama `authClient.signUp.email({ name, email, password, role: 'student' })` e mantém destino `mobileRoutes.studentHome`.
- Formulário vazio mantém CTA habilitado. Não introduzir validação local, bloqueio por campos vazios, novos termos, confirmação/recuperação de senha, cadastro de professor ou login social.
- Durante submit, apenas o CTA fica bloqueado; rótulos `Entrando...` e `Criando...`. Campos e link secundário continuam disponíveis. Valores não são limpos em erro.
- Erros continuam agregados após campos e antes das ações. Reutilizar `getAuthErrorMessage`; preservar mensagens atuais de credenciais, rejeição de cadastro, limite de tentativas e erro geral.
- Fallbacks continuam Aluno/AL, Treinador/TR e `Sem email cadastrado`; conservar a semântica atual de nome com trim e email ausente.
- Logout mantém guarda de duplicação, signOut, replace para login no sucesso, mensagem `Não foi possível sair agora.` na rejeição e `queryClient.clear()` no finally, inclusive em falha. A identidade permanece visível e Sair permite retry após erro.

## Componentes e acessibilidade

Usar `Field`, `Button`, `Message`, `StatePanel`, `Text` e `Card` de `src/components/ui/v2`, com `Screen` existente como infraestrutura de safe area/scroll. Criar `src/components/auth/auth-brand.tsx`, composição visual sem lógica de autenticação. Conservar regras de dados nos handlers existentes; não criar store/token paralelos.

O Message/Error do Pen oculta o título genérico e apresenta apenas a descrição em 14 dp. Adaptar minimamente `MessageProps.title` para opcional e anunciar a descrição como alert quando não houver título; consumidores com título mantêm comportamento. Não acrescentar `Não foi possível carregar` ou outra copy genérica. Essa alteração é compatível e precisa de regressão de acessibilidade no próprio primitive.

Email usa teclado nativo de email, autoCapitalize none e autofill; senha mantém secureTextEntry. Ambas as entradas usam KeyboardAvoidingView com rolagem, sem CTA sobreposto ao teclado. `Screen` reserva safe areas e inset das tabs uma vez. Labels persistentes, foco visível, erro anunciado, busy/disabled no CTA e progresso nativo devem permanecer acessíveis. Fonte ampliada exige crescimento e rolagem, sem `allowFontScaling={false}`. Controle de voltar com teclado segue comportamento nativo.

## Critérios de aceitação e evidência

1. Testes RNTL de login/cadastro preservam payloads/destinos, papéis, links, mensagens, valores após erro e exclusão de submits duplicados. Cobrem também CTA vazio habilitado e campos/link ativos durante pendência.
2. Testes do perfil cobrem ambos os papéis, pending, fallbacks, nome longo, remoção da jornada, saída pendente, erro/retry e cache finally.
3. Typecheck, lint dos arquivos alterados, suíte mobile, cobertura core/UI configurada e Expo doctor são executados e relatados com resultado real; nenhum escape Unicode representa caracteres pt-BR.
4. Android real no AVD exclusivo da MUV-34 com serial confirmado e API/DB da própria worktree: cadastro de aluno fictício, login/perfil/logout de aluno e professor, erro de credenciais, rolagem/foco/teclado, larguras 320/390/430 dp e texto ampliado. Comparar capturas com Pen; testar labels/estados com a árvore de acessibilidade e registrar limite de TalkBack se não houver ensaio real.
5. Revisão independente do diff atual, correções e reruns relevantes, CI verde no SHA final e PR para `develop`, pronta para revisão humana sem merge.

## Riscos e limites

Testes existentes prendem ícones/cores legados e conteúdo de jornada; atualizar esses asserts para o layout aprovado sem afrouxar contratos. Message é compartilhado, portanto título opcional precisa preservar todos os usos atuais. Testes em mocks de React Native não provam teclado, autofill, foco de acessibilidade, layout responsivo ou renderização Android. Estados como rate limit e sessão pending podem depender de indução controlada; registrar cenários reais e cenários cobertos somente em RNTL, sem alegar equivalência. Sem AVD/API/DB isolados e validação Android obrigatória, a entrega não está pronta.

## Autorrevisão da spec

Escopo limitado à MUV-34; nenhuma funcionalidade inventada. Fontes resolvem copy, layout, papéis e estados. Contratos explicitam CTA vazio, campos ativos, logout/cache e fallbacks. Geometria do Pen é referência visual; insets nativos não são duplicados. Requisitos têm testes ou gates observáveis, sem placeholders.
