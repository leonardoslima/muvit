# Cargas de treino inteiras — implementação

**Objetivo:** retirar cargas fracionárias do contrato de exercícios, registro de séries, editores e design. Decisão do usuário em 17/10/2026: remover decimal e permitir ajustar seed e banco existente.

**Regra:** cargas não negativas inteiras, limites existentes de 0 a 1000 kg e opcionalidade preservados. Valores antigos são arredondados ao inteiro mais próximo. A mudança cobre prescrição, rascunhos de plano, séries registradas, snapshots mobile e fila offline; não modifica medidas corporais ou avaliações. Entradas fracionárias novas recebem erro, sem remover separadores silenciosamente nem converter 12,5 em 125.

**Arquitetura:** contrato Zod compartilhado para entradas, respostas string/number/null mantidas; banco numeric(5,0) preserva tipo do driver e converte os valores existentes; migration de JSONB trata rascunhos. Clientes adaptam entrada/retomada/fila e preservam identidade, progresso e tombstones. O design passa a pedir teclado numérico e cargas inteiras.

## Tarefas

- [x] DB: schema, seed, migrations oficiais e operação de arredondamento dos drafts com revisão otimista preservada.
- [x] Validators/API: rejeitar carga fracionária nas entradas, manter limites e resposta compatível, testar prescrição/log/draft e rotas.
- [x] Clientes: sessão e editor mobile/web somente inteiros; migrar cargas legadas na restauração e fila sem descartar dados; testar.
- [x] Pen: atualizar awGNq, hCl8x, uZUSr e dCs2s pelo CLI, salvar e reabrir para verificar persistência; atualizar documentação corrente.
- [x] Integração: aplicar migrations primeiro no banco teste confirmado, verificar API/mobile/web/validators/DB, gerar SDK web se necessário, revisão independente e migration no banco local autorizado. QA visual com usuário; sem commit/push.

## Verificação

Testes focados antes de ampliar; tipos e Biome nos consumidores alterados; regressões de fracionário rejeitado e legado arredondado; migrations testadas com registros fracionários sem reset; consultas posteriores confirmam ausência de frações e seed inteiro. Artefatos em `artifacts/muv-9/2026-10-17-integer-load/`.
