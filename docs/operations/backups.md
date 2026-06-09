# Backups do PostgreSQL no Railway

Este runbook define o setup minimo de backup diario para o PostgreSQL de
producao do Muvit no Railway.

## Escopo

- Ambiente: producao.
- Servico: PostgreSQL do projeto Muvit no Railway.
- Frequencia obrigatoria: diaria.
- Retencao esperada no backup nativo diario do Railway: 6 dias.

## Setup do backup diario

1. Acesse o Railway com uma conta com permissao de administrador no projeto
   Muvit.
2. Abra o projeto Muvit.
3. Selecione o ambiente de producao.
4. No canvas do projeto, abra o servico PostgreSQL usado pela API de producao.
5. Confirme que o servico tem um volume persistente montado. O backup nativo do
   Railway cobre dados armazenados em volumes.
6. Abra `Settings`.
7. Abra a aba `Backups`.
8. Em `Backup schedules`, habilite a agenda `Daily`.
9. Salve a alteracao.
10. Ainda na aba `Backups`, crie um backup manual inicial.
11. Aguarde o backup manual aparecer na lista com data e horario.
12. Abra `Variables` no mesmo servico PostgreSQL e confirme que a API de
    producao usa o `DATABASE_URL` desse servico, nao uma instancia paralela.
13. Registre no controle operacional interno a data de ativacao do backup
    diario e o responsavel pela ativacao.

## Verificacao recorrente

Execute esta checagem toda segunda-feira antes das 12:00.

1. Abra o projeto Muvit no Railway.
2. Selecione o ambiente de producao.
3. Abra o servico PostgreSQL.
4. Abra `Settings` > `Backups`.
5. Confirme que a agenda `Daily` continua habilitada.
6. Confirme que existe pelo menos um backup criado nas ultimas 24 horas.
7. Confirme que a lista de backups mostra datas consecutivas dentro da janela
   de retencao diaria.
8. Se nao houver backup recente, crie um backup manual imediatamente e trate o
   incidente como bloqueador de deploy de producao.

## Restauracao

Use restauracao somente em incidente real ou em ensaio combinado. A restauracao
troca o volume montado no servico e gera uma mudanca staged antes do deploy.

1. Abra o projeto Muvit no Railway.
2. Selecione o ambiente de producao.
3. Abra o servico PostgreSQL.
4. Abra `Settings` > `Backups`.
5. Localize o backup pela data e horario desejados.
6. Clique em `Restore` no backup escolhido.
7. Aguarde o Railway criar a mudanca staged com o volume restaurado.
8. Clique em `Details` no topo do project canvas e revise a mudanca staged.
9. Confirme que o novo volume esta montado no mesmo caminho do volume original.
10. Se a restauracao estiver correta, clique em `Deploy`.
11. Acompanhe o redeploy do servico PostgreSQL ate finalizar.
12. Rode uma checagem funcional da API de producao depois do deploy.

## Cuidados

- Wipe do volume remove tambem os backups do volume. Nao use wipe em producao
  como mecanismo de manutencao.
- Backups nativos do Railway so restauram no mesmo projeto e ambiente.
- Restaurar um backup remove backups mais novos que o ponto restaurado.
- Para retencao maior que a janela nativa diaria, adicione uma estrategia
  externa versionada antes do soft-launch publico.

## Referencias

- Railway Docs: `https://docs.railway.com/volumes/backups`
- Railway Docs PostgreSQL: `https://docs.railway.com/databases/postgresql`
