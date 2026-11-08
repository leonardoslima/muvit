# Implantação pública do Muvit

Proposta documental de 08/11/2026, reconciliada com a HEAD `2500d373fcebbf7ca36f94bc987ddeb33ecd2bbf`. A alternativa A é recomendada condicionalmente por continuidade dos runbooks; nenhuma conta, contratação, região, domínio ou decisão humana está confirmada por este documento. A publicação depende dos gates abaixo e do [checklist de lançamento](launch-checklist.md).

## Inventário comprovado

| Componente | Fonte no repositório | Consequência operacional |
| --- | --- | --- |
| Web Next.js 16 | `apps/web/package.json`, `apps/web/next.config.ts`, `apps/web/src/app/layout.tsx` | `next build/start`, Server Actions e Vercel Analytics; não é site estático nem monitoramento completo de erros |
| API Fastify 5 / Better Auth 1.6 | `apps/api/package.json`, `apps/api/src/server.ts`, `apps/api/src/lib/auth.ts` | Node persistente; sessão Better Auth e PostgreSQL, sem serviço separado de JWT |
| PostgreSQL / Drizzle / postgres-js | `packages/db/src/client.ts`, `packages/db/src/migrate.ts`, `packages/db/drizzle/` | Banco privado, migrations SQL versionadas; CI usa PostgreSQL 16, versão de produção ainda deve ser escolhida e ensaiada |
| Expo SDK 54 / React Native | `apps/mobile/package.json`, `apps/mobile/app.json`, `apps/mobile/eas.json` | Cliente mobile e builds EAS; EAS não hospeda a API |
| Cloudflare R2 | `apps/api/src/modules/uploads/r2-upload-signer.ts`, `apps/api/src/env.ts` | PUT assinado por cinco minutos e URL pública de avatar/foto de avaliação; variáveis R2 exigidas pela API |
| Resend | `apps/api/src/lib/mailer.ts`, `apps/api/src/app.ts` | Confirmação e recuperação transacionais obrigatórias para lançamento; notificações de negócio têm flag própria |
| Expo Push e cron | `apps/api/src/lib/push.ts`, `apps/api/src/jobs/notifications.ts` | Adaptador presente; registro de tokens/cliente e credenciais APNs/FCM operantes não comprovados; cron diário dentro da API |
| Billing local | `apps/api/src/modules/billing/use-cases/update-subscription.ts` | Atualiza plano no banco; não comprova gateway financeiro nem exige contratar um |

Fluxo proposto: navegador → Web Next e API HTTPS; mobile → API HTTPS; API → PostgreSQL privado, Resend e R2; clientes → PUT assinado R2 e leitura conforme política de mídia aprovada. Analytics permanece separado da operação de incidentes. Não há necessidade demonstrada de Redis, Kubernetes ou fila nesta proposta.

## Alternativas e região

Premissas comuns: staging e produção isolados, mesma carga, retenção, política de acesso, email, mídia, mobile e suporte operacional. Comparar custo total, incluindo operação humana.

| Alternativa | Custo / operação | Stack / segurança | Disponibilidade / portabilidade | Parecer |
| --- | --- | --- | --- | --- |
| A: Web Vercel Pro; API e DB Railway Pro; R2, Resend, EAS | Dois provedores de compute; mínimos e consumo em Custos; Next gerenciado reduz trabalho da Web | Mantém Fastify persistente, DB privado junto da API; sessão cross-host ainda precisa gate | Uma réplica inicial, sem HA comprovada; Node e PostgreSQL portáveis; signer acoplado ao endpoint R2 | Recomendada condicionalmente, não aprovada |
| B: Web, API e DB Railway Pro; mesmos R2, Resend, EAS | Retira plano Vercel; acrescenta processo Next e seu consumo, build e operação | `next start` existe; mesmos gates de sessão, mídia, isolamento e secrets de A | Concentra falha no Railway; mesma portabilidade Node/PostgreSQL | Válida; economia só após reestimar Next sob carga equivalente |
| C: API inteira em funções Vercel | Exigiria redesign e orçamento próprio | Ciclo efêmero não corresponde ao processo persistente e cron observado | Não equivalente ao runtime atual | Rejeitada para implantação inicial |

