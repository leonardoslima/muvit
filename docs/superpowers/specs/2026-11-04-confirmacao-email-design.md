# Confirmação de email

## Intenção e limites

O MUV-15 confirma a posse do email de identidades autenticáveis antes do acesso aos dados privados de treino, saúde e gestão. O fluxo mantém Better Auth 1.6.23 e Resend, sem dependências, tabelas ou tokens próprios. Recuperação de senha, papéis, ownership e persistência offline preservam seus contratos.

## Abordagens consideradas

1. Exigir `requireEmailVerification` no login: nativo, mas elimina a sessão no cadastro e quebra o hook atual de provisionamento por `newSession`; exige uma migração maior do fluxo.
2. Manter sessão nativa e exigir `emailVerified` na autorização das rotas de negócio: preserva provisionamento e permite confirmação, recuperação e logout com uma identidade ainda pendente. Esta é a decisão técnica desta rodada autônoma.
3. Apenas exibir aviso: não aplica uma política de acesso e deixa o requisito de segurança incompleto.

## Política de acesso

- Cadastro e login podem criar sessão com email não verificado. `sendOnSignUp` envia a confirmação; `sendOnSignIn` fica desativado para evitar envio em cada tentativa.
- `requireAuth` retorna `403 { error: 'email_not_verified' }` para sessão válida não verificada, antes de resolver/expor dados de domínio. Sessão ausente, inválida ou sem perfil continua não autenticada; preserve a distinção dos erros e teste a ordem.
- Auth nativa, consulta de sessão, confirmação, reenvio, recuperação de senha e logout continuam disponíveis. Os clientes encaminham sessões pendentes para uma superfície de confirmação sem montar a UI privada.
- Contas existentes com `emailVerified=false` passam pela mesma confirmação. Não há confirmação automática de contas reais nem bypass por `NODE_ENV`.
- Somente as identidades determinísticas do seed demo são marcadas verificadas pelo repositório de seed, que já é bloqueado em produção. Fixtures de negócio devem produzir explicitamente contas verificadas; a suíte de confirmação conserva cadastros pendentes reais.

## Entrega, segurança e retorno

Use `emailVerification.sendVerificationEmail`, `sendOnSignUp: true`, `expiresIn: 3600`, `autoSignInAfterVerification: false` e os endpoints `/api/auth/send-verification-email` e `/api/auth/verify-email`. O token nativo é um JWT temporário; não prometer uso único ou invalidação de links anteriores, que não são garantidos pelo mecanismo instalado. Repetir um link já confirmado é idempotente enquanto válido.

O envio Resend é transacional, independente de `EMAIL_NOTIFICATIONS_ENABLED`, e não deve atrasar a resposta. Falhas produzem somente categoria segura. Reenvio sem configuração responde indisponibilidade uniforme antes de consultar conta. Cadastro sem envio configurado pode criar identidade pendente; a UI deve permitir reenvio e não afirmar entrega externa. Não criar mailbox ou impressão de tokens em produção. QA usa callback injetado no harness, sem rota de produto.

Reenvio: registrar rota explícita no Fastify com limite de 3 solicitações por minuto por IP, além do limite nativo; o botão também aguarda 60 segundos após sucesso. Contas ausentes e verificadas sem sessão recebem a resposta nativa genérica. Com sessão, enviar somente ao email da própria sessão; manter a proteção nativa `EMAIL_MISMATCH`. Validar callbacks contra origens exatas; bloquear callback externo também no reenvio/cadastro, antes de qualquer email.

Web usa `/verify-email`; Mobile usa `muvit://verify-email`. Ambas as rotas são públicas mesmo com sessão. O link enviado aponta primeiro para o endpoint nativo, que confirma e redireciona ao callback; a página de retorno nunca declara sucesso somente pela ausência de erro na URL: sem sessão, orienta login; com sessão, refaz `getSession` e exige `emailVerified=true`. Tratar `INVALID_TOKEN`, `TOKEN_EXPIRED`, erro de rede e conta diferente sem renderizar token. Não autenticar automaticamente.

## Troca de email no perfil

A configuração atual `updateEmailWithoutVerification` só permite troca imediata para contas ainda não verificadas. Com um remetente de verificação configurado, contas verificadas passam a usar a troca pendente nativa. Portanto, o updater atual que exige email imediatamente alterado não pode permanecer igual.

