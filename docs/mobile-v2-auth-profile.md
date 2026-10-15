# Autenticação e perfil mobile v2 — handoff MUV-28 e implementação MUV-34

Fonte visual: `assets/design/mobile.pen`, editada pelo MCP pen.dev. Este documento começou como handoff de design da MUV-28 e reutiliza a foundation MUV-24. O handoff não alterava o app nem os contratos de autenticação, autorização e Better Auth; a implementação e a QA da MUV-34 estão registradas na seção final.

## Direção e composição

Modo de uso: operação. Entrada compartilhada e perfis reconhecíveis por papel, com a direção v2: DM Sans, fundo papel, verde profundo, ações em lima e superfícies brancas. Base de 390 dp, gutter de 16 dp, ações de 58 dp, campos com labels persistentes e controles de 58 dp. Conteúdo cresce e permite rolagem; safe areas e tab bar devem ser reservadas uma única vez no runtime.

O perfil compartilha identidade e composição. O papel diferencia aluno e professor, mantendo o rótulo existente “Treinador” para a conta do professor. O cabeçalho apresenta “Perfil” e “Informações da sua conta.”; o conteúdo concentra iniciais, nome, email, papel e Sair. A navegação permanece Hoje/Progresso/Perfil para aluno e Início/Alunos/Perfil para professor. As amostras contêm nomes e emails ilustrativos.

## Mapa de quadros

| Grupo | Node IDs | Conteúdo |
| --- | --- | --- |
| Componentes | `RqlBV` | Marca de entrada, identidade e tabs com Perfil selecionado |
| Login | `w6gu8`, `jmFSw`, `QBh4d` | Vazio, preenchido e entrando |
| Erros de login | `dP1WO`, `t6X43`, `bM22M`, `jChFx` | Credenciais, muitas tentativas, falha geral e papel não identificado |
| Cadastro | `PkVP1`, `S6N7xP`, `EDfVG` | Vazio, preenchido e criando conta |
| Erros de cadastro | `tkFaC`, `qslpp`, `d1t9zs` | Rejeição, muitas tentativas e falha geral |
| Perfis | `f5v1J0`, `eKJPd` | Aluno e professor |
| Carregando perfil | `F96y6B`, `PQvcZ` | Aluno e professor sem dados disponíveis |
| Saindo | `M3GRsB`, `oW0ic` | Aluno e professor com saída em andamento |
| Erro ao sair | `arnMR`, `au2zO` | Conteúdo preservado e mensagem contextual |
| Fallbacks | `leQLc`, `WqTG6` | Nome e email ausentes, por papel |
| Login 320/430 dp | `bs3r4`, `HPDok` | Adaptação da entrada |
| Cadastro 320/430 dp | `rhfJV`, `sWxr3` | Adaptação do cadastro |
| Perfil do aluno 320/430 dp | `c8aPy`, `G95bkX` | Adaptação da conta do aluno |
| Perfil do professor 320/430 dp | `xdMmY`, `lNGgj` | Adaptação da conta do professor |
| Nome longo e texto ampliado | `IRhVX` | Perfil em 320 dp, nome e email longos; texto da identidade ampliado aproximadamente 125% |
| Foco e teclado | `bv79B`, `XpZSo` | Login e cadastro com foco no email e teclado esquemático |
| Fluxo e contratos | `GwYN4` | Regras de composição e limites da implementação |

São 34 quadros de tela e dois quadros de componentes/contratos. Os componentes ficam em y=40316; as telas começam em y=41400. O guia fica em x=6000, y=41400. Os quadros anteriores permanecem preservados.

## Contratos funcionais preservados

As fontes atuais são `apps/mobile/app/(auth)/login.tsx`, `apps/mobile/app/(auth)/signup.tsx`, `apps/mobile/src/screens/profile.tsx`, as duas rotas de perfil e `apps/mobile/src/lib/auth-errors.ts`.