Vercel Hobby destina-se a uso pessoal não comercial ([política oficial](https://vercel.com/docs/plans/hobby), consulta 08/11/2026). Proposta: API e DB juntos em US East/Virginia, região listada pelo [Railway](https://docs.railway.com/deployments/regions), consulta 08/11/2026; não há latência brasileira medida ou residência no Brasil comprovada. Escolher compute Web próximo da API conforme oferta do plano. CDN não define residência dos dados. Localização de DB, objetos, backups e provedores de email requer revisão humana de tratamento internacional dos dados. Targets comerciais não são SLA próprio nem disponibilidade observada.

## Ambientes e domínio/TLS

| Ambiente | Recursos e acesso propostos | Entrega |
| --- | --- | --- |
| Desenvolvimento | Recursos locais e dados sintéticos; sem credenciais de produção | Desenvolvimento interno |
| Staging | Projeto/serviços, DB, bucket, chaves, remetente, URLs, backups e permissões próprios; acesso restrito e destinatários autorizados | SHA candidato; nenhum dado real copiado da produção |
| Produção | Recursos e identidade próprios; acesso mínimo, auditoria e backup obrigatório | SHA aprovado após staging e gate operacional |
| Preview Web | Sem secrets/dados de produção; sem origem wildcard autorizada na API | Recursos sintéticos ou acesso bloqueado até integração explícita |

Propor Web e API em subdomínios distintos sob o mesmo domínio registrável, com nomes separados por ambiente. Domínio real, registrador e titular dependem do proprietário. Exigir TLS gerenciado válido em cada endpoint, redirecionamento canônico, renovação e alertas com responsável; alterar DNS somente em rodada autorizada. DB sem exposição pública permanente; migração deve usar acesso temporário controlado.

Gate de autenticação: o cookie atual da API não tem domínio compartilhado explicitamente configurado. Cookie host-only pode não chegar ao servidor Next/Server Actions. Mesmo domínio registrável não resolve isso sozinho. Antes de publicar, provar Set-Cookie, Secure/SameSite, CORS com origens exatas, envio de Cookie pelo navegador e encaminhamento no Next, login, renovação, logout e isolamento staging/produção. Compartilhar domínio de cookie ou introduzir proxy exige mudança de produto e revisão de segurança separadas; não presumir configuração pronta.

## Variáveis e secrets

Inventário nominal, sem valores; fontes: `apps/api/src/env.ts` e exemplos versionados dos workspaces. Não transferir `.env` local para produção.

| Destino | Nomes | Classificação |
| --- | --- | --- |
| API | `NODE_ENV`, `API_PORT`, `API_HOST`, `BETTER_AUTH_URL`, `WEB_URL`, `EXPO_TRUSTED_ORIGINS` | Configuração e URLs/origins; não credenciais |
| API e migrator DB | `DATABASE_URL` | Segredo com credenciais; usuário e permissões distintos para runtime e migração quando definidos |
| API | `BETTER_AUTH_SECRET` | Segredo exclusivo por ambiente, mínimo 32 caracteres |
| API | `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_PUBLIC_URL` | Identificadores e URL, sem autorização implícita de leitura |
| API | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Credenciais restritas ao bucket e às operações necessárias |
| API | `RESEND_API_KEY` | Segredo de envio por ambiente |
| API | `EMAIL_FROM`, `EMAIL_NOTIFICATIONS_ENABLED` | Remetente autorizado e flag de email de negócio |
| Web | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BASE_URL` | Públicas e embutidas no cliente; mudar exige novo build |
| Mobile | `EXPO_PUBLIC_API_URL` | Pública e embutida no cliente; nunca incluir credencial |

Usar secret stores dos provedores, MFA, menor privilégio e acesso individual. Proprietário designará owner e substituto por conta, DNS/TLS, billing, IAM, banco, mídia e lojas antes de contratar. Registrar recuperação de conta, acesso de emergência, revogação e rotação por ambiente em controle restrito. Rotação de Better Auth pode invalidar sessões; rotação de DB/storage/email exige janela e verificação do consumidor. Nunca inserir chaves em variáveis públicas, logs, documentos ou artefatos.

## CI/CD e deploy

A CI atual em `.github/workflows/ci.yml` executa Biome, testes com PostgreSQL 16, build e typecheck. Não comprova deploy. Node >=24 e pnpm 10 seguem a raiz. Pipeline futuro, ainda não configurado:

1. Checks existentes verdes para o SHA candidato; instalar com lockfile congelado e construir artefatos imutáveis identificados por SHA.
2. Preparar staging isolado; executar uma migration controlada, iniciar API e Web e fazer smoke de autenticação, confirmação/recuperação, aluno, treino e upload com dados sintéticos.
3. Registrar aprovação operacional, backup recuperável e janela; executar migration de produção única e compatível, promover API e depois Web; validar smoke e observar alertas antes de convidar usuários.
4. Manter compatibilidade com versões mobile já distribuídas; interromper promoção em qualquer falha de migration ou gate, preservando logs sem dados sensíveis.

Comandos existentes para rodada futura, a partir da raiz, não executados neste card:

```text
pnpm --filter @muvit/api build
pnpm --filter @muvit/api start
pnpm --filter @muvit/web build
pnpm --filter @muvit/web start
pnpm --filter @muvit/db migrate
```

Os prebuilds da API constroem validators/db e os da Web constroem validators fora do Turbo; `turbo.json` ordena `^build`. Preservar dependências workspace e artefatos `dist` no runtime; não instalar só o diretório da aplicação. Web start usa porta 3000 no script atual. Na API, configurar o roteamento do provedor para `API_PORT` e binding `API_HOST=0.0.0.0`: o código não lê `PORT` genérico.

API sempre ativa, sem sleep, inicialmente uma réplica. O cron `0 9 * * *` inicia fora de test em cada processo, sem timezone explícito. Propor timezone operacional UTC e aprovar sua correspondência com o horário de negócio antes de ativar. Rolling deploy pode sobrepor processos mesmo com uma réplica: coordenação/idempotência do job é pendência técnica antes de habilitar envios dependentes de execução única. `EMAIL_NOTIFICATIONS_ENABLED=false` não desliga cron nem push e não controla confirmação/recuperação. Staging deve impedir envio a destinatários reais por restrição operacional e configuração ensaiada; a flag sozinha não basta.

## Migrations e rollback

O script DB atual usa `node --env-file=.env --import tsx src/migrate.ts` e resolve `./drizzle` relativamente ao cwd de `packages/db`, selecionado pelo filtro pnpm. Não é receita pronta para produção com secrets injetados: adaptar o launcher em mudança separada para não depender de arquivo local, empacotar migrations/tsx e ensaiar no ambiente de destino. Não fabricar arquivo com segredo neste card. Um único operador/job aplica migrations; não executar na inicialização de cada réplica, não usar seed demo em produção.

Usar expand/contract: adicionar compatibilidade, migrar dados com controle e só remover contratos após clientes antigos e rollback deixarem de depender deles. Falha bloqueia promoção e exige diagnóstico do estado aplicado antes de repetir. Registrar SHA, migrations aplicadas, backup anterior, executor e resultado.

Rollback de aplicação: voltar ao SHA imutável anterior apenas se schema e clientes forem compatíveis. Não há down automático presumido. Incidente de dados: pausar escrita e jobs, preservar evidências e dados atuais, avaliar perda desde o ponto recuperável e obter autorização de restore; redeploy não recupera dados. Procedimento de recuperação é fonte única em [backups](backups.md).

## Backup e restauração

O [runbook de backups](backups.md) governa agenda nativa, export externo, mídia e ensaio conjunto. RPO <=24h e RTO <=4h são propostas para aprovação humana e medição, não garantias. Backup do volume PostgreSQL não cobre objetos R2. Exigir inventário de referências e cópia recuperável de mídia no mesmo plano de consistência antes de publicar fotos.

## Email, storage e observabilidade

Resend e remetente autorizado são obrigatórios para liberar usuários: confirmar conta e recuperar senha independem da flag de notificações. Fontes de verdade: [recuperação de senha](password-recovery.md) e [confirmação de email](email-verification.md). Validar domínio, SPF/DKIM/DMARC conforme configuração do remetente, limites diários/mensais, bounces, supressões e alerta de falha; resposta da API não prova entrega na caixa postal.

R2: CORS de PUT limitado às origens aprovadas, chave por bucket e acesso mínimo. Hoje o signer devolve URL pública para foto de avaliação: URL conhecida não prova autorização. Política de acesso, consentimento, retenção e exclusão de fotos é decisão humana bloqueante. Fotos privadas exigem solução separada de autorização de leitura e teste de isolamento antes de publicação; não liberar por simples obscuridade do endereço. CORS não protege leitura pública.

Fastify já tem logger; definir retenção e redação de tokens, cookies, links e PII antes da operação. Responsável e canal de plantão devem receber alertas de 5xx/latência, saturação/conexões DB, entrega de email, cron duplicado/falho, backup vencido e custo. `/health` mede liveness; readiness do DB precisa evidência adicional. Vercel Analytics não comprova cobertura de incidentes. Não há contratação de observabilidade autorizada nem SLA próprio estabelecido.

## Mobile Android/iOS

`eas.json` contém development (Development Build interno), preview (distribuição interna) e production, com channels correspondentes. Definir URL da API por ambiente antes do build. Channels sozinhos não comprovam EAS Update configurado; OTA requer configuração, runtime compatível e política de rollback próprias. Mudança nativa exige novo binário compatível, não promessa de correção via OTA.

Scheme atual `muvit` atende retornos de autenticação. Android usa `com.anonymous.muvit` e iOS não declara bundleIdentifier: aprovar identificadores definitivos antes de contas, signing e submissão. Designar titular e substituto para keystore, certificados, perfis, recuperação e revogação; guardar credenciais em cofre. iOS exige serviço de build ou macOS; este Windows não comprova validação iOS.

Separar build, submissão e aprovação das lojas. Em rodada autorizada, usar internal track Android/TestFlight, testar instalação, deep links, sessão e fluxo principal contra a API correta; depois revisar metadados, política de privacidade, declaração de dados e atendimento. Ordem Android/iOS é decisão humana. Push só entra como compromisso após cliente, tokens e credenciais APNs/FCM comprovados; adaptador existente não basta.

## Custos e fórmulas

Referências não vinculantes em USD, sem impostos/conversão; consulta 08/11/2026. Revalidar billing, disponibilidade e limites antes de contratar. Franquia gratuita não garante conta final zero.

| Serviço | Piso, cotas e excedentes | Fonte oficial e data |
| --- | --- | --- |
| Vercel Pro | USD 20/mês com uma seat de deploy e USD 20 de crédito de uso; seat extra USD 20/mês; excedentes separados | [Pro](https://vercel.com/docs/plans/pro-plan), [pricing](https://vercel.com/pricing), 08/11/2026 |
| Railway Pro | Compromisso mínimo USD 20/mês aplicado a USD 20 de uso do workspace; cobrar consumo acima disso; não multiplicar assinatura por ambiente sem contas distintas | [Pricing](https://railway.com/pricing), [billing](https://docs.railway.com/pricing/understanding-your-bill), 08/11/2026 |
| R2 Standard | Franquia mensal 10 GB-mês, 1 milhão A, 10 milhões B; acima: USD 0,015/GB-mês, USD 4,50/milhão A, USD 0,36/milhão B; egress grátis | [R2](https://developers.cloudflare.com/r2/pricing/), 08/11/2026 |
| Resend | Free: 3.000 emails/mês, 100/dia; Pro: USD 20/mês para 50.000, excedente USD 0,90/1.000 | [Resend](https://resend.com/pricing), 08/11/2026 |
| EAS | Free USD 0: 15 builds Android e 15 iOS/mês, fila baixa; Starter USD 19/mês com USD 45 de crédito de build e 3 mil MAU; Production USD 199/mês com USD 225 de crédito e 50 mil MAU; consumo adicional separado | [Expo](https://expo.dev/pricing), 08/11/2026 |
| Apple Developer Program | USD 99/ano, preço local pode variar | [Apple](https://developer.apple.com/help/account/membership/program-enrollment), 08/11/2026 |
| Google Play Console | USD 25 uma vez; verificação e requisitos adicionais conforme conta | [Google](https://support.google.com/googleplay/android-developer/answer/6112435), 08/11/2026 |
| Domínio, backup externo, tributos e operação humana | Sem cotação: domínio/titular, volume/retensão externa e serviço ainda dependem de decisão; não representar como zero | Confirmar com registrador/provedor escolhido antes da contratação |

Fórmulas de referência, usando os preços da tabela (08/11/2026):

- Railway mensal = `max(20, U)`, onde U é consumo agregado de staging e produção do workspace (compute, volumes, rede e itens faturáveis). Não somar crédito novamente.
- Vercel mensal = `20 × seats + max(0, consumo elegível - 20) + extras não cobertos`; crédito de uso uma vez, não por seat extra.
- R2 mensal = `max(0, GB-mês - 10) × 0,015 + max(0, A - 1.000.000)/1.000.000 × 4,50 + max(0, B - 10.000.000)/1.000.000 × 0,36`, observados arredondamentos de faturamento. Franquia compartilhada da conta, não replicada por ambiente.
- Resend Pro = `20 + max(0, emails - 50.000)/1.000 × 0,90`, sujeito às unidades de cobrança. Free exige respeitar também 100/dia.
- EAS Starter mensal = `USD 19 + max(USD 0, custo elegível mensal de builds em USD - USD 45 de crédito mensal) + outros excedentes mensais em USD`; EAS Production mensal = `USD 199 + max(USD 0, custo elegível mensal de builds em USD - USD 225 de crédito mensal) + outros excedentes mensais em USD`. MAU e outros serviços têm limites próprios, não crédito em dinheiro reutilizável. Essas fórmulas são dos planos pagos; no Free, preservar as cotas da tabela e não presumir cobrança para continuar após atingir um limite: respeitar bloqueios e condições do plano ([Expo](https://expo.dev/pricing), 08/11/2026).
- A = Vercel + Railway(API/DB dos ambientes) + R2 + Resend + EAS + backup externo + domínio anual/12 + extras/tributos. B retira Vercel e recalcula Railway incluindo Next sob a mesma carga.

Exemplo hipotético, não medição: U Railway = USD 40, uma seat Vercel sem excedentes, R2 Standard de 100 GB-mês com franquia disponível e operações dentro dela. Storage R2 = `(100 - 10) × 0,015 = USD 1,35`; subtotal A = USD 61,35/mês antes de email/EAS/domínio/backup/tributos. Se adicionar Resend Pro e EAS Starter sem excedentes, subtotal A = USD 100,35/mês, ainda incompleto. Para B, se U total incluindo Next fosse USD 40, subtotal correspondente seria USD 41,35 (ou USD 80,35 com os mesmos planos de email/EAS); essa hipótese precisa medição do processo Next. Fontes e data: tabela acima, 08/11/2026.

Piso de planos A = USD 40/mês e B = USD 20/mês, sem consumo adicional e despesas desconhecidas; não são orçamento completo nem teto ([Vercel](https://vercel.com/docs/plans/pro-plan), [Railway](https://railway.com/pricing), 08/11/2026). Lojas novas somam USD 124 no primeiro ano, Apple recorrente e Google único, sem converter isso em assinatura mensal ([Apple](https://developer.apple.com/help/account/membership/program-enrollment), [Google](https://support.google.com/googleplay/android-developer/answer/6112435), 08/11/2026). Domínio e backup externo exigem cotação após definir nome, titular e volume; não há preço comprovado para esses itens.

## Decisões humanas e owners

| Decisão bloqueante para publicação/contratação | Papel que deve assumir a decisão e evidência futura |
| --- | --- |
| A ou B, orçamento, teto mensal, alertas e resposta a estouro | Proprietário financeiro; aprovação registrada e billing por conta, com substituto |
| Domínio, titularidade de contas, DNS/TLS, MFA e emergência | Proprietário do produto e administrador designado; contatos e recuperação em cofre |
| Região, tratamento internacional e política de fotos | Responsável pelo produto/dados; política de acesso/consentimento/retenção/exclusão aprovada |
| RPO/RTO, retenção, export externo e restauração | Owner de banco/mídia e substituto; aprovação e ensaio medido conforme runbook |
| Timezone, cron, rollback, plantão e monitoramento | Engenharia/operação; coordenação técnica validada, alertas e canal atendidos |
| Android/iOS, signing, contas e ordem de lançamento | Titular das lojas e responsável mobile; identificadores e credenciais recuperáveis |

Nenhum nome pessoal ou aprovação foi presumido. Cookies entre API/Next, privacidade de mídia, coordenação de cron e launcher de migrations precisam solução técnica em escopo separado; responsáveis nominais devem ser designados antes de publicar.

## Limites de evidência

Este card documenta e inspeciona fontes versionadas; não provisiona, contrata, altera DNS/TLS/secrets, executa migration/restore ou publica. DNS/TLS real, entrega de email, latência no Brasil, backups ativos, tempo de recuperação, prontidão runtime, builds/lojas e push permanecem NÃO COMPROVADOS. Seguir [artefatos de QA](qa-artifacts.md) para registrar evidências futuras; aprovação humana e validação real são gates do lançamento, não afirmações desta proposta.
