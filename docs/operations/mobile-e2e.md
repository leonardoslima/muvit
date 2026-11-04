# E2E mobile — aluno e professor

A suíte permanente do projeto fica em `.maestro/mobile/` e usa Maestro no Android, API desta worktree e PostgreSQL 16 descartável. Cada cenário prepara contas e dados próprios e verifica o resultado pela API depois das ações na UI. Não utiliza o seed demo, dados pessoais ou mídia R2. Ao modificar os fluxos, atualize os cenários afetados ou acrescente os E2E necessários, conforme `AGENTS.md`.

## Pré-requisitos

- Node.js 24 ou superior, pnpm e dependências instaladas com `pnpm.cmd install --frozen-lockfile`.
- Docker Engine ativo, com acesso à imagem `postgres:16-alpine`.
- Android SDK, ADB e um AVD exclusivo, com boot completo; Expo Go compatível com SDK 54 instalado no dispositivo. O nome padrão esperado é `muvit-mobile-e2e`; outro AVD exclusivo pode ser indicado com `--avd-name <nome>`.
- Maestro instalado e Java compatível. No Windows, disponibilize `maestro.bat` no PATH e configure `JAVA_HOME`; use o SDK Android para disponibilizar `adb.exe`.
- Portas locais livres para API, Metro e PostgreSQL; padrões `3344`, `8094`, `5444`. O runner não assume um serviço existente nessas portas.

Confirme a propriedade do AVD antes de executar comandos. A presença de um dispositivo na lista do ADB não concede autorização para usá-lo:

```powershell
adb devices -l
adb -s <serial-confirmado> emu avd name
adb -s <serial-confirmado> shell getprop sys.boot_completed
```

O runner recebe o serial explicitamente; não seleciona o primeiro dispositivo, não provisiona nem encerra o AVD. Preserve outras instâncias e nunca execute `adb kill-server` para esta suíte.

## Execução a partir da raiz

```powershell
pnpm.cmd mobile:e2e --scenario aluno --device <serial-confirmado>
pnpm.cmd mobile:e2e --scenario professor --device <serial-confirmado>
pnpm.cmd mobile:e2e --scenario isolamento --device <serial-confirmado>
pnpm.cmd mobile:e2e --scenario all --device <serial-confirmado>
```

Cada chamada cria outro banco, uma chave de autenticação e um dataset. As contas também são únicas por cenário; ao executar `all`, cada jornada encerra a sessão antes da próxima. Assim, a suíte não precisa apagar dados do Expo Go e pode detectar o isolamento entre contas sem redefinir o app. Use somente o AVD dedicado.

Para conferir preparação de dados e negações HTTP sem dispositivo:

```powershell
pnpm.cmd mobile:e2e --scenario all --mode api-only
node --test scripts/mobile-e2e.test.mjs
```

`api-only` não executa Maestro e não comprova o aceite Android. Não substitui a conclusão das jornadas reais. Os testes Vitest das fixtures usam o banco de teste configurado para a API e removem apenas os registros próprios de cada teste; antes de executá-los, siga as regras de isolamento de `apps/api/AGENTS.md` e `packages/db/AGENTS.md`.

Os testes do runner também integram `pnpm.cmd test`, antes dos testes de workspace. A suíte Android continua sendo executada explicitamente pelo comando `mobile:e2e`.

## O que os cenários comprovam

| Cenário | UI e persistência |
| --- | --- |
| Aluno | Login; treino atual com um exercício e duas séries; registro de `10 × 22 kg` e `8 × 18 kg` com controles de carga; conclusão com volume `364 kg`; contagem semanal de zero para um; avaliação em Progresso; reabertura autenticada e leitura dos registros pela API |
| Professor | Login e home; busca de aluno vinculado; avaliação com peso `78,5 kg`, altura `170 cm` e observação de teste; edição da carga prescrita de `20` para `24 kg`; reabertura da avaliação/prescrição e conferência pela API |
| Isolamento | Troca de contas sem limpar estado; bloqueio de áreas do outro papel; deep links de recursos alheios; 401 sem sessão, 403 por papel, 404 por ownership; tentativas de escrita negadas e conteúdo do dono preservado |

No produto atual, **Progresso** apresenta avaliações; a contagem de treinos concluídos aparece em **Hoje → Sua evolução → NA SEMANA**. A suíte confere ambos. Um toast de conclusão local ou HTTP 200 sem os valores esperados não aprova persistência.

## Recursos, evidências e falhas

O runner cria seu próprio container, credenciais efêmeras, API e Metro; a API escuta somente em `127.0.0.1`. Passa configuração aos subprocessos e não sobrescreve os `.env` locais. Aplica migrations existentes. Não adiciona endpoints de teste: a fixture usa HTTP, com acesso ao banco restrito à resolução de perfil e ao exercício global mínimo do catálogo.

Em `finally`, encerra somente os subprocessos/container criados pela chamada e remove seus reverses ADB. O AVD e os artefatos permanecem disponíveis. Interrupção forçada do processo ou queda do host pode impedir o `finally`; nesse caso identifique os recursos pelos metadados da execução antes de qualquer limpeza. Nunca remova containers, volumes ou processos por nome global.

Saídas ficam em `artifacts/mobile-e2e/<execucao>/`, conforme [qa-artifacts.md](qa-artifacts.md). Use `--artifact-scope <escopo>` para agrupar evidências de uma entrega, sem vincular a suíte ao card. E-mails e senhas efêmeros são sanitizados nos logs; cookies permanecem em memória e não entram nos manifestos ou artefatos; revise as evidências antes de compartilhar. Não versione saídas nem copie `.env` para os artefatos.

Falhas de preflight ou asserções mantêm exit code diferente de zero. Consulte logs de API, Metro e Maestro da mesma execução. Confirme serial/AVD, boot, portas, API/DB saudáveis e data local host/dispositivo. Para falhas de seletor, inspecione a hierarquia/captura e preserve a asserção funcional; não torne uma etapa crítica opcional.

A suíte cobre Android funcional e execução local. Não valida iOS, fidelidade visual, upload de fotos ou execução Android no CI.