- Login tem email e senha, compartilhado entre os papéis. A conta autenticada define o destino existente; não há seletor de papel. Papel desconhecido segue a saída e a mensagem já existentes.
- Cadastro tem nome, email e senha e cria apenas `student`, como aluno independente. Não incluir cadastro de professor, confirmação de senha, recuperação, termos adicionais ou login social.
- O formulário vazio mantém o botão disponível, como a implementação atual. Não criar uma regra de bloqueio por campos vazios ou validação local de formato/tamanho. Erros atuais são agregados e aparecem depois dos campos, preservando os valores.
- Durante a solicitação, o CTA mostra “Entrando...” ou “Criando...” e fica desabilitado. Campos e ação secundária mantêm o comportamento atual. As variantes Disabled e Loading não acrescentam um bloqueio global novo.
- Senha permanece oculta. A instância `Field/Password` oculta a ação de revelar senha da foundation, pois ela não existe nessas telas hoje.
- Login usa “Credenciais inválidas. Verifique os dados e tente novamente.”, “Muitas tentativas. Aguarde um momento e tente novamente.”, “Não foi possível concluir a solicitação. Tente novamente.” e “Não foi possível identificar o perfil desta conta.”.
- Cadastro usa “Não foi possível criar a conta com os dados informados.”, além das mensagens atuais de limite de tentativas e falha geral. Não revelar conta já cadastrada nem acrescentar uma contagem regressiva.
- Perfis apresentam nome, email, iniciais, papel e Sair. O bloco “Treinos e evolução” e os textos de acompanhamento da jornada foram removidos do layout; treinos, progresso e alunos permanecem nos destinos existentes. Não introduzir edição, upload de avatar, configurações ou dados de domínio adicionais.
- Fallbacks atuais: Aluno/AL ou Treinador/TR; “Sem email cadastrado” quando o email não está disponível. O estado pendente da sessão usa StatePanel sem superfície de card.
- Saída mostra “Saindo...” e desabilita nova saída. Em falha, mantém o perfil com “Não foi possível sair agora.”; o próprio botão permite tentar novamente. Sucesso retorna ao login, sem confirmação intermediária. Limpeza de cache e sessão continuam no fluxo existente.

## Reutilização

Novos símbolos de composição: `pLERv` (`Header/Marca/Entrada`), `C8nj0g` (`Account/Identidade/Default`), `poCMj` (`Tabs/Aluno/Perfil`) e `BgfI4` (`Tabs/Professor/Perfil`). A marca reutiliza `bkuOW` sem avatar. As tabs de Perfil usam a mesma linguagem, destinos e tokens das tabs da foundation, com layout que distribui os três alvos pela largura disponível.

Campos reutilizam `t1QC7u`, `G6nUL` e `ufJ8R`, com altura de conteúdo, controles de 58 dp e hints de catálogo ocultos. Botões reutilizam `QCbOZ`, `Bn8Zy`, `DHxZY` e `txIBZ`. Erros reutilizam `G2k2nZ` com a mensagem atual; carregamento de perfil usa `Nj5Wj` sem fundo próprio. Não copiar as dimensões de catálogo como dimensões fixas do runtime.

## Teclado e acessibilidade para a MUV-34

Os quadros de teclado mostram conteúdo estendido com foco visível, não uma captura de viewport Android/iOS. O teclado desenhado é uma referência esquemática: implementar teclado, cursor, seleção e autofill nativos. Email usa teclado de email e capitalização automática desativada; senha usa entrada segura. Rolagem deve manter o campo focado acessível quando o teclado abre; não fixar o CTA por cima do teclado nem duplicar insets. A primeira ação de voltar com teclado aberto deve seguir o comportamento nativo.

Preservar labels acessíveis, estado desabilitado no CTA, anúncio de erros e progresso de operação. Fonte ampliada exige crescimento da identidade e rolagem; o exemplo de 125% não substitui ensaio de todas as escalas nativas. Tabs têm três áreas amplas com ícone e texto, e seleção não depende apenas de cor.

## Histórico da validação visual do handoff

A simplificação do perfil em 08/10/2026 foi aplicada aos 13 quadros com dados: perfis base, saída em andamento, erro ao sair, fallbacks, adaptações 320/430 dp e nome longo. Os dois estados de carregamento permanecem sem identidade ou ações enquanto a sessão carrega. Capturas dos perfis de aluno e professor, 320/430 dp, erro ao sair e nome longo confirmaram a composição sem o bloco de jornada. No handoff original, a implementação Expo ainda precisava acompanhar esse layout; essa observação descreve o estado anterior à MUV-34. A validação atual do app está registrada abaixo.

A inspeção do MCP confirmou 34 telas, 169 instâncias diretas, ausência de placeholders, escapes Unicode e sobreposição de quadros. Os 32 quadros sem teclado não apresentaram problemas de bounds. A revisão independente analisou 20 capturas, incluindo as quatro superfícies em 390/320/430 dp, nome longo, envio, erro, carregamento e foco/teclado, sem encontrar defeito material no handoff de design.

