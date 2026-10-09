# Autenticação e perfil mobile v2 — MUV-28

Fonte visual: `assets/design/mobile.pen`, editada pelo MCP pen.dev. Esta entrega prepara a MUV-34 e reutiliza a foundation MUV-24. É design, sem implementação Expo ou alteração de autenticação, autorização, Better Auth e contratos.

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

## Verificação e limites

A simplificação do perfil em 08/10/2026 foi aplicada aos 13 quadros com dados: perfis base, saída em andamento, erro ao sair, fallbacks, adaptações 320/430 dp e nome longo. Os dois estados de carregamento permanecem sem identidade ou ações enquanto a sessão carrega. Capturas dos perfis de aluno e professor, 320/430 dp, erro ao sair e nome longo confirmaram a composição sem o bloco de jornada. A implementação Expo ainda contém esse bloco e deverá acompanhar o layout na implementação nativa; este ajuste modifica apenas o design e o handoff.

A inspeção do MCP confirmou 34 telas, 169 instâncias diretas, ausência de placeholders, escapes Unicode e sobreposição de quadros. Os 32 quadros sem teclado não apresentaram problemas de bounds. A revisão independente analisou 20 capturas, incluindo as quatro superfícies em 390/320/430 dp, nome longo, envio, erro, carregamento e foco/teclado, sem encontrar defeito material que impeça a entrega do design.

Nos dois quadros de teclado, a medição `ctx.bounds` diverge em +50 dp das coordenadas do schema e reporta clipping, enquanto as capturas mostram o teclado completo. `WCgY6` termina em 803 dentro de um quadro de 837 dp; `kXDIG` termina em 907 dentro de 941 dp. A última linha termina em 194 dentro do teclado de 206 dp. A revisão confirmou esses valores por leitura própria; a causa da divergência da medição não foi determinada. Isso é uma limitação da verificação geométrica desses dois quadros, não evidência de comportamento nativo.

`git diff --check` e busca por escapes Unicode verificam o documento. Testes, lint e typecheck do Expo não se aplicam ao diff de design; implementação e validação Android/iOS, leitor de tela, foco real e teclado pertencem à MUV-34.
