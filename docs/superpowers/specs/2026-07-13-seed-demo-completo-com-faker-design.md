# Seed de demonstração completo com Faker

## Contexto

O seed atual cria um professor e três alunos, mas concentra a avaliação, o plano de treino e o único registro de execução em uma única aluna. Isso deixa dashboard, listagens, gráficos e fluxos de treino com pouco conteúdo para testes manuais. O novo cenário deve continuar pequeno o suficiente para desenvolvimento local, manter somente um professor e permitir login de todos os alunos com uma senha simples.

## Decisão

Usar `@faker-js/faker` com locale `pt_BR` e uma seed numérica fixa para montar um cenário médio, variado e reproduzível. O professor permanece fixo como `trainer@muvit.dev`, enquanto dez alunos recebem nomes e dados de perfil gerados, e-mails previsíveis no domínio `@muvit.dev` e a senha compartilhada `12345678`.

A aleatoriedade será limitada aos campos de conteúdo e aos intervalos previamente definidos. Quantidades, distribuição de status e relacionamentos permanecem controlados para que os testes possam validar métricas exatas e para que todas as telas importantes sempre recebam dados.

## Estrutura

- `packages/db/src/seeds/demo.ts` concentra a configuração da Faker, os tipos locais e a construção determinística do cenário.
- `packages/db/src/seed.ts` permanece como orquestrador da limpeza e persistência no Drizzle.
- `packages/db/src/seeds/exercises.ts` continua como catálogo de exercícios globais; o novo seed reutiliza esse catálogo sem duplicar exercícios.
- `@faker-js/faker` entra nas dependências de `@muvit/db`, pois o script e o export público `@muvit/db/seed` executam a geração em runtime.

O gerador recebe uma data de referência e reinicializa a Faker com a mesma seed a cada construção. Assim, nomes, e-mails, quantidades e valores permanecem iguais para uma mesma versão bloqueada da dependência, enquanto datas ficam relativas ao dia de execução e continuam alimentando indicadores recentes.

## Cenário gerado

O seed cria exatamente um professor e dez alunos. A distribuição de alunos será seis ativos, dois pausados e dois inativos. Dois alunos terão cadastro na última semana e os demais terão datas anteriores, evitando que o dashboard classifique todos como novos.

Todos os alunos terão telefone, nascimento, gênero, objetivos e restrições coerentes, com variação entre campos preenchidos e ausentes. Os e-mails serão identificadores estáveis de `aluno01@muvit.dev` até `aluno10@muvit.dev`; todos usarão o mesmo hash correspondente a `12345678`. Ao final, o comando imprimirá o login do professor e a lista completa de logins dos alunos.

O histórico cobrirá os últimos 90 dias:

- 24 avaliações distribuídas entre os dez alunos, com peso, percentual de gordura, medidas e observações; os valores de cada aluno formam uma evolução plausível.
- Dez planos de treino, sendo seis ativos, três arquivados e um rascunho.
- Planos com dois a quatro dias e quatro a seis exercícios por dia, sempre referenciando o catálogo global existente.
- Exatamente 40 registros de treino, distribuídos entre alunos e datas, incluindo execuções concluídas e incompletas.
- Séries registradas somente para exercícios pertencentes ao dia executado, com repetições, cargas e conclusão coerentes com o registro pai.

As datas de `createdAt` das avaliações acompanham suas datas de domínio. Isso faz a métrica `assessments.last30d` representar dados realmente recentes em vez de contar todo o histórico apenas porque ele acabou de ser inserido.

## Identidade e compatibilidade

O contrato de login do professor e a senha demo atual permanecem inalterados. As credenciais dos alunos gerados ficam disponíveis pelo export do seed para que testes não dependam de nomes escritos manualmente nem da ordem interna de chamadas da Faker.

Antes de recriar o cenário, o seed remove todos os alunos vinculados ao professor demo existente e também limpa os três e-mails legados (`alice.aluna@muvit.dev`, `bruno.aluno@muvit.dev` e `carla.aluna@muvit.dev`). A exclusão em cascata remove avaliações, planos, dias, exercícios de plano, registros e séries relacionados. Dados de outros professores não são alterados.

Os exercícios globais existentes serão reutilizados e apenas nomes ausentes do catálogo serão inseridos. O seed não apagará exercícios referenciados por planos de outros professores.

## Tratamento de erros

Cada etapa que depende de registros retornados pelo banco valida a quantidade esperada e falha com uma mensagem que identifica a entidade ausente. O gerador também falha ao tentar usar um exercício inexistente ou ao produzir e-mails duplicados. Uma falha interrompe o comando e preserva o comportamento atual de saída com código diferente de zero.

## Testes e verificação

O teste de integração `apps/api/src/seed-demo.test.ts` será ampliado antes da implementação para validar:

- login do professor;
- dez alunos e a distribuição exata de status;
- login de todos os alunos com `12345678`;
- quantidade esperada de planos ativos e avaliações recentes no dashboard;
- presença de avaliações, planos e histórico de treino gerados;
- segunda execução do seed sem duplicação dos dados demo.

A verificação final executará o teste focado do seed, o typecheck de `@muvit/db`, o typecheck da API e o Biome nos arquivos alterados. A documentação do README será atualizada para informar os dez logins padronizados, removendo a credencial fixa da Alice.

## Alternativas consideradas

Manter todo o conteúdo escrito manualmente produziria personas mais controladas, mas aumentaria muito o arquivo e o custo de evolução. Gerar tudo sem limites deixaria métricas e testes instáveis. A solução híbrida usa Faker para variedade, mas fixa quantidades, estados, intervalos e relacionamentos importantes.

## Critérios de aceite

- `pnpm db:seed` cria um único professor e dez alunos fictícios com login funcional.
- O cenário preenche dashboard, detalhes de aluno, avaliações, planos e histórico de treino com dados variados dos últimos 90 dias.
- Repetir o comando não duplica dados nem altera registros de outros professores.
- O resultado é determinístico para a versão bloqueada da Faker e a data de referência usada.
- Testes focados, typechecks e Biome passam sem incluir as alterações locais preexistentes fora do escopo.
