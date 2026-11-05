# AGENTS.md

## Escopo

Estas regras valem para `apps/api/src/modules/auth` e complementam `apps/api/AGENTS.md`.

## Autenticação e autorização

- Better Auth é a única fonte de senha, sessão e cookie; não recrie mecanismos de token, hashing próprio ou endpoints paralelos.
- Papéis `trainer` e `student` são imutáveis depois da criação da identidade.
- Casos de uso de negócio recebem `RequestIdentity` ou IDs de domínio, nunca tipos, sessões, cookies ou tabelas do Better Auth.
- Resolva o perfil de domínio a partir de `authUserId`; relações e regras de negócio usam somente `profileId`.
- Rotas protegidas devem usar `requireAuth` e declarar explicitamente o papel exigido com `requireRole`.
- Não registre senhas, hashes, secrets, cookies, tokens de sessão ou headers sensíveis.

## Provisionamento e persistência

- Mantenha o Better Auth restrito à infraestrutura deste módulo.
- Perfis de treinador e aluno independente são provisionados depois da identidade autenticável.
- Se o provisionamento do perfil falhar, compense removendo a identidade criada.
- Implementações Drizzle ficam em `repositories/drizzle-*.ts` e cumprem portas pequenas orientadas ao consumidor.
- Identidades sem perfil válido devem ser tratadas como não autenticadas.

## Recuperação de senha

- Recuperação de senha usa somente os endpoints nativos do Better Auth, com expiração de 1 hora, uso único e revogação de sessões; o envio transacional via Resend independe de `EMAIL_NOTIFICATIONS_ENABLED`.
- Sem `RESEND_API_KEY` ou `EMAIL_FROM`, a solicitação deve retornar indisponibilidade uniforme antes de consultar a conta; falha do provedor deve manter a resposta genérica e registrar somente categoria segura, sem erro original, email ou token.
- Não aguarde a entrega externa na resposta de solicitação; preserve a sanitização de URLs de autenticação no logger, incluindo token no caminho do callback e parâmetros de consulta.

## Confirmação de email

- Contas não verificadas mantêm acesso aos endpoints nativos de autenticação, recuperação, confirmação, reenvio e logout; `requireAuth` bloqueia dados de domínio com `email_not_verified` até a confirmação.
- Emita o JWT de confirmação pelo gerador oficial do Better Auth com `authUserId` na carga e valide o vínculo antes de confirmar; condicione atomicamente o update ao ID, pois o email pode ser reutilizado por outra identidade. Tokens antigos sem vínculo são rejeitados e exigem reenvio.
- Limite o reenvio a três solicitações por minuto por IP; trate a entrega Resend como transacional e assíncrona, sem registrar email, token ou erro do provedor. Somente identidades determinísticas do seed demo podem ser marcadas verificadas pelo próprio seed.
- Troca de email preserva o endereço anterior até confirmação e exige a sessão da mesma identidade; o adapter Drizzle atualiza identidade e perfil na mesma transação sob a trava de perfil. Atrase o envio da troca até o PATCH terminar com sucesso e descarte mensagens em caso de falha.

## Testes

- Testes de autenticação devem usar operações nativas do Better Auth e sessão por cookie.
- Cubra criação de identidade, resolução de perfil, papéis, sessão ausente ou revogada e compensação de provisionamento.
- Não use dados compartilhados entre testes para simular sessão autenticada.
