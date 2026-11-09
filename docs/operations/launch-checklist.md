# Checklist de soft-launch

Cada item exige evidência no ambiente correspondente antes de convidar usuários reais. Esta checklist não atesta implantação existente. Arquitetura, inventário, orçamento e decisões têm fonte única em [implantação pública](public-deployment.md); pendências críticas tornam o lançamento no-go.

## Decisões e infraestrutura

- [ ] Escolha Web/API/PostgreSQL na mesma Hostinger KVM 2 registrada; Brasil confirmado disponível na conta antes do setup. Se indisponível, interromper e solicitar nova decisão sem escolher alternativa.
- [ ] Topologia física de staging/produção decidida separadamente, sem presumir ambos na VPS inicial; tratamento dos dados, titularidade e isolamento aprovados.
- [ ] Owner e plantão do host compartilhado definidos: patches/SO, acesso individual por chaves, firewall, TLS/renovação, isolamento de permissões e serviços supervisionados.
- [ ] Recursos agregados, logs/disco e capacidade sob carga medidos; impacto conjunto de falha/reboot/manutenção e recuperação acordado, sem presumir HA ou suficiência pelo anúncio.
- [ ] Carga de CPU medida na topologia compartilhada e preparação para saturação/throttling comprovada; créditos/burst tratados conforme limite do provedor, sem presumir monitor de saldo se o painel não o expuser.
- [ ] Ausência de cifragem em repouso de disco/backups/snapshots avaliada e controles para dados/secrets aprovados antes de dados sensíveis; cópias externas cifradas e chaves recuperáveis.
- [ ] Contratação autorizada separadamente com pagamento antecipado, renovação e adicionais pendentes no fluxo de caixa; mensalização da oferta não tratada como cobrança mensal.
- [ ] Owners nominais e substitutos para billing, IAM, DNS/TLS, banco/mídia, plantão e lojas registrados em controle restrito; MFA e recuperação de contas conferidos.
- [ ] Domínio real e redirects canônicos definidos; DNS externo e TLS válido/renovação verificados para Web e API.
- [ ] API persistente, sem sleep, roteada para API_PORT e API_HOST corretos; timezone declarado e cron coordenado/idempotente inclusive durante rolling deploy.
- [ ] Porta raw Fastify/API_PORT sem acesso público: API nativa com proxy no mesmo host usa loopback; containers/outra rede privada exigem binding restrito à rede e firewall externo, impedindo contornar o proxy HTTPS.
- [ ] Staging/produção isolados em DB, mídia, chaves, remetente e URLs; previews sem secrets ou dados de produção; staging restrito a destinatários e dados sintéticos.

## Variáveis e autenticação

- [ ] Matriz nominal de [variáveis e secrets](public-deployment.md#variáveis-e-secrets) conferida no destino, com menor privilégio, rotação e revogação; sem copiar env local.
- [ ] DATABASE_URL aponta para o PostgreSQL local/privado correto, sem endpoint público; segredo Better Auth exclusivo por ambiente e somente no servidor.
- [ ] URLs públicas de Web/mobile corretas no build e sem credenciais; origins/callbacks exatos, sem wildcard.
- [ ] Gate de cookie API/Next/Server Actions comprovado: Set-Cookie, Secure/SameSite, encaminhamento Cookie, login, renovação, logout e isolamento entre ambientes.
- [ ] [Confirmação de email](email-verification.md) e [recuperação de senha](password-recovery.md) validadas com Better Auth em Web/mobile, incluindo bloqueio da conta pendente.

## Email e mídia

- [ ] RESEND_API_KEY e EMAIL_FROM configurados com remetente autorizado; domínio, SPF/DKIM/DMARC e entrega real verificados antes de liberar usuários.
- [ ] Confirmação/recuperação transacionais disponíveis independentemente de EMAIL_NOTIFICATIONS_ENABLED; flag de negócio definida conscientemente, sem assumir que desliga cron/push.
- [ ] Limites diários/mensais, bounces, supressões e alertas de entrega configurados e acompanhados por owner.
- [ ] Política de acesso, consentimento, retenção e exclusão de fotos aprovada antes da publicação; fotos privadas protegidas por solução de leitura autorizada e isolamento comprovado.
- [ ] PUT assinado R2 e CORS restritos às origens corretas; credenciais por bucket. URL pública atual e CORS não são evidência de autorização de leitura.

## Banco, backup e deploy

- [ ] [Runbook de backups](backups.md) revisado pelo plantão; política de imagem do host e limites de semanal padrão, diário pago, retenção e snapshot temporário conhecidos. Diário Hostinger somente se aprovado e contratado.
- [ ] Política DB independente e frequência aprovadas para o RPO; ponto lógico recuperável recente verificado, sem confundir backup semanal da VPS com RPO de 24h.
- [ ] Export externo cifrado e recuperação de mídia disponíveis; RPO/RTO e retenção aprovados e medidos em ensaio isolado conjunto DB/objetos.
- [ ] CI verde, artefatos por SHA/lockfile e build das dependências workspace comprovados; migrator com cwd e secrets de destino ensaiados.
- [ ] Migration única compatível concluída antes da promoção API → Web; falhas bloqueiam promoção; clientes mobile antigos suportados.
- [ ] SHA esperado em produção; rollback para SHA anterior compatível e procedimento de incidente de dados acordados.
- [ ] /health validado como liveness, readiness DB comprovada separadamente; smoke de login, cadastro/confirmação, aluno, treino, recuperação e upload concluído.

## Mobile Android/iOS

- [ ] Ordem de lançamento aprovada; identificadores Android/iOS definitivos, titulares de lojas, signing e recuperação de keystore/certificados definidos.
- [ ] Perfis development/preview/production e URLs conferidos; scheme muvit e deep links testados em binário apropriado.
- [ ] Builds de produção das plataformas liberadas gerados e testados; iOS validado por serviço/macOS e dispositivo compatível, sem inferir evidência deste Windows.
- [ ] Internal track Android/TestFlight e testadores configurados; instalação, sessão e fluxo principal validados contra API correta.
- [ ] Build, submissão e aprovação registrados separadamente; metadados, screenshots, política de privacidade, declaração de dados e suporte preenchidos nas lojas.
- [ ] EAS Update/OTA só usado com configuração/runtime compatível e rollback comprovados; channel isolado não atesta configuração.
- [ ] Push só anunciado se cliente/tokens/APNs/FCM estiverem comprovados; adaptador backend isolado não basta.

## Atendimento e liberação

- [ ] Logs com retenção e redação de PII/tokens/cookies/links; alertas de 5xx/latência, DB, email, cron, backup e custo chegam ao plantão designado.
- [ ] Canal de suporte e responsável pela semana de lançamento definidos; Analytics não substitui monitoramento de incidentes.
- [ ] Janela, usuários iniciais, orçamento completo e reação a estouro de custo acordados.
- [ ] Nova HEAD integrada verificada e revisada pelo coordenador após o delta Hostinger; revisão anterior da PR #40 não reutilizada como aprovação da mudança.
- [ ] Go/no-go registrado com evidências e decisões humanas; qualquer gate crítico pendente impede convite a usuários reais.

Registrar execuções futuras conforme [artefatos de QA](qa-artifacts.md), sem dados pessoais ou credenciais. Nenhum item foi executado ou aprovado por esta atualização documental.
