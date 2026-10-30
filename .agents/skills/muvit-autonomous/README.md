# muvit-autonomous — v9.0

Skill local do Muvit em `.agents/skills/muvit-autonomous/`. Invoque `$muvit-autonomous` para pedir uma rodada completa ou a retomada de uma rodada identificada. Consultar ou editar seus arquivos não inicia execução de card.

## Dependências e limites

- Batuta disponível para decisões de delegação, backend e recursos; configuração e limites aprovados continuam externos a esta skill.
- Superpowers pertinentes disponíveis para planejamento, execução e verificação.
- Ferramentas e acessos reais ao GitHub, Linear e ao ambiente de QA necessário ao card. Python/runner são necessários somente quando o backend CLI escolhido os exigir; agentes nativos usam o host.
- Um card por rodada, PR para revisão humana e nenhum merge automático. Pedido de rodada completa autoriza as operações desse card; manutenção isolada não autoriza publicação.

## Verificação local

Da raiz do repositório: `python -B -X utf8 -m unittest discover -s .agents/skills/muvit-autonomous/tests`.

Os testes estáticos verificam estrutura, referências e contratos básicos, sem provar operação em GitHub/Linear. Para avaliação comportamental somente leitura, use `tests/behavioral-scenarios.md` em sessão isolada e guarde resultados em `artifacts/skill-muvit-autonomous/<execucao>/`.

## Critérios de manutenção

Aplicação da aula local “Skills como manual de operação” (Módulo 03, aula 04 do curso Harness Engineering): descrição com gatilhos específicos; entrada curta com referências por etapa; ferramentas verificadas separadamente do procedimento; regras locais no AGENTS.md responsável. A aula 05 reforça conferir capacidade, procedimento e informação separadamente. Não copiar o curso nem seus exemplos para o contexto de execução.

Veja `MIGRATION-NOTE.md` para proveniência e limitações históricas da v8.
