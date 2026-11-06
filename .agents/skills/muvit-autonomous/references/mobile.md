# QA mobile do Muvit

- Testar via **ADB** e emulador Android de verdade. **Não usar o controle nativo do emulador do Orca**. Usar `adb devices`, logs e comandos compatíveis com ambiente disponível.
- No Windows, antes do primeiro comando que possa iniciar o servidor ADB, executar `adb start-server` a partir de um diretório neutro e estável fora de qualquer worktree, como `$env:USERPROFILE`; depois voltar à worktree. O servidor ADB é compartilhado entre rodadas e pode manter aberto o diretório de trabalho de onde foi iniciado, impedindo a exclusão posterior da pasta. Não reiniciar um servidor já em uso por outra rodada para trocar seu diretório de trabalho.
- Quando um emulador estiver sendo usado por outra rodada, criar/iniciar outro exclusivo da worktree/card; nunca assumir controle de emulador alheio.
- Garantir backend e banco do card funcionando; app precisa apontar para API correta do ambiente isolado. Verificar seed e contas adequadas; não testar com credenciais fictícias.
- Cobrir navegação, validações, telas afetadas, persistência em servidor e retorno após reiniciar/trocar sessão/dispositivo quando requisito envolver sincronização.
- Falha de draft: campos inválidos não podem ser salvos silenciosamente; mensagem deve indicar motivo; saída sem salvar continua possível quando usuário optar por não corrigir. Só implementar quando o card exigir.
- Não alegar que UI mobile foi testada apenas porque Metro/build foi concluído. Capturar evidências ADB/logs e resultado da interação.
- QA visual testa a aplicação em execução, sem exigir comparação com `.pen`. Em tarefa explícita de edição de design, usar Pen CLI quando disponível. Finalizar o emulador criado pela rodada ao concluir, sem encerrar emuladores de outros cards.
