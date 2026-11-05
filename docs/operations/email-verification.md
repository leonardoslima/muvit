# Confirmação de email

O cadastro cria uma sessão e o perfil de domínio, mas os endpoints protegidos com `requireAuth` respondem `403 email_not_verified` até a confirmação. Auth, consulta de sessão, confirmação, reenvio, recuperação de senha e logout continuam acessíveis. Essa regra também se aplica às contas existentes ainda não verificadas.

## Envio e configuração

Configure `RESEND_API_KEY` e `EMAIL_FROM` para o remetente autorizado no Resend. A confirmação é transacional e independe de `EMAIL_NOTIFICATIONS_ENABLED`. Sem configuração, o cadastro continua possível como conta pendente; o reenvio retorna indisponibilidade uniforme. Falhas externas são registradas por categoria, sem email, link, token ou detalhe do provedor. A resposta confirma a solicitação, não a entrega real.

`BETTER_AUTH_URL` aponta para a API; `WEB_URL` é a origem exata do dashboard e `EXPO_TRUSTED_ORIGINS` deve incluir `muvit://` para o retorno mobile. A verificação inicial usa o endpoint nativo e redireciona para `/verify-email` ou `muvit://verify-email`. O retorno consulta a sessão novamente: somente `emailVerified=true` libera a área privada. O reenvio é limitado a três solicitações por minuto por IP e a interface aguarda 60 segundos após solicitação aceita.

O JWT usa o gerador e a validação oficiais do Better Auth, expira em até uma hora e inclui o ID da identidade. A confirmação exige esse ID na atualização para impedir que um link antigo afete outra conta se o endereço for reutilizado. Links emitidos anteriormente sem esse vínculo são rejeitados; solicite outro. O mecanismo nativo não garante invalidação de todos os links anteriores nem uso único, e um link válido já confirmado é idempotente.

## Alteração de email

O perfil continua exibindo o endereço efetivo até que o novo seja confirmado. A mensagem informa apenas que, se o endereço puder ser usado, será enviado um link; isso não confirma existência ou disponibilidade de conta. A confirmação de troca exige sessão da identidade que solicitou a mudança. Ao abrir o link sem sessão ou com outra conta, entre na conta correta e abra o link novamente. O token da troca chega no fragmento da URL Web e é retirado da barra antes da chamada à API.

Identidade e perfil são sincronizados em uma transação sob a trava do perfil. A entrega é adiada até a atualização do perfil terminar; falha ou compensação descarta o envio. Uma interrupção do processo depois da atualização e antes do despacho pode perder a mensagem: nesse caso solicite a troca novamente. O despacho não garante entrega na caixa postal.

## Desenvolvimento e validação

O seed demo confirma somente as duas identidades determinísticas de demonstração; ele é bloqueado em produção. Testes de negócio marcam suas identidades próprias como verificadas, enquanto os cenários de confirmação usam cadastro bruto e callback de email injetado. A suíte cobre envio, reenvio, origem, limite, expiração, isolamento da identidade, concorrência e rollback com PostgreSQL exclusivo. Ela não comprova entrega externa: essa evidência exige caixa postal e credenciais autorizadas.

O roteiro Web está em `apps/web/test/e2e/email-verification.md`. Em Android, o scheme `muvit://` requer Development Build registrado. Os fluxos independentes `.maestro/mobile/confirmacao-email.yaml` e `.maestro/mobile/confirmar-email-link.yaml` recebem credenciais e link descartáveis pelo harness de QA; o segundo é executado após capturar o link de confirmação, sem endpoint de mailbox no produto. Use API e banco isolados e AVD exclusivo. Guarde capturas e logs em `artifacts/<escopo>/<execucao>/` e remova links, tokens, cookies e dados pessoais antes de compartilhar.
