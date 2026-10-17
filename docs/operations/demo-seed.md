# Seed completo para testes manuais

Na raiz do repositório, aplique as migrations com `pnpm.cmd --filter @muvit/db migrate` e execute `pnpm.cmd db:seed`. O comando lê `apps/api/.env`, exige R2 acessível e recusa `NODE_ENV=production`. Desenvolvimento usa `muvit` em `localhost:5432`; testes de integração usam exclusivamente `muvit_api_test` em `localhost:5433`.

## Contas

| Papel | Email | Senha inicial |
| --- | --- | --- |
| Professor | `trainer@muvit.dev` | `12345678` |
| Aluno independente | `aluno.independente@muvit.dev` | `12345678` |

As duas identidades são criadas pelo Better Auth e reaproveitadas nos próximos seeds, sem reset de senha. Os dez alunos gerenciados (`aluno01@muvit.dev` a `aluno10@muvit.dev`) são perfis de domínio sem login, conforme o contrato atual. Professor e aluno independente continuam em seus shells e escopos próprios.

## Conteúdo disponível

- Professor no plano Pro, com onboarding preenchido e avatar de demonstração.
- Onze alunos com nome, email, telefone, nascimento, gênero, objetivo, restrições e avatar; seis gerenciados ativos, dois pausados e dois inativos.
- Vinte e quatro exercícios globais e quatro privados do professor, com equipamento, grupo muscular e instruções. O aluno independente usa somente exercícios globais.
- Vinte e oito avaliações com peso, altura, percentual de gordura, nove medidas, observações e três imagens individuais em cada avaliação: frente, perfil e costas. Quatro avaliações pertencem ao independente e alimentam seu histórico de progresso.
- Onze planos, com estados ativo/arquivado/rascunho, períodos, observações, 32 dias e 159 prescrições preenchidas com séries, repetições, carga, descanso, cadência e orientação.
- Cinquenta e dois registros de treino, com duração, esforço percebido, observações e 897 séries. Há treinos completos e interrompidos; quatorze registros são do independente, em datas distintas. Registros concluídos preenchem todas as séries da prescrição. Não há histórico de execução vinculado ao plano em rascunho.
- Datas relativas ao dia da execução; os treinos do histórico permanecem dentro do período dos planos e anteriores ao dia atual, permitindo iniciar um treino novo no app.

Tokens push permanecem nulos porque dependem de dispositivos reais. Vídeos de exercícios não são inventados: o projeto tem capas ilustrativas, mas não possui os vídeos correspondentes. O formulário e o fluxo de demonstração continuam permitindo testar os estados sem mídia. Esses campos não são obrigatórios para os cenários de imagens e avaliação.

## Imagens no R2

`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` e `R2_PUBLIC_URL` devem apontar para o mesmo bucket configurado para o ambiente de desenvolvimento. A URL pública precisa estar habilitada no painel Cloudflare R2, por Public Development URL ou domínio personalizado; permissão S3 de upload não habilita publicação automaticamente.

O seed usa quatro assets locais:

- `assets/design/assessment-photo-samples/assessment-front.png`, `assessment-side.png` e `assessment-back.png`: três fotografias sintéticas individuais da mesma pessoa adulta fictícia, geradas a partir da referência do design; origem e instruções no README desse diretório. A ordem das três URLs no campo `photos` é frente, perfil e costas. A referência com três poses em uma única imagem permanece no repositório somente para o Pen. As mesmas amostras são reutilizadas nas avaliações, sem sugerir fotos reais ou evolução visual individual.
- `apps/mobile/assets/icon.png`: identidade visual do Muvit usada como avatar ilustrativo das contas demo. As telas que exibem iniciais continuam seguindo o comportamento atual.

O seed usa o mesmo construtor de chaves dos uploads da aplicação: `avatar/<id-do-perfil>/<arquivo>.png` e `assessment-photo/<id-do-perfil>/<arquivo>.png`. Os diretórios pertencem aos perfis de domínio, e não ao ID do Better Auth. O professor possui as imagens usadas nas avaliações dos seus alunos gerenciados; o aluno independente possui seus próprios objetos. Homologação e produção são separadas por bucket e configuração de ambiente.

O nome do arquivo do seed é derivado do SHA-256 do conteúdo, mantendo as URLs estáveis nas reexecuções para o mesmo perfil. Os metadados R2 `source=muvit-seed`, `seed-version=2`, `profile-id`, `sha256` e `asset` identificam a origem dos oito objetos: dois avatares e seis fotografias individuais, divididos entre professor e aluno independente. Uploads normais continuam usando nomes aleatórios. Não são removidos nem sobrescritos arquivos enviados por usuários.

Após resolver ou criar as duas identidades Better Auth e seus perfis, o seed envia as imagens, executa GET público, confere o tipo de imagem e compara o SHA-256 dos bytes recebidos com o arquivo local. Só então substitui os dados de domínio no banco. Uma falha nas imagens preserva os dados de domínio existentes; identidades provisionadas e objetos já enviados permanecem disponíveis para a próxima tentativa.

Um HTTP 404 nessa etapa exige conferir o bucket associado à URL pública, a habilitação de acesso e o valor de `R2_PUBLIC_URL`. Não basta confirmar o arquivo pelo cliente S3 e não se deve substituir a URL por um link privado expirável.

## Reexecução e preservação

O seed substitui os dados dos dez emails demo vinculados ao professor demo e as avaliações/planos/histórico do aluno independente demo. A operação de domínio é transacional: uma falha de persistência reverte essa substituição. Alunos cadastrados manualmente com outros emails, outras contas e uploads de usuários são preservados.

As identidades autenticáveis e seus IDs são mantidos, mas os IDs dos registros de domínio recriados podem mudar. Rascunhos locais no dispositivo podem referenciar IDs antigos; antes de recomeçar uma sessão de QA após o seed, saia e entre novamente e descarte explicitamente os rascunhos de teste antigos quando necessário. Não limpe dados de outros usuários.
