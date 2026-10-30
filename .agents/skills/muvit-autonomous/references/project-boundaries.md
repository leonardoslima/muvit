# Limites relevantes ao projeto Muvit

Usar instruções atuais do repositório como fonte da verdade, sem congelar dependências/arquitetura nesta skill. Contexto conhecido que deve ser conferido na worktree antes de mexer:

- Consulte o mapa do `AGENTS.md` raiz e as regras do alvo: API em `apps/api`, dashboard em `apps/web`, Expo em `apps/mobile` e pacotes compartilhados em `packages/`. Confirme stacks e comandos nos manifests atuais, sem congelar versões nesta skill.
- Mobile possui fluxos de treino offline, fila offline, avaliação/fotos e autenticação; preservar contratos de persistência e isolamento da sessão. Verificar limpeza de cache/query client no logout se tocar autenticação.
- Respeitar testes e textos pt-BR/UTF-8. Evitar introduzir bibliotecas novas de estado/UI sem necessidade demonstrada.
- Alterações de dependências são card próprio, não atualizar pacotes incidentais. Remoção de Sentry pertence a requisito específico do card relevante, não uma refatoração universal por esta skill.
- `Pen CLI` para ler designs `.pen` quando envolvem alterações visuais. Não criar layout V2 paralelo para preservar UI legacy sem escopo solicitado.
- Pode haver worktrees no Windows com `.env` ausente e problema de limite de caminho no build Android; conferir a realidade e não falsificar validações.
- Decisões mais recentes do card e de `AGENTS.md` no repositório prevalecem sobre notas gerais deste documento.
