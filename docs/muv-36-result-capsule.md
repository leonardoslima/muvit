# MUV-36 — Cápsula de resultado

- **Data:** 14/10/2026
- **Issue:** [MUV-36 — Migrar aluno — sessão guiada de treino para UI/UX v2](https://linear.app/muvit/issue/MUV-36/migrar-aluno-sessao-guiada-de-treino-para-uiux-v2)
- **PR:** [#26 — pronta para revisão humana](https://github.com/leonardoslima/muvit/pull/26)
- **Estado Linear:** `In Review`; não houve merge.
- **Follow-up:** [MUV-43 — Desbloquear build Android nativo em worktrees longas no Windows](https://linear.app/muvit/issue/MUV-43/desbloquear-build-android-nativo-em-worktrees-longas-no-windows)
- **Branch:** `feat/muv-36-migrar-aluno-sessao-guiada-de-treino`

## Escopo entregue

Migração da sessão guiada para a UI v2, preservando edição e persistência de séries, descanso, avanço, saída segura, retomada, conclusão e estado de sincronização. A implementação inclui apresentação da sessão, mídia demonstrativa, detalhes do exercício, cobertura unitária e fluxo Maestro. A barra de status muda para ícones escuros enquanto a demonstração de fundo claro está aberta e volta ao estilo anterior ao fechar.

## Verificações aprovadas

- `pnpm.cmd --dir apps/mobile test --hookTimeout=30000 --maxWorkers=4` — 79 arquivos e 711 testes aprovados.
- `pnpm.cmd --dir apps/mobile typecheck` — aprovado.
- Biome — 21 arquivos verificados, sem correções.
- `pnpm.cmd --dir apps/mobile doctor` — exit code 0.
- Cobertura core — 94,45% statements, 87,90% branches, 99% functions e 97,77% linhas.
- Cobertura UI — 87,23% statements, 86,91% branches, 88,88% functions e 91,19% linhas.
- CI da PR — Biome, testes mobile, build Turborepo e TypeScript passaram no SHA `17fd42007eb04ee8735fe3618496c3f54cf80a3f`.
- Revisão técnica independente do diff final — `APPROVED`, após corrigir o contraste da barra de status.

## Ambiente e evidência visual

- **Ambiente:** Windows/PowerShell, worktree Orca `auto-muvit-desenvolvimento-aut-nomo-run-27-20261014T0936`; AVD `muvit-muv-36-run-27`, serial `emulator-5554`.
- **SHA revisado e validado:** `17fd42007eb04ee8735fe3618496c3f54cf80a3f`.
- **Capturas Android e comparação visual renderizada com Pen:** não realizadas. O build nativo falhou antes de gerar o APK; o AVD iniciou, mas não recebeu o app. A referência de design permanece em `docs/mobile-v2-student-session.md`.

## Limitação registrada em MUV-43

O build Android nativo falhou no CMake/Ninja ao preparar diretórios profundos sob `node_modules`; o APK customizado não foi gerado. O AVD exclusivo `muvit-muv-36-run-27` (`emulator-5554`) iniciou, mas não recebeu o APK. Portanto, os fluxos Android ADB/Maestro não foram executados; o CLI Maestro também não estava disponível no PATH. Conforme orientação do usuário, essa validação ficou separada da entrega de MUV-36 e foi registrada em MUV-43.