Preservar o email antigo nas identidades e no perfil até a confirmação do novo. A solicitação de troca deve usar `auth.api.changeEmail` com callback Web, sinalizar pendência na resposta/UI e não escrever antecipadamente `trainers.email`. Nunca marcar um novo endereço como verificado por herança do anterior.

### Revisão técnica do desenho de troca

A versão instalada cria sessão no ramo `change-email-verification` mesmo com `autoSignInAfterVerification: false`, e chama `afterEmailVerification` depois de alterar `auth_users.email`. Portanto, esse hook isolado não garante consistência: uma falha deixa a identidade com email novo e o perfil antigo; o replay procura o email antigo e não reconcilia. A proposta anterior baseada nesse hook fica substituída pelas regras abaixo.

- `databaseHooks.session.create.before` rejeita com `APIError` de sessão necessária qualquer criação de sessão originada em `/verify-email`. Essa defesa usa o hook oficial, sem ler ou validar JWT por conta própria. Confirmação simples continua pública porque não cria sessão; troca exige sessão existente da mesma conta, conferida pelo próprio Better Auth. Ausência de cookie não pode produzir sessão, cookie ou mutação de email.
- A troca deve ser aberta na superfície Web/Mobile e chamar `authClient.verifyEmail` com o cookie da sessão atual. A entrega pode adaptar a URL nativa para a superfície correspondente preservando o token emitido e callback confiável; a API continua sendo a única verificadora. Sem sessão, orientar login e nova solicitação de troca, sem persistir token em armazenamento ou URL de login. A confirmação simples sem sessão continua válida.
- A implementação Drizzle fornece um decorador do adapter oficial. Somente `update` de modelo `user` que altera `email` executa a atualização NATIVA e a atualização do email do perfil na mesma transação PostgreSQL. Nenhum SQL próprio escreve `auth_*`; delegar ao adapter nativo dentro do executor transacional. Falha ou colisão no perfil faz rollback das duas atualizações; o token continua reaplicável enquanto válido.
- O decorador também preserva `adapter.transaction`, fornecendo uma instância igualmente decorada e vinculada à transação, para não permitir bypass. Usar tipos inferidos do adapter oficial e o tipo de transação Drizzle, sem `any` ou casts para Database.
- Antes de escrever, adquirir o mesmo advisory lock de perfil usado no update existente, em variante transacional e na mesma ordem: resolver identidade/perfil, adquirir lock, atualizar identidade, atualizar perfil. A troca só conclui com perfil válido. A atualização de `updatedAt` do perfil preserva sua regra monotônica.
- `afterEmailVerification` pode produzir efeitos não essenciais, mas não é responsável pela consistência. Sem comprovação dos testes de rollback e não criação de sessão, a troca não está validada.

## Aceite e evidência

Provar cadastro e envio injetado, confirmação e expiração, callbacks permitidos e rejeitados, reenvio e limites, autorização antes/depois, retorno com/sem sessão, seed local, troca de email e regressão de recuperação. QA real Web e Android com API e PostgreSQL exclusivos; entrega em caixa postal externa é uma verificação distinta e exige credenciais autorizadas. Salvar saídas em `artifacts/muv-15/<execucao>/`.

## Adendo: vínculo da identidade e entrega da troca

O JWT nativo contém o email original, mas não identifica a conta que solicitou o link. Se esse endereço for reutilizado, um link anterior pode afetar outra identidade. A emissão deve usar as funções oficiais de verificação e criação do Better Auth para preservar os campos nativos e a expiração, acrescentando `authUserId` assinado. Rejeitar links válidos sem vínculo ou cujo ID não coincida com a identidade atual; no adapter, incluir o ID também na condição atômica do update de confirmação para fechar a corrida após a consulta. Links antigos sem vínculo exigem reenvio.

O envio da troca ocorre somente após o PATCH completo terminar com sucesso. O escopo assíncrono da operação guarda mensagens em memória e as descarta em falhas ou compensações; não usar buffer global compartilhado. Ao término bem-sucedido, o envio é assíncrono. Uma interrupção entre a conclusão do PATCH e o despacho pode exigir nova solicitação.

O link inicial abre o endpoint nativo. O link de troca abre a tela Web com o token no fragmento, que não é enviado na requisição de navegação e é retirado da barra antes de `authClient.verifyEmail`. A operação exige a sessão da conta original. O adapter deve manter `updatedAt` monotônico sob a trava e rejeitar a troca se o perfil correspondente não existir.
