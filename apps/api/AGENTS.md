# AGENTS.md

## Escopo

Estas regras valem para todo o workspace `apps/api`. Elas complementam as regras globais do monorepo e vencem quando forem mais especificas para a API.

Leia tambem subarquivos `AGENTS.md` dentro do modulo afetado. Para autenticacao, as regras especificas ficam em `src/modules/auth/AGENTS.md`.

## Piso arquitetural obrigatorio

- A API deve manter aderencia minima estimada de 85% aos principios SOLID.
- Qualquer mudanca em rotas, casos de uso, repositorios, jobs, plugins ou bibliotecas de infraestrutura deve preservar ou elevar esse piso.
- Se uma mudanca necessaria reduzir temporariamente esse piso, registre o risco e a correcao planejada em `docs/` antes de finalizar a tarefa.

## Criterios SOLID locais

- Rotas Fastify devem permanecer finas: validam contrato HTTP, chamam caso de uso e traduzem resposta/erro.
- Regra de negocio deve ficar em caso de uso, politica de dominio ou servico de aplicacao, nunca diretamente na rota.
- Casos de uso nao devem depender de outros casos de uso concretos; quando precisarem reutilizar uma regra, dependa de uma porta/interface pequena.
- Dependencias externas como banco, storage, e-mail, push, tokens e hashing devem entrar por interfaces, funcoes injetadas ou factories do modulo.
- Implementacoes Drizzle devem ficar em `src/modules/**/repositories/drizzle-*.ts`; codigo de producao fora dessa camada nao deve importar `db` diretamente.
- Interfaces devem ser orientadas ao consumidor: exponha apenas os metodos que aquele caso de uso precisa.
- Evite interfaces amplas que representem CRUD inteiro quando o consumidor usa apenas uma ou duas operacoes.
- Novas operacoes de repositorio devem preservar LSP: implementacoes fake, em memoria ou Drizzle devem conseguir cumprir o mesmo contrato sem comportamento especial escondido.
- Tipos de entrada e saida devem vir de contratos compartilhados quando existirem, especialmente schemas de `@muvit/validators` e tipos publicos de `@muvit/db`.
- Tratamento de erros de dominio deve usar erros explicitos e traduziveis na borda HTTP; nao espalhe `throw new Error` para fluxo esperado de negocio.

## Contratos, ambiente e testes

- Valide entrada e saida nas bordas HTTP com schemas Zod e contratos compartilhados.
- Se alterar payload, rota ou contrato, atualize validators, tipos, mocks e consumidores correspondentes no mesmo ciclo.
- Nao acesse variaveis de ambiente diretamente fora de `src/env.ts` ou adaptadores de infraestrutura que consomem o objeto `env`.
- Testes de rota devem criar explicitamente os dados que validam; nao dependa de seed implicito ou ordem de execucao.
- Use `pnpm.cmd --dir apps/api test`, `pnpm.cmd --dir apps/api typecheck` e `pnpm.cmd exec biome check apps/api` conforme a mudanca exigir.

## Checklist antes de finalizar mudancas na API

- A rota alterada continua sem regra de negocio relevante?
- Cada caso de uso tem uma responsabilidade principal clara?
- Alguma dependencia concreta poderia ser uma porta pequena?
- Algum caso de uso depende de outro caso de uso concreto?
- Alguma interface obriga consumidores a conhecer metodos que nao usam?
- O acesso ao banco continua isolado em repositorios Drizzle?
- Os testes exercitam o comportamento pelo contrato publico do caso de uso ou rota?
- As verificacoes especificas da API foram executadas ou a impossibilidade foi explicada.
