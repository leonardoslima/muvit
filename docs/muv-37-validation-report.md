# MUV-37 — relatório de validação

Data: 2026-10-14
Worktree: auto-muvit-desenvolvimento-aut-nomo-run-28-20261014T0900
Branch: feat/muv-37-migrar-aluno-progresso-e-avaliacoes

## Contrato e banco

O usuário autorizou adaptar o app aos critérios do design, inclusive o schema. createAssessmentSchema.photos aceita qualquer quantidade de URLs válidas, removendo o teto de seis. A API consome o schema compartilhado e mantém rota e formato do payload. A coluna existente assessments.photos é jsonb tipada como string[] e não limita itens; não foi necessária migration. O app envia uploads sequencialmente antes de criar a avaliação. O máximo de três fotos do fluxo do professor permanece inalterado; o SDK web já representa a propriedade como Array<string>. A API deve ser disponibilizada antes da versão móvel que envia mais de seis fotos; clientes antigos continuam compatíveis.

## Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| Testes focados da grade e fotos do treinador | 2 arquivos, 20 testes aprovados após limitar a margem de arredondamento ao card do aluno |
| Suíte mobile completa | 72 arquivos, 652 testes aprovados; duração 65,16 s |
| Typecheck mobile | aprovado |
| Biome nos 20 arquivos TypeScript/TSX alterados | aprovado, sem alterações |
| git diff --check | aprovado |
| Validators | 8 testes e typecheck aprovados |
| API | 22 arquivos, 85 testes; typecheck e build aprovados |
| Web | geração do SDK, typecheck e 42 arquivos/114 testes aprovados; o SDK não precisou de diff adicional |
| Cobertura mobile core/UI | pisos de 85% excedidos: statements 94,16%/89,46%, branches 87,59%/87,53% e linhas 97,64%/94,14% |

As verificações de API, validators, web e cobertura foram executadas antes da correção visual final, que alterou somente o cálculo de largura do grid e seus testes. A suíte mobile completa, typecheck mobile, Biome focado e git diff --check foram executados depois dessa correção. A validação final desta worktree não alterou código depois desses resultados.

## Android e fluxo observado

- AVD dedicado muvit-muv-37-run-28, serial emulator-5556. A base física de 1080×2400 a 420 dpi corresponde a aproximadamente 411 dp. As larguras de 320 dp e 430 dp foram reproduzidas no mesmo AVD com wm size 840x2400 e 1128x2400, mantendo 420 dpi; a escala de fonte foi testada em 1,2 e depois restaurada para 1,0. A resolução foi restaurada ao valor físico.
- Depois de detectar que o emulador carregava o Metro da worktree run-27, a sessão foi apontada para um Metro na porta 8083 desta worktree. As verificações e capturas abaixo foram feitas com o bundle run-28; o processo da run-27 não foi interrompido.
- Com o seletor nativo, selecionei uma foto, reabri a biblioteca e acrescentei outra. Cancelei uma abertura seguinte e as duas seleções permaneceram. Removi uma foto, confirmei a contagem reduzida, acrescentei outra e salvei a avaliação com duas fotos e uma observação sintética longa. O histórico voltou a mostrar a avaliação e as duas miniaturas; o visor abriu Foto 1 de 2, avançou para Foto 2 de 2 e retornou ao histórico.
- Repeti a seleção nativa com oito imagens. O seletor mostrou 8 selecionadas; o formulário mostrou 8 fotos selecionadas. Após salvar, o histórico expôs Abrir foto 8 e o visor confirmou Foto 8 de 8. Os arquivos usados são capturas sintéticas do próprio AVD.
- Em 320 dp, 430 dp e fonte 1,2, os campos, descrições e grade se ajustaram sem corte horizontal observado. Com o teclado aberto, uma observação sintética de 151 caracteres permaneceu visível e editável; o formulário continuou rolável até as fotos e a ação de salvar.
- TalkBack foi ativado durante a inspeção: o foco visual passou do botão de retorno para o campo Data da avaliação. A árvore de acessibilidade expôs nomes para Abrir foto, Remover foto, Fechar fotos, Foto anterior e Próxima foto. Não foi feita uma auditoria independente da fala sintetizada.
- As imagens passaram pelo proxy local de upload em memória. A API local criou os registros no Postgres e as imagens ficaram acessíveis no fluxo da execução; R2/CDN não foi exercitado.
- O build Gradle Android passou antes das últimas mudanças exclusivamente TypeScript/TSX e testes. Nenhum arquivo nativo mudou depois do build; o APK instalado carregou o JavaScript final desta worktree pelo Metro.
- API em localhost:3334/health e proxy de upload em localhost:3333/health retornaram status ok.
- Capturas: [histórico com duas fotos](superpowers/evidence/muv-37-progress-android.png), [Foto 1 de 2](superpowers/evidence/muv-37-viewer-android.png), [Foto 2 de 2](superpowers/evidence/muv-37-viewer-second-photo-android.png), [seletor com oito imagens](superpowers/evidence/muv-37-picker-eight-android.png), [formulário em 320 dp e fonte 1,2](superpowers/evidence/muv-37-form-320dp-font-120-android.png), [formulário em 430 dp](superpowers/evidence/muv-37-form-430dp-android.png), [teclado e observação longa](superpowers/evidence/muv-37-keyboard-long-note-android.png), [foco TalkBack no campo de data](superpowers/evidence/muv-37-talkback-date-focus-android.png) e [grade com duas fotos removíveis](superpowers/evidence/muv-37-assessment-two-photo-grid-android.png).
- O fluxo Maestro passou 1/1 no AVD após tornar o estado inicial repetível e aguardar o carregamento frio. Ele cobre cadastro, Home, Progresso vazio, formulário e abertura do picker; os fluxos de seleção, remoção, salvamento, retorno e oito fotos foram exercitados manualmente no app. O binário foi chamado por C:\Users\Leonardo\.maestro\bin\maestro.bat, pois não está no PATH atual.
- Expo Doctor marcou 16/17 verificações. As divergências reportadas foram sentry-expo 7.2.0 frente à expectativa aproximada 7.0.0 e @react-navigation/bottom-tabs 7.16.0 frente a ^7.4.0; ambas já existiam no workspace e não foram alteradas nesta issue.

## Limites desta validação

O teste nativo comprovou oito fotos, que é acima do limite removido, mas não representa uma quantidade infinita; o contrato sem teto e a seleção maior também estão cobertos pelos testes automatizados. As larguras de 320 dp e 430 dp foram simuladas por override no AVD, não em aparelhos físicos separados. TalkBack recebeu teste de foco e nomes acessíveis, mas não houve revisão independente da fala sintetizada. R2/CDN, falhas manuais de rede e upload parcial não foram exercitados no AVD; esses casos permanecem cobertos pelos testes automatizados ou fora do ambiente local usado nesta validação.
