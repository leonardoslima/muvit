# Foundation mobile v2 — MUV-24

A fonte visual desta entrega é `assets/design/mobile.pen`, editada pelo MCP pen.dev. A direção A e o modo imersivo contextual foram aprovados no MUV-23. Esta biblioteca é um artefato de design; não altera a foundation executável do Expo nem o `DESIGN.md` da implementação anterior.

## Onde encontrar

| Quadro | Node ID | Conteúdo |
| --- | --- | --- |
| Foundation | `ZXCPO` | Cor, DM Sans, escalas, radius e elevação |
| Componentes extraídos | `i9KQa` | 23 símbolos extraídos das telas aprovadas e 2 extensões da MUV-25 |
| Ações e estados | `ApsEA` | Primário, secundário, destrutivo, texto e imersivo; default, pressed, focus, disabled e loading |
| Campos e seleção | `Az8Bq` | Labels, conteúdo, foco, erro, senha, busca, carga e tabs internas |
| Feedback e estados | `Ps0kl` | Mensagens, badges, loading, vazio, erro, sucesso, sheet de saída e skeleton |
| Composição e reutilização | `OPBw0` | Grid, safe areas, texto, camadas, overrides e limites do MVP |
| Adaptação e interação | `c7VTG` | Exemplos de 320/430 dp, ações de ícone, campo imersivo e card interativo |
| Reconstrução — Hoje | `vIyJ8` | 6 instâncias; original `zKplD` |
| Reconstrução — Sessão | `Km8H9` | 7 instâncias; original `dGb8z` |
| Reconstrução — Professor | `tvMyi` | 6 instâncias; original `iZmb8` |
| Reconstrução — Aluno | `DAuvk` | 7 instâncias; original `JNHQT` |

Os quadros da biblioteca começam em y=9500; as reconstruções ficam em y=14400. O histórico MUV-22, a decisão visual e os originais MUV-23 foram preservados.

## Contratos de reutilização

Os símbolos `Q4dha` (`List/Exercício/Detalhado`) e `RL1fy` (`Media/Exercício/Demonstração`) pertencem ao quadro `i9KQa`, junto aos demais componentes da foundation. Foram acrescentados na MUV-25 para apresentar prescrição, descanso e acesso ao vídeo na lista, e a demonstração na tela própria de exercício. As telas usam instâncias conectadas. A mídia tem estados de carregamento, erro com retry, offline e ausência de URL; sua indisponibilidade preserva a prescrição. Reprodução não modifica o progresso do treino.

- Usar instâncias conectadas dos símbolos. Alterar conteúdo por overrides de Label, Value, Title, Description e Icon; preservar tokens e vínculos.
- Tokens usam `color/papel/variante`, `font/size/valor`, `font/weight/valor`, `space/valor`, `radius/valor`, `size/papel` e `layout/papel`. Componentes usam `Família/Variante/Estado`.
- A paleta base é papel `#F6F5EF`, verde profundo `#15372E`, lima `#C9F36C`, branco `#FFFFFF` e verde suave `#EBF0E8`. Texto secundário claro usa `#607064`. A sessão usa fundo `#0D1512`, superfície `#17231D`, camada `#203128`, texto `#F3F7EF` e apoio `#AEBCAF`.
- DM Sans é a família da direção v2. Os tamanhos ópticos originais estão nomeados para preservar as telas aprovadas; os estilos de uso estão exemplificados no quadro Foundation.
- Base de desenho: 390 dp, gutter de 16 dp, conteúdo de 358 dp e inset óptico de texto de 6 dp. Controles ocupam a largura útil; duas colunas descontam o gap antes de dividir a largura.
- Espaçamento: 8–12 dp para itens relacionados, 16 dp internos e 24–32 dp entre seções. Radius: 20 para dados/campos, 24 para sessão/sheet, 26 para destaque; cápsulas usam metade da altura.
- Ações principais têm referência de 58 dp; compactas, 52 dp; alvos de ícone, 48×48 dp. Ícones Lucide de 20–24 dp ficam dentro do alvo.
- Safe areas são dinâmicas no runtime. As referências de 62 dp no topo e 34 dp na base não substituem os insets reais. O shell reserva tab bar e inset uma única vez.
- Elevação define ordem de camada: base, sticky e overlay. Tonalidade, borda e scrim fornecem separação; não há sombra normativa.
- Campos mantêm labels e unidades; erros explicam a correção. Loading bloqueia reentrada sem mudar a largura. Estados críticos incluem texto/ícone.
- Na sessão, carga e repetições usam botões de diminuir/aumentar com alvos de 48×48 dp. O passo é 1 kg para carga e 1 para repetições; o valor central permanece tocável para digitação direta. O passo dos botões não redefine os valores aceitos pelos contratos atuais de API e validação.
- `o1D9WC`, `zVZ2l` e `crJbd` são molduras de demonstração dos estados Focus, Error e Disabled da carga, com conteúdo centralizado. Não são símbolos reutilizáveis nem componentes para implementar; o campo interno é uma instância de `nE3zB`, com overrides de estado. O fundo escuro externo apenas representa o contexto da sessão.
- Textos podem quebrar e componentes precisam crescer com conteúdo e escala de fonte. As extrações e réplicas conservam a geometria de referência do MUV-23; os exemplos de adaptação não substituem validação nativa futura.
- Aluno mantém Hoje/Progresso/Perfil; professor mantém Início/Alunos/Perfil. A sessão imersiva é contextual, sem tab bar e sem introduzir dark mode global.
- Offline, fila pendente, retomada, retry, saída segura e conclusão obedecem aos contratos existentes. A biblioteca não cria regras de negócio, rotas ou fluxos completos.

