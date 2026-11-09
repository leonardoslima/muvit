# Implantação pública do Muvit

Atualização documental de 08/11/2026, elaborada após a HEAD `24a04cbe2762024a046566f02a2b9613b8289008`; inventário original baseado em `2500d373fcebbf7ca36f94bc987ddeb33ecd2bbf`. O usuário decidiu hospedar inicialmente Web, API e PostgreSQL juntos na mesma VPS Hostinger KVM 2. Brasil é a região preferida, somente se disponível na conta durante o setup; se indisponível, interromper e solicitar nova decisão, sem escolher outra região. A topologia física de staging/produção permanece sem escolha. Nenhuma compra, contratação, configuração ou implantação foi autorizada neste card. A publicação depende dos gates abaixo e do [checklist de lançamento](launch-checklist.md).

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

Fluxo definido para o desenho inicial: navegador/mobile → endpoints HTTPS → Web Next e API Fastify na mesma VPS Hostinger KVM 2; API → PostgreSQL na interface local/rede privada dessa VPS, Resend e R2; clientes → PUT assinado R2 e leitura conforme política aprovada. PostgreSQL não terá endpoint público. Analytics permanece separado da operação de incidentes; sua presença no pacote não obriga hospedagem Vercel nem comprova funcionamento fora dela. Não há necessidade demonstrada de Redis, Kubernetes ou fila nesta proposta.

## Arquitetura escolhida, alternativas superadas e região

Web, API e PostgreSQL compartilham o mesmo host KVM 2 por decisão do usuário. As comparações anteriores de plataformas gerenciadas foram superadas por essa decisão e não são parcelas do orçamento vigente. API em funções efêmeras continua incompatível com o processo persistente e cron observados, exigindo redesign fora deste card.

