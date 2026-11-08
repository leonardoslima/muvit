# Backups e recuperação conjunta

Runbook proposto para PostgreSQL e mídia do Muvit, subordinado às decisões de [implantação pública](public-deployment.md). Não comprova recursos ativos. Aplicável à alternativa Railway escolhida após autorização operacional; este card não executa setup nem restore.

## Objetivos e responsáveis

Propor RPO <=24h e RTO <=4h para aprovação humana e ensaio; agenda diária não garante esses objetivos. Owner de banco e owner de mídia, com substitutos e acesso de emergência, precisam ser designados pelo proprietário. A retenção externa proposta é 30 dias, com orçamento e política de exclusão a aprovar. Cada ambiente tem credenciais, backups e destinos separados; staging usa dados sintéticos.

## Backup nativo diário

A [documentação Railway](https://docs.railway.com/volumes/backups), consultada em 08/11/2026, informa agenda diária a cada 24 horas, retenção de seis dias e restore em novo volume com mudança staged a revisar antes do deploy. Confirmar limitações vigentes na operação; backup nativo não é export portátil nem cópia de mídia R2.

Em rodada autorizada:

1. Confirmar projeto, ambiente, serviço PostgreSQL, volume persistente e vínculo da API ao banco correto sem divulgar credenciais.
2. Em Settings > Backups, habilitar Daily e criar backup manual inicial; esperar conclusão e registrar identificador, horário, owner e retenção.
3. Antes de deploy de produção, confirmar backup recuperável e criar ponto manual conforme janela aprovada.
4. Verificar diariamente último sucesso dentro de 24 horas, datas consecutivas e alertas de atraso; revisar a agenda toda segunda-feira antes das 12h no timezone operacional acordado.
5. Ausência de backup recente bloqueia deploy: investigar, criar backup manual autorizado e confirmar conclusão. Não considerar tentativa como sucesso.

## Export externo e mídia

Antes do lançamento, implementar em escopo separado export lógico cifrado do PostgreSQL em destino independente, com retenção proposta de 30 dias, menor privilégio e chaves recuperáveis em cofre. Registrar versão PostgreSQL/ferramentas, schema/migrations, SHA da aplicação, horário consistente, checksum e resultado. Não criar job neste card. Export validado permite recuperação fora do projeto sem presumir portabilidade do backup nativo.

Backup DB não cobre R2: inventariar chaves de objetos referenciadas pelo banco, tamanho, checksum quando disponível e instante do inventário. Definir cópia/versionamento recuperável, retenção e exclusão da mídia com owner e orçamento próprios. Alinhar ponto recuperável DB/objetos com janela sem escrita ou outro mecanismo consistente ensaiado; documentar objetos posteriores, faltantes e órfãos sem excluir automaticamente. Restaurar somente DB pode deixar fotos ausentes ou referências incorretas.

## Restauração autorizada

1. Declarar incidente ou ensaio, obter autorização do responsável e definir ponto de recuperação e perda aceitável. Pausar escritas, uploads e jobs; preservar cópia do estado atual e evidências sem segredos.
2. Conferir projeto/ambiente, backup, compatibilidade PostgreSQL/schema/aplicação e inventário de mídia correspondente. Preferir ensaio isolado, sem envio de email/push real e sem apontar clientes públicos.
3. Para restore nativo, em Settings > Backups selecionar ponto e Restore; Railway cria novo volume e mudança staged. Revisar Details, caminho montado, serviço afetado e impacto antes de autorizar Deploy.
4. Não presumir restauração nativa em outro projeto/ambiente; conferir restrições oficiais. Wipe do volume remove backups; não usar como manutenção. Restore pode eliminar backups posteriores ao ponto escolhido: preservar recuperabilidade externa antes de prosseguir.
5. Para recuperação externa, usar export lógico validado em banco isolado compatível e restaurar cópia da mídia para destino controlado. Este documento não fornece comando executado nem autoriza tocar produção.
6. Validar contagens, integridade referencial, migrations, autenticação Better Auth e amostra de objetos/fotos; verificar isolamento de acesso e correspondência DB/mídia. Registrar perdas e divergências; não reabrir escrita enquanto houver inconsistência crítica.
7. Medir tempo real desde declaração até serviço recuperado e perda desde último ponto consistente; comparar com RPO/RTO propostos. Aprovação operacional libera tráfego e jobs gradualmente, com observação e novo backup após estabilização.

## Ensaio e evidências

Ensaiar antes do lançamento e após mudanças relevantes de schema/backup, sempre com autorização em ambiente isolado. Anotar datas, executor/substituto, IDs de backup, SHA, contagens, amostras verificadas, duração, falhas e decisão de reabertura conforme [artefatos de QA](qa-artifacts.md). Redigir resultados sem tokens, cookies, URLs assinadas ou dados pessoais. Nunca usar o sucesso de um restore DB como prova de recuperação de mídia.

## Referências

- [Arquitetura, custos e decisões](public-deployment.md).
- [Checklist de lançamento](launch-checklist.md).
- [Railway Backups](https://docs.railway.com/volumes/backups), consulta 08/11/2026.
- [Railway PostgreSQL](https://docs.railway.com/databases/postgresql), referência operacional a conferir antes do procedimento.
