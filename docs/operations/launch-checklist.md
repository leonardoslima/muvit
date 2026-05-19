# Checklist de soft-launch

Use esta checklist antes de liberar o Muvit para usuarios reais em producao.
Cada item deve ser validado no ambiente de producao correspondente.

## Infraestrutura e dominio

- [ ] DNS do dominio publico aponta para o projeto correto na Vercel.
- [ ] DNS do dominio da API aponta para o servico correto no Railway.
- [ ] Propagacao DNS validada com consulta externa para os dominios de web e
  API.
- [ ] SSL do dominio web esta ativo e valido na Vercel.
- [ ] SSL do dominio da API esta ativo e valido no Railway.
- [ ] Redirects entre dominio raiz, `www` e dominio principal estao coerentes
  com a URL publica escolhida.

## Variaveis de ambiente

- [ ] Variaveis de producao da API copiadas para o Railway.
- [ ] Variaveis de producao do web copiadas para a Vercel.
- [ ] Variaveis de producao do mobile configuradas no EAS.
- [ ] `DATABASE_URL` de producao aponta para o PostgreSQL correto no Railway.
- [ ] `WEB_URL` de producao aponta para o dominio publico do app web.
- [ ] Segredos JWT, Sentry, Resend e storage estao presentes apenas nos
  ambientes que precisam deles.
- [ ] Nenhuma variavel de desenvolvimento foi copiada para producao.

## Banco e backups

- [ ] Backup diario do PostgreSQL no Railway esta habilitado.
- [ ] Existe um backup manual inicial criado antes do soft-launch.
- [ ] Ultimo backup aparece com data dentro das ultimas 24 horas.
- [ ] Procedimento de restauracao em `docs/operations/backups.md` foi revisado
  por quem fara o plantao do lancamento.

## Web e API

- [ ] Deploy de producao da Vercel aponta para o commit esperado.
- [ ] Deploy de producao da API no Railway aponta para o commit esperado.
- [ ] Healthcheck da API responde com sucesso pelo dominio de producao.
- [ ] Login, cadastro, criacao de aluno e criacao de treino foram testados no
  ambiente de producao.
- [ ] CORS da API aceita o dominio web de producao e rejeita origem externa nao
  autorizada.

## Mobile

- [ ] EAS production build gerado para iOS.
- [ ] EAS production build gerado para Android.
- [ ] Build de producao abre apontando para a API de producao.
- [ ] Login e fluxo principal do aluno foram testados no build de producao.
- [ ] Metadados da App Store estao preenchidos: nome, subtitulo, descricao,
  categoria, screenshots, politica de privacidade e contato de suporte.
- [ ] Metadados do Google Play estao preenchidos: nome, descricao curta,
  descricao completa, categoria, screenshots, politica de privacidade e contato
  de suporte.
- [ ] Play Console internal track criado.
- [ ] Build Android enviado para a internal track do Play Console.
- [ ] Lista inicial de testadores internos configurada no Play Console.

## Observabilidade e comunicacao

- [ ] Projeto Sentry recebe eventos da API em producao.
- [ ] Projeto Sentry recebe eventos do web em producao.
- [ ] Projeto Sentry recebe eventos do mobile em producao.
- [ ] Alertas Sentry configurados para erro novo, aumento de erro e regressao.
- [ ] Responsavel pelo primeiro atendimento de alerta definido para a semana de
  soft-launch.
- [ ] Dominio Resend verificado.
- [ ] Registros SPF, DKIM e DMARC do dominio de envio validados.
- [ ] Envio de email transacional testado em producao.

## Liberacao

- [ ] Janela de soft-launch definida.
- [ ] Lista de usuarios iniciais revisada.
- [ ] Canal de suporte para usuarios iniciais definido.
- [ ] Plano de rollback acordado entre produto e engenharia.
- [ ] Go/no-go registrado antes de convidar usuarios reais.
