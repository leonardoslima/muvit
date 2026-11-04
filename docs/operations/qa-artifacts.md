# Artefatos de QA e execução

Toda saída gerada por uma execução deve ficar em `artifacts/`, na raiz da worktree em uso. A regra `/artifacts/` no `.gitignore` exclui esse conteúdo do versionamento. Cada worktree mantém seus próprios artefatos.

## Estrutura

```text
artifacts/
  muv-9/
    2026-10-17T100730-fotos-avaliacao/
      screenshots/
      videos/
      logs/
      references/
      relatorio.md
```

Use o identificador da issue em minúsculas ou um nome curto do escopo quando não houver issue. Identifique cada execução pela data, horário e cenário para evitar sobrescrever evidências anteriores. Crie apenas as subpastas necessárias. `references/` recebe exports do Pencil, imagens de comparação e outras referências geradas para aquela execução.

## O que fica versionado

| Versionado no diretório responsável | Local em `artifacts/` |
| --- | --- |
| Código e testes automatizados | Capturas, gravações e árvores de UI de uma execução |
| Fluxos Maestro em `.maestro/` ou nos testes do app | Saída do Maestro, logs, traces e resultados temporários |
| Scripts de QA e configurações reproduzíveis | Exports de referência e comparações visuais geradas |
| Assets usados pelo app, design, seed ou testes | Relatório completo da execução e arquivos temporários de diagnóstico |
| Documentação operacional, contratos e handoffs com resumos verificáveis | APKs e outros pacotes exportados para aquela sessão de QA |

Uma imagem usada pelo seed ou um golden mantido como entrada de teste deve continuar no diretório versionado responsável. Uma captura produzida ao executar esse teste é uma saída local. Não mova arquivos necessários ao build ou à reprodução dos testes para uma pasta ignorada.

## Fluxo de execução

1. Confirme issue, worktree, branch, SHA e eventuais alterações locais. Para mobile, confirme também o serial do dispositivo, o projeto do Metro e a API usados.
2. Crie a pasta da execução antes de gerar as evidências e configure as ferramentas para escrever nela. Não crie novas pastas `qa`, `evidence`, `@evidence` ou similares em outros diretórios para guardar saídas.
3. Execute os cenários previstos, registre os comandos e os resultados observados e inspecione as capturas antes de declarar uma validação visual concluída.
4. Escreva `relatorio.md` com contexto, comandos e exit codes, cenários exercitados, resultados, links relativos para as evidências e limitações. Separe testes automatizados, CI e inspeção visual/manual. Referencie o SHA e informe quando a execução incluiu mudanças ainda não commitadas.
5. Antes de preparar o commit, confirme que `artifacts/` continua ignorado e que as saídas não aparecem nos arquivos rastreados. Nunca use `git add -f` nessa pasta. Não ignore globalmente extensões como PNG ou Markdown, pois há assets e documentação legítimos no projeto.
6. Na PR ou no Linear, registre o resumo dos resultados e anexe as evidências necessárias à revisão, ou forneça o link dos artefatos do CI. Um caminho local não é acessível ao revisor; não o apresente como evidência compartilhada. Publique somente quando autorizado pelo fluxo da tarefa e confira dados sensíveis antes de compartilhar.

## Exemplos no PowerShell

Execute da raiz, substituindo o identificador e o nome do cenário:

```powershell
$qaRun = Join-Path $PWD ('artifacts/muv-9/' + (Get-Date -Format 'yyyy-MM-ddTHHmmss') + '-login')
New-Item -ItemType Directory -Force (Join-Path $qaRun 'screenshots'), (Join-Path $qaRun 'logs') | Out-Null
maestro --device <serial-confirmado> test --test-output-dir $qaRun .maestro/<fluxo>.yaml
git check-ignore -- artifacts/muv-9/<execucao>/screenshots/tela.png
git ls-files -- artifacts
```

O `git check-ignore` deve identificar a regra de ignore; `git ls-files -- artifacts` não deve listar arquivos. No Windows, use `maestro.bat` ou o caminho instalado se `maestro` não estiver disponível no PATH. O Maestro organiza suas capturas sob a pasta de saída da execução; em `takeScreenshot`, use nomes relativos, como `login-vazio`, sem caminhos absolutos.

Para captura direta por ADB, confirme o serial e use um nome temporário exclusivo no dispositivo, depois copie para `screenshots/` dentro da execução. Não capture senhas, cookies, tokens ou dados pessoais reais em logs e imagens. Não copie arquivos `.env` para os artefatos.

## Compartilhamento, CI e retenção

O CI deve produzir e publicar artefatos pelo mecanismo próprio do provedor, com prazo de retenção definido no workflow, sem commitá-los no repositório. Para execuções locais, preserve os arquivos enquanto forem necessários à revisão ou investigação; o ignore não é backup. Antes de remover uma worktree ou limpar suas saídas, confirme que as evidências necessárias já foram anexadas ao ticket/PR ou preservadas em um destino acordado.

Limpeza deve se limitar à pasta de uma execução identificada. Confirme o caminho absoluto e o vínculo com a worktree antes de remover arquivos. Preserve outras execuções, serviços compartilhados e arquivos de usuários.

## Evidências anteriores à convenção

As evidências locais desta migração foram preservadas em:

- `artifacts/muv-9/2026-10-16-login/`
- `artifacts/muv-9/2026-10-17-fotos-avaliacao/`
- `artifacts/muv-37/2026-10-14-validacao/`
- `artifacts/muv-40/historico/`

Os arquivos antes rastreados foram retirados das próximas versões, sem reescrever o histórico do Git. Em um clone novo, essas evidências locais não estarão presentes; consulte os anexos das respectivas PRs/issues ou as versões históricas caso necessário.
