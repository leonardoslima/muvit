# MUV-61 Maestro professor e confirmação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Não delegar nesta Task; execução e integração pertencem ao coordenador. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Identificar a causa das falhas Android e estabilizar somente a automação de professor e confirmação, preservando todas as asserções.

**Architecture:** Reproduzir antes de corrigir, comparar a hierarquia Maestro com interação manual na mesma Development Build e testar uma hipótese por vez. Reutilizar runner, fixtures HTTP e PostgreSQL descartável; manter produto e verificações da MUV-58 fora do diff.

**Tech Stack:** Maestro YAML, Node.js >=24, pnpm 10, Expo Development Build, ADB, PostgreSQL 16 Docker, node:test.

**Spec:** Briefing MUV-61 desta Task e https://linear.app/muvit/issue/MUV-61/investigar-e-estabilizar-cenarios-maestro-de-professor-e-confirmacao; contexto versionado em `docs/operations/auditoria-funcional-muv-10.md`.

## Global Constraints

- Worktree `C:/Dev/orca-wt/muv-61`, branch `muv-61`, run coordenador `790a8167-9e0e-42fe-a2e9-2711d1df5a43`; baseline informado `3e6bcf453cf9e0025bba3892388f29cba200497d`. Reconciliar alterações antes da execução; preservar trabalho alheio.
- Planner modifica somente este plano. Implementador não altera Linear, não faz commit/push/PR/merge; coordenador controla integração.
- Não escrever em `logout.yaml`, `isolamento.yaml`, login compartilhado ou verificações HTTP de isolamento. Não tornar etapas críticas opcionais, limpar estado para simular isolamento, remover asserções ou confirmar cadastro diretamente antes da etapa prevista.
- Aplicar AGENTS raiz/mobile e referências mobile/environment/quality-and-qa; comandos da raiz em terminais Orca. Antes de testes/build, conferir preparação dos sete `.env` já verificados sem registrar conteúdo. Dependências em node_modules padrão.
- AVD exclusivo com serial explícito, Development Build instalada e API/DB próprios; não usar Expo Go ou AVD alheio. ADB compartilhado não deve ser reiniciado; quando necessário, primeiro start-server em diretório neutro.
- Evidência sob `artifacts/muv-61/790a8167-9e0e-42fe-a2e9-2711d1df5a43/`; UTF-8 literal; nenhum segredo ou artefato no Git.

## Review Focus

1. Teclado aberto cobre campo: comparar UI/hierarquia antes e depois de cada ação (T2/T4).
2. Swipe toca EditText e reabre teclado: capturar início/fim do gesto; testar alternativa apenas após confirmar (T2/T3).
3. Development Client retorna ao launcher ao reabrir: distinguir falha de infraestrutura da persistência (T2/T3).
4. Confirmação parcial passa sem retorno autenticado: exigir ambos os fluxos e `confirmed: true` (T4/T5).
5. Logout falha após edição correta: registrar falha integral e evidência parcial sem alterar MUV-58 (T3/T5).

## Evidência disponível e decisões

Inspeção estática, sem reprodução nesta Task. `professor.yaml` busca Carga por texto com scrollUntilVisible e toca ponto relativo 95%; isso é candidato a investigação, não causa comprovada. Cadastro toca signup-password após digitar email sem dispensar teclado entre ambos. O runner executa confirmação na ordem confirmacao-email → confirmação HTTP → confirmar-email-link e só verifica professor pela API após o Maestro terminar. Portanto `scenarios: []` em falha não comprova que nenhuma ação ocorreu e tampouco aprova persistência.

O documento da MUV-10 registra falhas na HEAD 26b0d56 e retestes históricos com alterações não integradas. `Test-Path` retornou false para o diretório histórico nesta worktree e em `C:/Users/Leonardo/Desktop/Muvit/muvit/artifacts/muv-10/2026-11-05-run61`; as worktrees atualmente listadas em C:/Dev/orca-wt não incluem a rodada antiga. Logs históricos não foram lidos e não são evidência atual. Reprodução nova é obrigatória.

Alternativas: corrigir gesto/seletor quando UI manual funciona (preferida, condicional à evidência); ajustar runner apenas se fronteira/ordem estiver errada; defeito de UI deve ser reportado ao coordenador para rastreio separado. Não escolher Back, rolagem ou waits por analogia. `avaliacoes-empatadas.yaml` e testes criticalScroll são referências de investigação, não autorização para copiar coordenadas.

## Mapa de arquivos

