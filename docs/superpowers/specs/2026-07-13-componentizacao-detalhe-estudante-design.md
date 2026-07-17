# Componentizacao da tela de detalhe do estudante

## Contexto

A rota `students/[id]` concentra a orquestracao de dados, o cabecalho e a implementacao completa dos tres cards da visao geral. O comportamento e o layout ja estao cobertos pelos testes da pagina e devem permanecer inalterados.

## Decisao

Extrair os cards para tres componentes locais da rota:

- `_personal-info-card.tsx`: informacoes de contato, tipo, genero, objetivos e restricoes fisicas.
- `_active-workout-card.tsx`: estados de erro, vazio e treino ativo, incluindo os dias de treino e as acoes.
- `_latest-assessment-card.tsx`: estados de erro, vazio e avaliacao disponivel, incluindo metricas, medidas, grafico e acoes.

A pagina continua como Server Component e permanece responsavel por configurar o cliente, buscar os tres recursos em paralelo, selecionar o treino e a avaliacao atuais e montar os pontos do grafico. Os componentes recebem somente dados ja carregados e indicadores de falha por props; nenhum deles acessa a API ou cria estado local.

## Alternativas consideradas

Um unico `_student-overview.tsx` reduziria o tamanho de `page.tsx`, mas manteria os tres contextos visuais acoplados em outro arquivo. Criar primitives genericos para linhas, metricas e estados vazios aumentaria a superficie compartilhada sem existir reutilizacao fora desta rota. A separacao por card preserva o padrao local e mantem responsabilidades claras.

## Tipos e helpers

Cada componente declara a interface minima de suas props. Helpers usados por apenas um card acompanham esse componente. Helpers usados pela pagina para preparar dados, como a montagem da serie de peso, permanecem na pagina para preservar o contrato atual e seu teste direto.

## Testes

Adicionar testes focados nos tres componentes antes da extracao, cobrindo o estado principal de cada card e os links relevantes. Os testes existentes da pagina continuam como regressao de integracao para garantir que a composicao, as chamadas da API e o layout percebido pelo usuario nao mudaram.

## Criterios de aceite

- `page.tsx` deixa de conter o JSX e os helpers exclusivos dos tres cards.
- Os cards continuam renderizando os mesmos estados, textos, links e estilos.
- O acesso a dados permanece exclusivamente na pagina.
- Os testes web, o typecheck e o Biome passam sem incluir alteracoes locais fora do escopo.
