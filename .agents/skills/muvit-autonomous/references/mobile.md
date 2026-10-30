# QA mobile do Muvit

- Testar via **ADB** e emulador Android de verdade. **Não usar o controle nativo do emulador do Orca**. Usar `adb devices`, logs e comandos compatíveis com ambiente disponível.
- Quando um emulador estiver sendo usado por outra rodada, criar/iniciar outro exclusivo da worktree/card; nunca assumir controle de emulador alheio.
- Quando o fluxo depender do servidor, garantir backend e banco do card funcionando; app precisa apontar para API correta do ambiente isolado. Verificar seed e contas adequadas; não testar com credenciais fictícias. Em fluxo estritamente local, registrar a não aplicabilidade de API/banco e comprovar o comportamento afetado.
- Cobrir navegação, validações, telas afetadas, persistência em servidor e retorno após reiniciar/trocar sessão/dispositivo quando requisito envolver sincronização.
- Falha de draft: campos inválidos não podem ser salvos silenciosamente; mensagem deve indicar motivo; saída sem salvar continua possível quando usuário optar por não corrigir. Só implementar quando o card exigir.
- Não alegar que UI mobile foi testada apenas porque Metro/build foi concluído. Capturar evidências ADB/logs e resultado da interação.
- Se houver trabalho visual `.pen`, visualizar pelo Pen CLI para comparar. Finalizar o emulador criado pela rodada ao concluir, sem encerrar emuladores de outros cards.