- Modificação prevista: `.maestro/mobile/professor.yaml`, `.maestro/mobile/confirmacao-email.yaml`; somente etapas de interação diagnosticadas.
- Modificação condicional: `.maestro/mobile/confirmar-email-link.yaml` se reprodução alcançar falha nesse retorno; manter Já confirmei e home autenticada.
- Testes: `scripts/mobile-e2e.test.mjs`, acrescentando regressão específica da causa observada sem alterar asserts de isolamento existentes.
- Runner `scripts/mobile-e2e.mjs` e guia `docs/operations/mobile-e2e.md`: somente agrupamento de artefatos descrito em T1; outra alteração requer evidência.
- Leitura: `apps/mobile/src/screens/trainer-workout-editor.tsx`, `trainer-new-assessment.tsx`, componentes do editor e formulário de cadastro; localizar signup-password com rg antes de acompanhar seu componente. Sem escrita de produto.

### Task 1: Garantir evidência no diretório exigido

**Files:** Modify scripts/mobile-e2e.mjs, scripts/mobile-e2e.test.mjs, docs/operations/mobile-e2e.md.
**Interfaces:** parseArgs(argv) mantém defaults; nova opção opcional `--artifact-group <slug>` retorna artifactGroup string ou undefined; run(options) usa artifacts/scope/group/runId quando definida, mantendo runId aleatório e defaults antigos.

- [ ] Adicionar teste `agrupa artefatos sem alterar execução ou permitir traversal`: parseArgs aceita UUID do briefing, rejeita `../x`, barra, caminho absoluto e vazio; defaults continuam undefined. Extrair `artifactDirectory(options, runId)` para testar destino exato e legado, sem iniciar Docker.
- [ ] Rodar `node --test scripts/mobile-e2e.test.mjs`; obter RED pelo argumento não suportado/export ausente, sem confundir erro de ambiente com RED.
- [ ] Implementar validação de group pelo mesmo padrão de slug do scope; exportar artifactDirectory(options, runId) e usá-la em run. Não alterar chaves de credenciais, recursos, runId ou opções de isolamento. Documentar opção.
- [ ] Reexecutar teste para GREEN; registrar saída. Esta pequena extensão evita mover artefatos após execução ou permitir caminhos arbitrários em artifact-scope.

### Task 2: Reproduzir e classificar antes da correção

**Files:** Create somente logs/capturas/relatorio.md sob raiz de evidências.
**Interfaces:** Consome runner T1; produz registro por cenário com SHA, comando, exit code, primeiro passo falho, hierarquia, screenshot, estado teclado, AVD/serial, API/Metro/DB e hipótese testável.

- [ ] Confirmar status/HEAD, ownership atual de recursos e portas livres; usar CLI Orca para terminais. Ler guia Windows build antes de `pnpm.cmd mobile:android:build`; instalar no serial exclusivo selecionado conforme opções reais do script. Registrar hash APK e boot. Não iniciar Metro paralelo: runner inicia seu próprio Metro.
- [ ] Executar separadamente os comandos de T5 com YAML original; manter todas as saídas, inclusive falhas. Registrar versões Node, Maestro, Java e Android, dimensões/font scale e portas efetivas. Build não é reprodução.
- [ ] Inspecionar captura/hierarquia do primeiro passo falho emitidas pelo Maestro. Para comparação manual com API viva, coordenar uma execução diagnóstica observada enquanto os serviços do runner estão ativos; se isso não bastar, pedir ao coordenador ambiente diagnóstico isolado com os mesmos scripts de fixture e servidor, sem modificar contratos ou copiar credenciais para logs. Não assumir que o runner aceita caminho de fluxo arbitrário nem desabilitar asserções para permitir pausa.
- [ ] Comparar ação manual no AVD exclusivo no mesmo estado: alvo existe? está visível? recebe foco? teclado muda? gesto rola ou foca input? Se cleanup já ocorreu, preparar nova execução isolada; não interpretar conexão morta como defeito.
- [ ] Escrever hipótese única com observação que a refutaria. UI manual falha também: preservar evidência e solicitar ao coordenador rastreio separado, sem editar produto. Falha não reproduzida: registrar tentativas e limites, sem inventar correção.

### Task 3: Regressão e ajuste de professor

**Files:** Modify professor.yaml, scripts/mobile-e2e.test.mjs.
**Interfaces:** Consome diagnóstico T2; mantém avaliação 78,5 kg/170 cm/Avaliacao E2E, edição 20→24, 2 séries/10 reps, reabertura, logout e verify da API.

- [ ] Registrar RED Android original. Acrescentar teste node:test com nome da causa comprovada, verificando a sequência mínima que o diagnóstico exigir e preservação das asserções acima; não fixar coordenadas copiadas de outro cenário. O teste deve falhar na versão original por essa regressão específica.
- [ ] Alterar uma interação causal por vez: seletor semântico existente se alvo errado; gesto dentro da região rolável se swipe interceptado; dispensa de teclado apenas se observada necessária. Toda busca permanece limitada e termina com assert obrigatório. Não aumentar timeout sem medir atraso.
- [ ] Rodar node:test para GREEN e professor completo em Android. Verificar captura e resultado API após reabertura. Se parar em logout, registrar edição como evidência parcial e cenário como failed/NOT_PROVEN; avisar coordenador, sem bypass.

