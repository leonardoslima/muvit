# Recuperação de senha

Rodada autônoma MUV-11. Base: 042890cd727d929a61ba1a9b367e78fe9501207b.

## Decisões

Usar os endpoints nativos request-password-reset/reset-password do Better Auth, mantendo senha, validade e uso único sob responsabilidade do provedor. Reutilizar Resend, sem serviço ou dependência nova. Web possui páginas públicas de solicitação e redefinição; Mobile oferece solicitação e recebe retorno por deep link. A resposta de solicitação é genérica para contas existentes e ausentes. Senha segue as regras existentes. Sessões anteriores são revogadas na redefinição.

Alternativas: implementar tokens próprios foi descartado por violar a arquitetura; usar apenas Web foi descartado por deixar a superfície Mobile sem recuperação. As decisões técnicas são do coordenador, dentro da autonomia autorizada, sem alterar confirmação de email.

## Tarefas e interfaces

1. API: configurar sendResetPassword no factory Better Auth, mensagem de email escapada e adaptador Resend existente. Garantir configuração explícita de entrega sem sucesso silencioso, ausência de tokens em logs, limite de solicitações, prazo curto e revogação. Testes nativos com banco exclusivo: conta existente/ausente, troca e login, senha anterior inválida, token inválido/expirado/reutilizado e falha de entrega.
2. Web: rotas públicas /forgot-password e /reset-password, link no login. authClient.requestPasswordReset({email,redirectTo: origin + '/reset-password'}) e authClient.resetPassword({newPassword,token}). Estados de carregamento, erro genérico, confirmação e link inválido; testes de UI e E2E.
3. Mobile: mesmas operações nativas, callback muvit://reset-password (confirmar Expo Router e trustedOrigins). Rotas de autenticação acessíveis sem sessão, controles v2 e teste de UI; atualizar Maestro de autenticação.
4. Coordenador: instalar dependências, banco/API exclusivos, integração de contratos, testes/typecheck/Biome por workspace, QA navegador/Android, scan UTF-8, diff e review independente. Publicar PR em develop, conferir CI e revisão da HEAD corrente; corrigir achados e atualizar Linear para revisão humana sem merge.

## Verificação

Executar scripts test e typecheck dos três apps, Biome nos arquivos alterados, E2E de autenticação pertinente. Evidências em artifacts/muv-11/2026-10-30-recuperacao-senha/. Nenhum mock substitui QA real. Review verifica enumeração, redirects externos, tokens em logs, expiração/uso único, revogação, mensagens e navegação sem sessão.

## Recursos

Batuta base, execução nativa Codex, três unidades com caminhos disjuntos e teto de quatro agentes contando principal; revisão após integração. Cota e tokens sem telemetria permanecem desconhecidos. Sem extras pagos nem Astra. Escritas de cada worker limitadas ao app sob sua responsabilidade; principal controla Git, Linear e infraestrutura.
