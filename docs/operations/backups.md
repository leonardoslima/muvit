# Backups e recuperação conjunta

Runbook proposto para PostgreSQL e mídia do Muvit, subordinado às decisões de [implantação pública](public-deployment.md). Não comprova recursos ativos. PostgreSQL ficará junto de Web/API na mesma VPS Hostinger KVM 2; R2 é externo. Região Brasil somente se disponível na conta durante setup; se indisponível, parar e pedir nova decisão. Topologia física de staging/produção permanece pendente, sem presumir ambos na VPS inicial; este card não executa setup nem restore.

## Objetivos e responsáveis

Propor RPO <=24h e RTO <=4h para aprovação humana e ensaio; agenda diária não garante esses objetivos. Owner de banco e owner de mídia, com substitutos e acesso de emergência, precisam ser designados pelo proprietário. A retenção externa proposta é 30 dias, com orçamento e política de exclusão a aprovar. Cada ambiente tem credenciais, backups e destinos separados; staging usa dados sintéticos.

## Imagem e snapshot da VPS

Segundo o [backup oficial Hostinger](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/), consultado pelo plano em 08/11/2026, o padrão é semanal e a opção diária é paga, sem preço confirmado neste documento. São retidos dois backups de cada frequência; o único snapshot manual é temporário e expira em um dia. Não inferir RPO/RTO dessas retenções. Snapshot não atende à retenção externa proposta de 30 dias.

Discos, backups e snapshots não têm cifragem em repouso; o transporte de backups é cifrado, conforme a mesma fonte. Aprovar política e controles para dados sensíveis antes de publicar; export cifrado não cifra automaticamente disco ou imagem. A imagem não é export seletivo/portátil de PostgreSQL e não prova consistência transacional do banco nem consistência com R2. Restore sobrescreve conteúdo da VPS e pode indisponibilizar juntos Web, API e banco.

Em rodada autorizada, registrar política de imagem escolhida, contratação do adicional diário somente se aprovada, último sucesso, retenção e owner. Verificar diariamente falhas e atraso dos pontos recuperáveis segundo a política DB aprovada. Backup semanal padrão não satisfaz por si só RPO de 24h; frequência do export lógico deve ser definida e ensaiada para esse objetivo. Ausência de ponto DB recuperável conforme a política bloqueia deploy; tentativa não comprova sucesso.

## Export externo e mídia

Antes do lançamento, implementar em escopo separado export lógico cifrado do PostgreSQL em destino independente, com retenção proposta de 30 dias, menor privilégio e chaves recuperáveis fora do domínio de falha do host. O método de export/restore lógico do PostgreSQL local ainda precisa ser implementado e ensaiado, com agenda e alerta de atraso aprovados. Registrar versão PostgreSQL/ferramentas, schema/migrations, SHA da aplicação, horário consistente, checksum e resultado. Não criar job neste card. Export validado permite recuperação fora do projeto sem presumir portabilidade do backup nativo.

Backup DB não cobre R2: inventariar chaves de objetos referenciadas pelo banco, tamanho, checksum quando disponível e instante do inventário. Definir cópia/versionamento recuperável, retenção e exclusão da mídia com owner e orçamento próprios. Alinhar ponto recuperável DB/objetos com janela sem escrita ou outro mecanismo consistente ensaiado; documentar objetos posteriores, faltantes e órfãos sem excluir automaticamente. Restaurar somente DB pode deixar fotos ausentes ou referências incorretas.

## Restauração autorizada

1. Declarar incidente ou ensaio, obter autorização do responsável e definir ponto de recuperação e perda aceitável. Pausar escritas, uploads e jobs; preservar cópia do estado atual e evidências sem segredos.
2. Conferir projeto/ambiente, backup, compatibilidade PostgreSQL/schema/aplicação e inventário de mídia correspondente. Preferir ensaio isolado, sem envio de email/push real e sem apontar clientes públicos.
3. Se a recuperação exigir imagem/snapshot, revisar ponto, conteúdo que será sobrescrito e indisponibilidade conjunta de Web/API/DB; obter autorização antes de reconstruir/restaurar o host. Preservar estado atual externamente. Não presumir que processos separados isolem impacto de restore.
4. Após recuperar a VPS, conferir compatibilidade entre SHA de Web/API e schema PostgreSQL restaurados, secrets, acesso administrativo, firewall, TLS e supervisão. Não reabrir tráfego só porque o host iniciou.
5. Para recuperação lógica, usar export PostgreSQL cifrado validado em alvo isolado compatível e recuperar a mídia R2 correspondente em destino controlado. A imagem pode ajudar a reconstruir o host, mas não substitui esse ensaio lógico e consistente. Este documento não fornece comando executado nem autoriza tocar produção.
6. Validar contagens, integridade referencial, migrations, autenticação Better Auth e amostra de objetos/fotos; verificar isolamento de acesso e correspondência DB/mídia. Registrar perdas e divergências; não reabrir escrita enquanto houver inconsistência crítica.
7. Medir tempo real desde declaração até serviço recuperado e perda desde último ponto consistente; comparar com RPO/RTO propostos. Aprovação operacional libera tráfego e jobs gradualmente, com observação e novo backup após estabilização.

## Ensaio e evidências

Ensaiar antes do lançamento e após mudanças relevantes de schema/backup, sempre com autorização em ambiente isolado. Anotar datas, executor/substituto, IDs de backup, SHA, contagens, amostras verificadas, duração, falhas e decisão de reabertura conforme [artefatos de QA](qa-artifacts.md). Redigir resultados sem tokens, cookies, URLs assinadas ou dados pessoais. Nunca usar o sucesso de um restore DB como prova de recuperação de mídia.

## Referências

- [Arquitetura, custos e decisões](public-deployment.md).
- [Checklist de lançamento](launch-checklist.md).
- [Hostinger Backup/Restore VPS](https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/), consulta do plano 08/11/2026.