### Task 4: Regressão e ajuste de confirmação

**Files:** Modify confirmacao-email.yaml e scripts/mobile-e2e.test.mjs; confirmar-email-link.yaml apenas se diagnosticado.
**Interfaces:** Mantém signup → pendência → reenvio/mensagem/cooldown → INVALID_TOKEN → HTTP de confirmação → retorno nativo → Já confirmei → home.

- [ ] Registrar RED original no AVD e escrever teste nomeado pela causa, exigindo a ordem de interação comprovada e mantendo asserts de pendência, reenvio, cooldown e erro inválido. Manter testes existentes de origem do link, sanitização e ordem dos dois fluxos.
- [ ] Implementar somente interação causal. Não simular confirmação, trocar email por conta já verificada ou omitir retorno.
- [ ] Rodar node:test para GREEN e confirmação completa em Android. Evidência deve incluir segundo fluxo, home e confirmed true no resultado sanitizado; não afirmar entrega externa de email, pois mailbox é em memória.

### Task 5: Validação integrada e handoff

**Files:** Create relatorio.md e subpastas de execução sob raiz de artefatos; revisar somente diff autorizado.
**Interfaces:** Consome resultados T1–T4; produz matriz aceite/evidência/limite para coordenador.

- [ ] Em terminal Orca, definir `$qaSerial` e `$qaAvd` a partir de ownership confirmado e portas exclusivas livres. Executar separadamente (portas abaixo são exemplos a confirmar, não reservas):

```powershell
node --test scripts/mobile-e2e.test.mjs
pnpm.cmd mobile:e2e --scenario professor --device $qaSerial --avd-name $qaAvd --api-port 3361 --metro-port 8161 --db-port 5461 --artifact-scope muv-61 --artifact-group 790a8167-9e0e-42fe-a2e9-2711d1df5a43
pnpm.cmd mobile:e2e --scenario confirmacao-email --device $qaSerial --avd-name $qaAvd --api-port 3361 --metro-port 8161 --db-port 5461 --artifact-scope muv-61 --artifact-group 790a8167-9e0e-42fe-a2e9-2711d1df5a43
pnpm.cmd exec biome check scripts/mobile-e2e.mjs scripts/mobile-e2e.test.mjs
```

- [ ] Exigir cada cenário completo com exit 0 e maestroExecuted true, professor com valores persistidos pela fixture e confirmação com confirmed true. Repetir ambos uma segunda vez em datasets novos no mesmo AVD para verificar repetibilidade; falha intermitente reabre investigação.
- [ ] Se escrever produto excepcionalmente for autorizado em nova tarefa, ler regras locais e rodar mobile test/typecheck/doctor e build conforme risco; neste escopo YAML/runner não alegar essas verificações como executadas. api-only professor pode diagnosticar fixture, nunca aprovar Android; confirmação rejeita api-only.
- [ ] Inspecionar capturas e registrar comparação manual, não apenas presença de PNG. Registrar primeiro erro, resultados parciais e NOT_PROVEN para qualquer etapa não alcançada.
- [ ] Conferir `git diff --check`, `git diff -- .maestro/mobile/logout.yaml .maestro/mobile/isolamento.yaml .maestro/mobile/login.yaml` (vazio), `git ls-files -- artifacts` (vazio), `git check-ignore -- artifacts/muv-61/790a8167-9e0e-42fe-a2e9-2711d1df5a43/relatorio.md`. Buscar escapes Unicode com rg nos arquivos textuais alterados e corrigir acentuação escapada. Preservar UTF-8.
- [ ] Entregar resumo ao coordenador com caminhos locais e limites de compartilhamento; somente ele decide commit/PR/Linear. Limpar somente recursos próprios conforme runner/guia; não encerrar recursos de MUV-63.

## Cobertura do aceite e autocritica

| Aceite | Tarefa | Evidência exigida |
| --- | --- | --- |
| 1 reprodução e causa | T2 | RED, árvore/captura e comparação manual na Development Build dedicada |
| 2 automação sem perda de asserts | T3/T4 | RED→GREEN específico, diff restrito, valores e retorno preservados; defeito separado ao coordenador |
| 3 cenários completos isolados | T5 | dois cenários, comandos, exits, relatórios e persistência API; repetição em datasets novos |
| 4 MUV-58 inalterada | T3/T5 | diff vazio nos arquivos protegidos e falha de logout reportada sem bypass |