## StatePanel e mensagens: apresentação no aplicativo

`Bj8CE` (vazio), `akV6o` (erro), `Nj5Wj` (carregando) e `J63du` (sucesso) são componentes de estado da área de conteúdo. O fundo branco, os cantos e a altura de 335 dp apresentados no catálogo servem para separar as amostras; não são uma especificação de card para o aplicativo.

- **Sem dados disponíveis:** o `StatePanel` ocupa a área principal disponível e apresenta ícone, título, descrição e ação aplicável centralizados, sem superfície própria de card. Header e navegação permanecem visíveis conforme o shell da tela; não é um overlay que cobre toda a tela.
- **Com dados já carregados:** preservar o conteúdo. Uma falha de atualização usa `Message/Error` próximo ao conteúdo afetado, em vez de substituí-lo por um `StatePanel`. Offline e sincronização pendente também usam mensagens contextuais.
- **Erro de campo:** mostrar a mensagem abaixo do campo correspondente, preservando label e valor; não usar um estado global.

A área cresce e permite rolagem quando texto, escala de fonte ou teclado exigirem. As dimensões das amostras não devem virar uma altura fixa no runtime. O estado de sucesso aparece apenas no contexto em que o fluxo existente confirma a operação; não substitui todas as telas por uma confirmação genérica.

## Verificação desta entrega

Foram registrados 96 tokens, 81 símbolos reutilizáveis e 26 instâncias nas quatro reconstruções. As três molduras de demonstração da carga foram retiradas da lista de símbolos durante a revisão. As variantes são símbolos nomeados ou instâncias com overrides no pen.dev; esta entrega não é uma biblioteca nativa do Figma nem um protótipo navegável.

As capturas foram inspecionadas pelo MCP. A checagem de bounds dos sete quadros principais e das quatro reconstruções não reportou clipping. A comparação inicial dos 156 elementos de texto, ícone e retângulo das reconstruções com os originais confirmou conteúdo, posição relativa, cores, ícones e tipografia equivalentes, normalizando peso regular e ignorando nomes de camadas específicos de instâncias. Na revisão posterior, o header da sessão recebeu título centralizado e botão de fechar com borda interna; os campos de carga/repetições receberam controles de diminuir/aumentar. A reconstrução da sessão acompanha essas alterações por instâncias, enquanto o original MUV-23 preserva o histórico aprovado.

Os 11 pares principais de texto/fundo medidos têm contraste entre 4,81:1 e 14,96:1. Isso não constitui auditoria completa de todos os estados nem aprovação de acessibilidade no runtime. A busca por escapes Unicode nos textos novos via MCP não encontrou ocorrências.

Testes, lint, typecheck e build do Expo não se aplicam a esta entrega de design. Implementação, gestos, leitor de tela, teclado, escala de fonte e evidência Android/iOS pertencem aos cards de implementação e validação nativa.
