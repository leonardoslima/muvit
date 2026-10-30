# Recuperação de senha

O fluxo usa exclusivamente os endpoints nativos do Better Auth: `POST /api/auth/request-password-reset`, `GET /api/auth/reset-password/:token` e `POST /api/auth/reset-password`. Os tokens expiram em uma hora e são consumidos na troca; a troca revoga as sessões existentes. A senha mantém o limite nativo de 8 a 128 caracteres.

## Configuração

Configure `RESEND_API_KEY` e `EMAIL_FROM` na API com remetente autorizado no Resend. Esses emails são transacionais e independem de `EMAIL_NOTIFICATIONS_ENABLED`. A ausência de configuração retorna indisponibilidade para qualquer email, antes de consultar a existência da conta. Não imprima links ou tokens em logs nem acrescente fallback de envio para o console.

`BETTER_AUTH_URL` deve ser o endereço público correto da API. `WEB_URL` deve corresponder à origem da Web, que utiliza `/reset-password` como retorno. O Mobile usa `muvit://reset-password`, permitido por `EXPO_TRUSTED_ORIGINS=muvit://`. Não configure wildcard para acomodar callbacks externos.

A solicitação responde de forma genérica para contas existentes e ausentes. A entrega externa é disparada sem aguardar o provedor para não revelar a existência da conta pelo tempo de resposta. Falhas de entrega produzem apenas categoria operacional sem email, URL, token ou detalhe do provedor. A confirmação da solicitação não comprova entrega na caixa postal; em caso de falha, o usuário pode solicitar novo link.

## Verificação reproduzível

Os testes da API usam callback de envio injetado e PostgreSQL exclusivo de teste para verificar validade, uso único, revogação, callbacks permitidos e bloqueados, limites de solicitação e equivalência das respostas. Isso verifica o fluxo de autenticação sem enviar emails reais. O teste do adaptador Resend verifica sua chamada e mensagem; entrega real exige configuração e caixa postal autorizadas.

O roteiro Web está em `apps/web/test/e2e/password-recovery.md`. Para Android, os fluxos `.maestro/mobile/recuperacao-senha.yaml` e `.maestro/mobile/redefinicao-senha.yaml` são cenários independentes; não fazem parte de `mobile:e2e --scenario all`. Consulte as variáveis no início dos próprios fluxos e execute no AVD exclusivo, com API e Metro desta worktree. A API precisa ter entrega configurada ou um callback de QA injetado pelo harness de teste; não acrescente endpoints de mailbox ao produto. Um link `muvit://` exige Development Build registrado para esse scheme; ao usar Expo Go, adapte o link ao endereço Expo da sessão e registre a limitação.

Salve resultados em `artifacts/<escopo>/<execucao>/`, conforme `qa-artifacts.md`. Remova tokens, cookies, credenciais e endereços pessoais dos relatórios. Não compartilhe capturas que mostrem tokens na barra de endereço.