Nos dois quadros de teclado, a medição `ctx.bounds` diverge em +50 dp das coordenadas do schema e reporta clipping, enquanto as capturas mostram o teclado completo. `WCgY6` termina em 803 dentro de um quadro de 837 dp; `kXDIG` termina em 907 dentro de 941 dp. A última linha termina em 194 dentro do teclado de 206 dp. A revisão confirmou esses valores por leitura própria; a causa da divergência da medição não foi determinada. Isso é uma limitação da verificação geométrica desses dois quadros, não evidência de comportamento nativo.

No handoff original, testes, lint e typecheck do Expo não se aplicavam ao diff apenas de design. Para a implementação MUV-34, os gates automatizados e a execução Android foram realizados e estão registrados a seguir. iOS e TalkBack não foram ensaiados nessa validação.

## Estado da implementação e QA da MUV-34

Os relatórios finais de qualidade e QA visual registram a implementação no HEAD `32d6be56f7e315d5888509124e28e4b4ad22d0d1`. Os resultados automatizados abaixo pertencem a esse SHA; esta atualização acrescenta documentação.

### Gates automatizados

- Suíte mobile: `pnpm.cmd --dir apps/mobile test --hookTimeout=30000 --maxWorkers=4`, exit code 0; 72/72 arquivos e 671/671 testes aprovados, sem skips.
- Typecheck: `pnpm.cmd --dir apps/mobile typecheck`, exit code 0.
- Cobertura core: `pnpm.cmd --dir apps/mobile test:coverage:core --hookTimeout=30000 --maxWorkers=4`, exit code 0; statements 94,16%, branches 87,59%, functions 98,97% e lines 97,64%.
- Cobertura UI: `pnpm.cmd --dir apps/mobile test:coverage:ui --hookTimeout=30000 --maxWorkers=4`, exit code 0; statements 89,58%, branches 87,90%, functions 90,68% e lines 94,27%. Os quatro limites configurados são 85%; ambos os comandos de cobertura os superaram.
- Biome: `pnpm.cmd exec biome check` nos 10 arquivos TS/TSX alterados, exit code 0; 10 arquivos verificados, sem correções.
- Expo Doctor: `pnpm.cmd --dir apps/mobile doctor`, exit code 0.
- No SHA testado, `git diff --check origin/develop...HEAD` terminou com exit code 0. A busca PowerShell nas linhas adicionadas de 12 arquivos textuais não encontrou escapes Unicode no formato barra invertida, letra u e quatro dígitos hexadecimais; exit code 0.

### QA Android

A validação manual usou o AVD dedicado `muvit-muv-34`, Android API 36 e Expo Go 54.0.8.

- O cadastro de um estudante fictício concluiu e abriu Hoje; o perfil mostrou o papel Aluno independente e Sair retornou ao Login. Login, perfil e logout de estudante e professor demo também foram exercitados.
- Após force-stop do Expo Go e reabertura do projeto, a sessão ativa foi restaurada em Hoje.
- Credenciais inválidas exibiram “Credenciais inválidas. Verifique os dados e tente novamente.”; a falha de rede controlada exibiu “Não foi possível concluir a solicitação. Tente novamente.”. Os valores dos campos foram preservados nos dois erros.
- Login e cadastro foram observados em 320, 390 e 430 dp. Em perfil com nome e email longos a 320 dp, ambos quebraram linha sem reticências; o cartão cresceu e as abas e Sair permaneceram disponíveis. Perfis de estudante e professor também foram exercitados na largura base do AVD.
- Com o teclado aberto, o foco no campo de nome permaneceu visível. O CTA ficou inicialmente abaixo da área visível; após rolagem, “Criar conta” e “Já tenho conta” ficaram acessíveis acima do teclado. O botão Voltar nativo fechou o teclado e o CTA funcionou após ser reposicionado.
- A escala de fonte 1,25 foi capturada e depois restaurada para 1,0. A árvore UI Automator mostrou hints/descrições e propriedades de foco/clique nos campos e identificou Entrar como botão clicável e focável; o email de perfil apareceu como TextView não focável. Os emails foram mascarados nas capturas e credenciais não foram registradas.
- Não foi observado defeito funcional ou visual nos fluxos exercitados.

### Limites observados

TalkBack não foi executado. A QA manual cobriu somente um AVD Android API 36; não cobriu outros dispositivos ou versões, iOS, rate limits, falhas de logout nem estados demorados de carregamento.

A tentativa de ativar modo avião por broadcast falhou com `SecurityException`. A falha de rede foi reproduzida desligando Wi-Fi e dados móveis no AVD dedicado; depois, a conectividade foi reativada e confirmada. A captura de falha de credenciais e rede não expõe os valores preenchidos.