A [oferta Hostinger](https://www.hostinger.com/vps-hosting?lang=en), consultada no plano em 08/11/2026, anuncia 2 vCPU, 8 GB RAM, 100 GB NVMe e 8 TB/mês para KVM 2. São limites anunciados, não capacidade medida. SO, proxy HTTPS, Web, API, PostgreSQL, logs e eventual build competem por CPU/RAM/disco/rede. Avaliar build fora do runtime para reduzir competição; não há configuração de CI/host pronta. Medir carga e margem de recursos antes de publicar: o anúncio não prova usuários suportados, throughput, latência, suficiência ou HA.

Segundo a [documentação oficial de créditos de CPU da Hostinger](https://www.hostinger.com/support/how-cpu-credits-work-on-hostinger-vps/), consultada em 08/11/2026, créditos permitem burst até 100%; a reserva cheia suporta aproximadamente três horas a 100% dos vCPUs alocados. Quando o saldo se esgota, KVM 2 fica temporariamente limitada a 30% até recompor créditos. São estimativas e limites do provedor, não medições do Muvit; medir carga e preparar a operação para saturação/throttling na topologia compartilhada. Não presumir monitoramento de saldo sem confirmar que o painel expõe esse dado.

Falha, reboot, manutenção, disco cheio, saturação ou comprometimento do host podem afetar Web, API e banco simultaneamente. Processos separados não criam domínio de falha independente. Planejar janela, recuperação e monitoramento conjunto, sem pressupor alta disponibilidade. Runtime Node e export PostgreSQL continuam portáveis, mas a imagem da VPS não equivale a export lógico portátil.

Brasil consta como opção VPS na [localização oficial Hostinger](https://www.hostinger.com/support/1583267-where-are-hostinger-servers-located/), consultada no plano em 08/11/2026. Confirmar disponibilidade efetiva na conta durante o setup antes de contratar/configurar; se ausente, parar e pedir nova decisão. Região fica fixa após configuração inicial; troca exige reconstrução/migração planejada. Latência brasileira não foi medida. Confirmar residência efetiva de DB, objetos, backups e email; selecionar Brasil para o host não comprova residência de todas as integrações nem elimina revisão de tratamento internacional dos dados.

## Ambientes e domínio/TLS

| Ambiente | Recursos e acesso propostos | Entrega |
| --- | --- | --- |
| Desenvolvimento | Recursos locais e dados sintéticos; sem credenciais de produção | Desenvolvimento interno |
| Staging | Serviços, DB, bucket, chaves, remetente, URLs, backups e permissões logicamente isolados; acesso restrito e destinatários autorizados | SHA candidato; nenhum dado real copiado da produção |
| Produção | Recursos e identidade próprios; acesso mínimo, auditoria e backup obrigatório | SHA aprovado após staging e gate operacional |
| Preview Web | Sem secrets/dados de produção; sem origem wildcard autorizada na API | Recursos sintéticos ou acesso bloqueado até integração explícita |

Propor Web e API em subdomínios distintos sob o mesmo domínio registrável, com nomes separados por ambiente. Domínio real, registrador e titular dependem do proprietário. Definir roteamento HTTPS/reverse proxy e TLS válido em cada endpoint, redirecionamento canônico, renovação e alertas com responsável, sem presumir automação gerenciada pronta; alterar DNS somente em rodada autorizada. PostgreSQL somente na interface local/rede privada, sem endpoint público; migração deve usar acesso administrativo controlado. A topologia física de staging/produção não foi decidida: esta matriz não coloca ambos na VPS inicial nem presume outra VPS. Preservar isolamento de dados, identidades, segredos, URLs e acesso qualquer que seja a futura topologia.

Gate de autenticação: o cookie atual da API não tem domínio compartilhado explicitamente configurado. Cookie host-only pode não chegar ao servidor Next/Server Actions. Mesmo domínio registrável ou coabitação física na VPS não resolve isso sozinho. Antes de publicar, provar Set-Cookie, Secure/SameSite, CORS com origens exatas, envio de Cookie pelo navegador e encaminhamento no Next, login, renovação, logout e isolamento staging/produção. Compartilhar domínio de cookie ou introduzir proxy exige mudança de produto e revisão de segurança separadas; não presumir configuração pronta.

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

Definir armazenamento e injeção de secrets da VPS fora do repositório, com permissões por processo, acesso individual e menor privilégio; não presumir secret store gerenciado. Nas contas externas, usar controles de secrets e MFA disponíveis. Acesso administrativo ao host deve ser individual por chaves, com recuperação e revogação documentadas. Proprietário designará owner e substituto por conta, DNS/TLS, billing, IAM, banco, mídia e lojas antes de contratar. Registrar recuperação de conta, acesso de emergência, revogação e rotação por ambiente em controle restrito. Rotação de Better Auth pode invalidar sessões; rotação de DB/storage/email exige janela e verificação do consumidor. Nunca inserir chaves em variáveis públicas, logs, documentos ou artefatos.

## CI/CD e deploy

A CI atual em `.github/workflows/ci.yml` executa Biome, testes com PostgreSQL 16, build e typecheck. Não comprova deploy. Node >=24 e pnpm 10 seguem a raiz. Na VPS, definir responsáveis por SO/patches, firewall, acesso administrativo, isolamento de processos/permissões, supervisão/reinício dos serviços, roteamento HTTPS/TLS e monitoramento de host/disco. Software de proxy e supervisor ainda não foi escolhido e nenhuma configuração foi instalada. Pipeline futuro, ainda não configurado:

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

Os prebuilds da API constroem validators/db e os da Web constroem validators fora do Turbo; `turbo.json` ordena `^build`. Preservar dependências workspace e artefatos `dist` no runtime; não instalar só o diretório da aplicação. Web start usa porta 3000 no script atual. Na API nativa no host com proxy HTTPS no mesmo host, usar `API_HOST=127.0.0.1` e rotear internamente para `API_PORT`. Se proxy/app estiverem em containers ou outra rede privada, definir binding acessível apenas nessa rede e firewall que bloqueie acesso externo à `API_PORT`; `0.0.0.0` só pode ser considerado nessa topologia com isolamento e bloqueio externo comprovados, nunca como padrão irrestrito. Confirmar que a porta raw Fastify não está pública, impedindo contornar o proxy HTTPS. O proxy ainda não foi escolhido; o código não lê `PORT` genérico.

API sempre ativa, sem sleep, inicialmente uma réplica. O cron `0 9 * * *` inicia fora de test em cada processo, sem timezone explícito. Propor timezone operacional UTC e aprovar sua correspondência com o horário de negócio antes de ativar. Rolling deploy pode sobrepor processos mesmo com uma réplica: coordenação/idempotência do job é pendência técnica antes de habilitar envios dependentes de execução única. `EMAIL_NOTIFICATIONS_ENABLED=false` não desliga cron nem push e não controla confirmação/recuperação. Staging deve impedir envio a destinatários reais por restrição operacional e configuração ensaiada; a flag sozinha não basta.

## Migrations e rollback

O script DB atual usa `node --env-file=.env --import tsx src/migrate.ts` e resolve `./drizzle` relativamente ao cwd de `packages/db`, selecionado pelo filtro pnpm. Não é receita pronta para produção com secrets injetados: adaptar o launcher em mudança separada para não depender de arquivo local, empacotar migrations/tsx e ensaiar no ambiente de destino. Não fabricar arquivo com segredo neste card. Um único operador/job aplica migrations; não executar na inicialização de cada réplica, não usar seed demo em produção.

Usar expand/contract: adicionar compatibilidade, migrar dados com controle e só remover contratos após clientes antigos e rollback deixarem de depender deles. Falha bloqueia promoção e exige diagnóstico do estado aplicado antes de repetir. Registrar SHA, migrations aplicadas, backup anterior, executor e resultado.

Rollback de aplicação: voltar ao SHA imutável anterior apenas se schema e clientes forem compatíveis. Não há down automático presumido. Incidente de dados: pausar escrita e jobs, preservar evidências e dados atuais, avaliar perda desde o ponto recuperável e obter autorização de restore; redeploy não recupera dados. Procedimento de recuperação é fonte única em [backups](backups.md).

## Backup e restauração

O [runbook de backups](backups.md) governa imagem/snapshot do host, export lógico externo e mídia com ensaio conjunto. O backup semanal padrão do host não atende por si só ao RPO proposto de 24h; backup diário Hostinger é adicional pago sem preço confirmado. Discos, backups e snapshots são anunciados sem cifragem em repouso; definir proteção para dados sensíveis antes de publicar. Export cifrado não cifra automaticamente disco ou imagem. RPO <=24h e RTO <=4h são propostas para aprovação humana e medição, não garantias. Imagem da VPS não prova consistência transacional do PostgreSQL nem cobre objetos R2; recuperação lógica do banco local ainda deve ser implementada e ensaiada. Exigir inventário de referências e cópia recuperável de mídia no mesmo plano de consistência antes de publicar fotos.

## Email, storage e observabilidade

Resend e remetente autorizado são obrigatórios para liberar usuários: confirmar conta e recuperar senha independem da flag de notificações. Fontes de verdade: [recuperação de senha](password-recovery.md) e [confirmação de email](email-verification.md). Validar domínio, SPF/DKIM/DMARC conforme configuração do remetente, limites diários/mensais, bounces, supressões e alerta de falha; resposta da API não prova entrega na caixa postal.

R2: CORS de PUT limitado às origens aprovadas, chave por bucket e acesso mínimo. Hoje o signer devolve URL pública para foto de avaliação: URL conhecida não prova autorização. Política de acesso, consentimento, retenção e exclusão de fotos é decisão humana bloqueante. Fotos privadas exigem solução separada de autorização de leitura e teste de isolamento antes de publicação; não liberar por simples obscuridade do endereço. CORS não protege leitura pública.

Fastify já tem logger; definir retenção e redação de tokens, cookies, links e PII antes da operação. Responsável e canal de plantão devem receber alertas de 5xx/latência, saturação/conexões DB, entrega de email, cron duplicado/falho, backup vencido, CPU/RAM, disco/logs e custo. `/health` mede liveness; readiness do DB precisa evidência adicional. Vercel Analytics não comprova cobertura de incidentes. Não há contratação de observabilidade autorizada nem SLA próprio estabelecido.

## Mobile Android/iOS

`eas.json` contém development (Development Build interno), preview (distribuição interna) e production, com channels correspondentes. Definir URL da API por ambiente antes do build. Channels sozinhos não comprovam EAS Update configurado; OTA requer configuração, runtime compatível e política de rollback próprias. Mudança nativa exige novo binário compatível, não promessa de correção via OTA.

Scheme atual `muvit` atende retornos de autenticação. Android usa `com.anonymous.muvit` e iOS não declara bundleIdentifier: aprovar identificadores definitivos antes de contas, signing e submissão. Designar titular e substituto para keystore, certificados, perfis, recuperação e revogação; guardar credenciais em cofre. iOS exige serviço de build ou macOS; este Windows não comprova validação iOS.

Separar build, submissão e aprovação das lojas. Em rodada autorizada, usar internal track Android/TestFlight, testar instalação, deep links, sessão e fluxo principal contra a API correta; depois revisar metadados, política de privacidade, declaração de dados e atendimento. Ordem Android/iOS é decisão humana. Push só entra como compromisso após cliente, tokens e credenciais APNs/FCM comprovados; adaptador existente não basta.

## Custos e fórmulas

Referências não vinculantes em USD, sem impostos/conversão. Dados Hostinger consultados pelo plano em 08/11/2026; preços das integrações abaixo preservam a pesquisa anterior de 08/11/2026, sem nova cotação neste delta. Revalidar billing, disponibilidade e limites antes de contratar. Franquia gratuita não garante conta final zero.

| Serviço | Piso, cotas e excedentes | Fonte oficial e data |
| --- | --- | --- |
| Hostinger KVM 2 | Oferta USD 210,96 adiantados por 24 meses, equivalente USD 8,79/mês; renovação exibida USD 14,99/mês pelo mesmo prazo. Mensalização não é cobrança mensal garantida | [Hostinger VPS](https://www.hostinger.com/vps-hosting?lang=en), 08/11/2026 |
| R2 Standard | Franquia mensal 10 GB-mês, 1 milhão A, 10 milhões B; acima: USD 0,015/GB-mês, USD 4,50/milhão A, USD 0,36/milhão B; egress grátis | [R2](https://developers.cloudflare.com/r2/pricing/), 08/11/2026 |
| Resend | Free: 3.000 emails/mês, 100/dia; Pro: USD 20/mês para 50.000, excedente USD 0,90/1.000 | [Resend](https://resend.com/pricing), 08/11/2026 |
| EAS | Free USD 0: 15 builds Android e 15 iOS/mês, fila baixa; Starter USD 19/mês com USD 45 de crédito de build e 3 mil MAU; Production USD 199/mês com USD 225 de crédito e 50 mil MAU; consumo adicional separado | [Expo](https://expo.dev/pricing), 08/11/2026 |
| Apple Developer Program | USD 99/ano, preço local pode variar | [Apple](https://developer.apple.com/help/account/membership/program-enrollment), 08/11/2026 |
| Google Play Console | USD 25 uma vez; verificação e requisitos adicionais conforme conta | [Google](https://support.google.com/googleplay/android-developer/answer/6112435), 08/11/2026 |
| Domínio, backup externo, tributos e operação humana | Sem cotação: domínio/titular, volume/retenção externa e serviço ainda dependem de decisão; não representar como zero | Confirmar com registrador/provedor escolhido antes da contratação |

Fórmulas de referência, usando os preços da tabela (08/11/2026):

- R2 Standard mensal em USD = `max(0, ceil(GB-mês) - 10) × 0,015 + ceil(max(0, A - 1.000.000)/1.000.000) × 4,50 + ceil(max(0, B - 10.000.000)/1.000.000) × 0,36`. `ceil` arredonda para cima ao inteiro: GB-mês antes da franquia e blocos de um milhão de operações depois das franquias A/B. Franquia compartilhada da conta, não replicada por ambiente. Exemplo de fronteira: 10,1 GB-mês e 1.000.001 operações A, com B dentro da franquia, resultam em um GB-mês e um bloco A cobrados, total USD 4,515 antes do arredondamento monetário da fatura ([regra oficial R2](https://developers.cloudflare.com/r2/pricing/), verificada pelo coordenador em 08/11/2026).
- Resend Pro mensal em USD = `20 + ceil(max(0, emails - 50.000)/1.000) × 0,90`: excedentes em blocos inteiros de 1.000 emails; por exemplo, 50.001 emails resultam em USD 20,90. A estimativa pressupõe Transactional Overages/pay-as-you-go habilitado em plano pago, controle que requer autorização futura. Sem overages habilitados, não assumir envio contínuo além do limite; respeitar o comportamento de quota do plano. Free mantém 3.000 emails/mês e 100/dia ([preços Resend](https://resend.com/pricing), [pay-as-you-go](https://resend.com/changelog/pay-as-you-go-pricing), verificados pelo coordenador em 08/11/2026).
- EAS Starter mensal = `USD 19 + max(USD 0, custo elegível mensal de builds em USD - USD 45 de crédito mensal) + outros excedentes mensais em USD`; EAS Production mensal = `USD 199 + max(USD 0, custo elegível mensal de builds em USD - USD 225 de crédito mensal) + outros excedentes mensais em USD`. MAU e outros serviços têm limites próprios, não crédito em dinheiro reutilizável. Essas fórmulas são dos planos pagos; no Free, preservar as cotas da tabela e não presumir cobrança para continuar após atingir um limite: respeitar bloqueios e condições do plano ([Expo](https://expo.dev/pricing), 08/11/2026).

Desembolso inicial conhecido para uma VPS Web/API/DB: USD 210,96 antecipados por 24 meses; mensalização aritmética `210,96 / 24 = 8,79`. Renovação exibida de USD 14,99/mês pelo mesmo prazo equivale aritmeticamente a `14,99 × 24 = USD 359,76` por 24 meses; esse cálculo não é nova cotação ou garantia de pagamento mensal ([Hostinger](https://www.hostinger.com/vps-hosting?lang=en), consulta do plano 08/11/2026). Revalidar checkout, moeda, tributos, prazo e condições antes de pagar; reservar caixa para renovação e contingência.

Orçamento parcial do período inicial = `USD 210,96 da VPS + integrações no período + domínio + backup/export externo + adicional diário se autorizado + operação + eventuais hosts conforme topologia de ambientes + tributos e extras`. Não há plano de banco externo selecionado nem preço adicional de DB a inventar; o banco local consome os recursos compartilhados. Não multiplicar automaticamente por dois hosts: topologia física de staging/produção e número de hosts não foram decididos. Adicional diário Hostinger, export externo, domínio/renovação, operação e hosts ainda indefinidos exigem cotação; pendência não é custo zero. O valor conhecido não é teto de operação nem assinatura cobrada mês a mês.

Exemplo preservado somente de storage, não medição: R2 Standard com 100 GB-mês, franquia disponível e operações dentro dela resulta em `(100 - 10) × 0,015 = USD 1,35/mês`, sujeito às condições de conta ([R2](https://developers.cloudflare.com/r2/pricing/), pesquisa anterior de 08/11/2026). Lojas novas somam USD 124 no primeiro ano, Apple recorrente e Google único ([Apple](https://developer.apple.com/help/account/membership/program-enrollment), [Google](https://support.google.com/googleplay/android-developer/answer/6112435), pesquisa anterior de 08/11/2026). Não misturar despesas mensais, anuais, pontuais e pagamento antecipado da VPS sem definir período e fluxo de caixa.

## Decisões humanas e owners

| Decisão bloqueante para publicação/contratação | Papel que deve assumir a decisão e evidência futura |
| --- | --- |
| Contratação KVM 2, prazo/pagamento antecipado, renovação, orçamento completo, teto e contingência | Proprietário financeiro; arquitetura Web/API/DB já decidida, compra ainda não autorizada; registrar billing, alertas e substituto |
| Topologia física de staging/produção | Produto e operação; decidir separação e número de hosts sem perder isolamento lógico ou presumir coabitação |
| Domínio, titularidade de contas, DNS/TLS, MFA e emergência | Proprietário do produto e administrador designado; contatos e recuperação em cofre |
| Disponibilidade Brasil no setup, residência dos dados e política de fotos | Responsável pelo produto/dados; Brasil é a preferência já decidida; indisponibilidade exige parar e obter nova decisão antes de setup |
| Cifragem em repouso e proteção de dados/secrets | Responsável por segurança/dados e administrador; avaliar ausência de cifragem anunciada para disco/backups/snapshots e aprovar controles antes de dados sensíveis |
| SO/patches, acesso por chaves, firewall, TLS e serviços supervisionados | Administrador e substituto; operação de host compartilhado, monitoramento de recursos e recuperação ensaiados |
| RPO/RTO, retenção, export externo e restauração | Owner de banco/mídia e substituto; aprovação e ensaio medido conforme runbook |
| Timezone, cron, rollback, plantão e monitoramento | Engenharia/operação; coordenação técnica validada, alertas e canal atendidos |
| Android/iOS, signing, contas e ordem de lançamento | Titular das lojas e responsável mobile; identificadores e credenciais recuperáveis |

A escolha Web/API/PostgreSQL na KVM 2 e a preferência Brasil são decisões do usuário; nenhum nome pessoal, aprovação de contratação ou topologia de ambientes foi presumido. Cookies entre API/Next, privacidade de mídia, coordenação de cron e launcher de migrations precisam solução técnica em escopo separado; responsáveis nominais devem ser designados antes de publicar.

## Limites de evidência

Este card documenta e inspeciona fontes versionadas; não provisiona, contrata, altera DNS/TLS/secrets, executa migration/restore ou publica. DNS/TLS real, entrega de email, latência no Brasil, backups ativos, tempo de recuperação, prontidão runtime, builds/lojas e push permanecem NÃO COMPROVADOS. Seguir [artefatos de QA](qa-artifacts.md) para registrar evidências futuras; aprovação humana e validação real são gates do lançamento, não afirmações desta proposta.
