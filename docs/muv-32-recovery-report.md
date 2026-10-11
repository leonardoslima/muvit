# MUV-32 — Recuperação forense do trabalho desaparecido

Investigação entregue em 10/10/2026, sob `run_fe50ede87603`, Task `task_2d66d0b62128`, Dispatch `ctx_437eec2e0286`. Ownership de escrita no repositório: somente este relatório. Não houve implementação, delegação, instalação, execução de testes, Metro, emulador, commit, push, PR, merge ou alteração no Linear por esta Dispatch.

## Resultado verificável

Foram recuperados **53 dos 54 arquivos** enumerados e hasheados pelo revisor histórico. Cada candidato final tem SHA-256 **idêntico byte a byte** ao registrado em `R:173`; há conteúdo completo de tokens, primitives, testes, configuração, manifesto mobile, spec, plano e harness. O conteúdo integral de `pnpm-lock.yaml` não foi recuperado. Isso recupera o snapshot inspecionado pelo revisor, não prova que a implementação estava aprovada ou que os checks passam atualmente.

Os candidatos permanecem em `C:/Users/Leonardo/AppData/Local/Temp/muv32-recovery-ctx437e/candidates/`. O manifest final está em `C:/Users/Leonardo/AppData/Local/Temp/muv32-recovery-ctx437e/candidate-manifest.json`, com caminho, origem/linha, tamanho, hash histórico, hash atual, hash da base e política de restauração. Os 53 arquivos foram relidos e hasheados depois da seleção final: **53/53 coincidências**. Nenhum candidato final contém conteúdo inferido sem confirmação pelo hash histórico.

O `.gitignore` mobile histórico também foi recuperado integralmente, mas contém regressão conhecida e está marcado `restore_default: false`. A restauração proposta inclui **52 arquivos**: cinco documentos e 47 arquivos mobile. O arquivo problemático é mantido somente como evidência.

O Pai informou em `msg_906ca1fda46e`, às 23:32:29 UTC, que preparou novamente o caminho `C:/Users/Leonardo/orca/workspaces/muvit/feat-muv-32-foundation-mobile-v2`, pela gestão nativa do Orca e a partir de `origin/develop` em `c4d3ab2`. Trata-se de **checkout novo preparado para restauração**, não de worktree ou snapshot sobrevivente. Esta Dispatch não escreveu nesse checkout.

## Fontes e proveniência

As transcrições abaixo foram parseadas como JSONL, preservando números de linha físicos. Foram examinados somente os campos necessários de chamadas, resultados, contextos e artefatos; comandos históricos foram tratados como evidência e não executados automaticamente. Os hashes são do arquivo JSONL integral, sem reproduzir seu conteúdo.

Diretório comum: `C:/Users/Leonardo/.codex/sessions/2026/10/09/`.

| Código | Fonte exata | SHA-256 da fonte |
| --- | --- | --- |
| L | `rollout-2026-10-09T14-26-17-01a121b3-8d13-73c1-a7cc-180aea1f80ef.jsonl` | `cf8c0fcf14676f3eb064ed41f16d37adb6ed32ee79eeb710771ec097f20c6514` |
| P | `rollout-2026-10-09T14-34-39-01a121bb-337d-70f2-ba68-32720b11c66b.jsonl` | `1919a8a347ba72dac6d49ce0458f27f3dbad0bb1d66f41701eef291ed5c0723a` |
| R | `rollout-2026-10-09T20-16-17-01a122f3-fa55-7af1-8346-9b3d415d5106.jsonl` | `5aa1635c06eba5412fe61591f34c76d1b43a1709613e6f03a69b183fb3bf6b6c` |

- `L:165` contém a spec e o plano completos; `L:188/211` contêm os geradores dos tokens/testes; `L:237/245` contêm pipeline e fontes; `L:315/622/745/765` contêm o harness e suas mudanças reais.
- `P:60–307` contém os patches das primitives, testes, licença, README e relatório especializado.
- `R:36` contém diff rastreado suficiente para reconstruir nove arquivos, incluindo `apps/mobile/package.json`. `R:46/55/121` preservam conteúdos completos de componentes, tokens e tsconfig; os recortes selecionados foram confirmados pelos hashes, evitando adivinhar limites entre arquivos concatenados.
- `R:173` contém **54 pares caminho/SHA-256**, além do estado tracked/untracked histórico. Essa lista é a referência independente de integridade para todos os candidatos.
- `manifest.json` no diretório temporário cataloga 47 chamadas/fragmentos de patch, com origem, linha, hash e resultado. Três fragmentos dependiam de dados dinâmicos; não são patches literais completos. As tentativas históricas `L:205`, `L:491`, `L:606` e `L:694` falharam e não devem ser reaplicadas como alterações reais.
- Uma reconstrução inicial por patches teve divergências de formatação/imports e tentativas intermediárias incompletas. Recortes completos posteriores e formatação determinística via stdin do Biome existente resolveram as divergências; somente resultados com hash histórico idêntico entraram no conjunto final. Os erros intermediários no manifest não são lacunas dos candidatos finais.
- Foram localizadas e examinadas de forma delimitada as transcrições `rollout-2026-10-09T14-48-34-01a121c7-f34f-7100-9f31-6e9bbe5f712c.jsonl` e `rollout-2026-10-09T20-08-42-01a122ed-08cc-71e0-b162-67e3e05d79bc.jsonl`; não forneceram snapshot integral adicional do lock. Não foram necessárias para selecionar os 53 candidatos exatos.

## Git, backups e limites da busca

No início, `git status --short` estava vazio e `git worktree list --porcelain` mostrava apenas o checkout principal e o Pai, ambos na base `c4d3ab2e6f36d2de81c527045487dd2723b00a6a`; não havia branch MUV-32. Posteriormente, o Pai registrou seu estado em `f1f3c4b` e anunciou a preparação do novo checkout MUV-32. Essas alterações concorrentes foram preservadas.

Foram executados `git for-each-ref`, `git stash list`, `git show` de arquivos da base e `git cat-file --batch-all-objects --batch-check`. Este último enumerou **4.770 objetos**; foram hasheados **23 blobs** na faixa compatível com o tamanho do lock da base, de 686.461 bytes, sem coincidência com o hash histórico do lock. O resultado está em `git-object-evidence.json`. A faixa não cobre objetos arbitrariamente menores/maiores nem arquivos externos ao Git; a ausência de correspondência não prova inexistência global. Não foi refeito o fsck de commits que o Pai já havia realizado, nem usados `--lost-found`, checkout, reset, prune ou coleta de lixo.

O caminho de dados do Orca foi descoberto no ambiente: `C:/Users/Leonardo/AppData/Roaming/orca`. Foram inspecionados, somente leitura:

- `profiles/local-default/orca-worktree-removals.json`: lista de remoções vazia, sem snapshot recuperável.
- `orca-workspace-cleanup-scan.json` e `orca-workspace-space-analysis.json`: inventários/metadados, sem conteúdo da worktree desaparecida.
- `profile-state.db` e cinco `profile-state.db.backup.*.db`, com SQLite `mode=ro` e `PRAGMA query_only=ON`. Os backups `1791601246809`, `1791611051659`, `1791625949652` e `1791641922772` preservam vínculos, lineage e sessões do caminho MUV-32; são metadados, sem código recuperável identificado. O backup `1791673968276` já não contém a worktree histórica. Nenhum banco foi atualizado.
- Na lixeira Windows do usuário foram lidos 15 registros de metadados `$I`; os itens relacionados ao Orca eram pacotes/skills, sem a worktree MUV-32. Nenhum item foi restaurado ou removido.

Esta busca foi delimitada aos caminhos descobertos, fontes indicadas, objetos Git e artefatos `TEMP/muv32*`; não houve varredura integral do disco, recuperação de blocos apagados ou alteração de recursos `user_owned`. A pedido do Pai, a busca do lock terminou nesse limite.

## Conteúdo ausente e dependências

O único arquivo do inventário histórico sem conteúdo integral é `pnpm-lock.yaml`, cujo hash esperado é `7f57a40b3926f58ff6034305bd74b90c5a90212bf5c5890e76efc83706e2814c`. `R:104` preserva evidência de diff de dependências com truncamento; `R:148` contém o diagnóstico do delta de importers/pacotes e metadados. Não existe candidato de lock aprovado para cópia, nem alegação de reprodução exata dele.

O manifesto mobile foi recuperado exatamente: NativeWind `4.2.7`, CSS Interop `0.2.7`, DM Sans `0.4.2`, Tailwind `3.4.17`, tailwind-merge `2.6.0`, SVG `15.12.1`, Lucide `^1.54.0`, clsx `^2.1.1`, Babel preset Expo `~54.0.0`, Expo `~54.0.37` e Constants `~18.0.14`. Os pacotes Slot/CVA experimentados inicialmente não constam no manifesto final. Não é necessário repetir escolhas de implementação para restaurar esse conteúdo.

`node_modules`, caches/exports, `.env` e demais arquivos ignorados não fazem parte dos 54 arquivos auditados e não foram recuperados como código. Pipeline NativeWind, Lucide/SVG, fontes e testes precisam de dependências compatíveis e de lock regenerado/controlado antes de serem executados. Ao retomar, o líder deve comparar o delta de lock com a base e controlar peers nos importers API/mobile; instalação não autoriza mudanças no manifesto API, downgrade de Sentry ou atualização ampla do SDK. Nenhuma instalação ou regeneração foi feita nesta investigação.

## Achados existentes e evidência histórica

Os seguintes problemas conhecidos continuam presentes no snapshot recuperado; integridade do arquivo não significa correção funcional:

1. **P2 — `.gitignore` removido:** o arquivo histórico contém somente `**/.expo/`, apagando regras anteriores de Android/iOS e arquivos de assinatura. `R:65/79` documenta o achado. Preservar/restaurar as regras da base e acrescentar apenas a exclusão necessária; não copiar o candidato histórico desse arquivo.
2. **P2 — Field/NumericField e `readOnly`:** `R:104` preserva a inspeção do TextInput real. O spread permite `readOnly={false}` interferir no bloqueio derivado de disabled/loading/editable; NumericField encaminha o conflito. A retomada deve reconciliar essas props e verificar especificamente a impossibilidade de edição nos estados bloqueados.
3. **P2 — contraste do spinner destrutivo:** `R:156/161` registra contraste aproximado de **1,054:1** entre spinner `#2F6B50` e fundo `#A83232` em IconButton destructive/loading. O spinner é o feedback visual restante; corrigir a cor de forma coerente com a variante.

Os artefatos em `C:/Users/Leonardo/AppData/Local/Temp/` foram lidos e seus hashes/tamanhos registrados em `historical-artifacts.json`. Os logs do PowerShell estavam em UTF-16 e foram decodificados sem reexecutar os comandos:

| Artefato histórico | Evidência lida | Limite |
| --- | --- | --- |
| `muv32-doctor-final.log` | 16/17; um check falhou | Dívida Sentry e diagnóstico já conhecido de falso positivo bottom-tabs; nenhum Doctor atual executado |
| `muv32-core-final.log` | 59 arquivos/500 testes; branches 86,9% | Evidência histórica, não validação do checkout novo |
| `muv32-ui-final.log` | 59 arquivos/500 testes; branches 86,19% | Evidência histórica, não validação do checkout novo |
| `muv32-primitives-test.log` | 3 arquivos/36 testes | Snapshot anterior à consolidação; não contradiz os 40 testes v2 citados na cápsula posterior |
| `muv32-maestro.log` | Fluxo principal termina com etapas de superfícies/screenshot concluídas | Não foi repetido |
| `muv32-maestro-320.log` | Falha na asserção `Valor digitado: Teste` após input e teclado | Não foi encontrada comprovação de conclusão desse cenário no artefato consultado; não assumir validação integral de 320 dp |
| `muv32-preview-fixed-bundle.js` | Bundle corrigido sobrevivente, 12.350.813 bytes, com catálogo de tokens | Código transformado é apoio forense, não substituto de fontes/lock |

## Restauração segura e incremental proposta

O menor próximo passo é o Pai preservar o pacote temporário e entregar ao líder original o manifest com os candidatos exatos. A implementação não precisa ser repetida; a retomada deve restaurar o conteúdo, corrigir os três achados e resolver o lock, mantendo sua Task original conforme a decisão do Pai.

Foi preparado `C:/Users/Leonardo/AppData/Local/Temp/muv32-recovery-ctx437e/restore-verified.ps1`. Ele exige checkout existente descendente da base, confere os hashes dos candidatos, rejeita caminhos fora do alvo e reparse points, recusa substituir conteúdo diferente da base ou do candidato e verifica hash depois da cópia. Exclui `.gitignore` e lock. Sem `-Apply`, só apresenta o plano. O alvo deve estar sob ownership exclusivo do líder durante a cópia; não há transação entre múltiplos arquivos.

Preview proposto, executável pelo Pai/líder no checkout novo:

```powershell
& 'C:/Users/Leonardo/AppData/Local/Temp/muv32-recovery-ctx437e/restore-verified.ps1' -TargetRepository 'C:/Users/Leonardo/orca/workspaces/muvit/feat-muv-32-foundation-mobile-v2' -Phase docs
& 'C:/Users/Leonardo/AppData/Local/Temp/muv32-recovery-ctx437e/restore-verified.ps1' -TargetRepository 'C:/Users/Leonardo/orca/workspaces/muvit/feat-muv-32-foundation-mobile-v2' -Phase mobile
```

Depois de revisar cada preview, `-Apply` permite a cópia daquela fase sob autoridade do Pai/líder. Nesta Dispatch foram executados somente previews no checkout do Pai: **5 documentos e 47 arquivos mobile**, sem escrita no alvo; a sintaxe PowerShell foi parseada sem erros. Não houve execução de `-Apply`.

Ordem sugerida: preservar candidatos/manifest; restaurar documentos; restaurar os 47 arquivos mobile; manter regras originais do `.gitignore`; corrigir readOnly/contraste; resolver instalação/lock com delta controlado; então executar apenas verificações adequadas aos arquivos restaurados e aos riscos corrigidos. Testes e Doctor atuais ficam a cargo da retomada, sem assumir os resultados históricos. `.env` ignorados devem ser copiados da origem conforme AGENTS antes de setup/testes/builds.

## Recursos, comandos e verificação desta investigação

Foram lidas integralmente `agent-orchestrator/SKILL.md` e `orca-dev-workflow/SKILL.md` como primeira ação, além das regras raiz/mobile e do guia Orca de orchestration. A skill de orchestrator foi aplicada sem delegação, conforme o dispatch; a política de implementação do workflow não ampliou o escopo forense.

Modelo/esforço desta Dispatch: herança da configuração do usuário solicitada; valores efetivos não expostos nos recibos examinados, estado **nao_exposto**, sem alegação de verificação. Contextos históricos expostos nos JSONL: líder `gpt-6.1-sol/high`, revisor `gpt-6-astra/high`, diagnóstico `gpt-6-astra/high`; esses dados descrevem aquelas sessões, não esta Dispatch nem um perfil especializado carregado.

Comandos usados: leituras com `Get-Content`/`rg`/`Get-ChildItem`; Git `status`, `worktree list`, `log`, `for-each-ref`, `stash list`, `rev-parse`, `show` e `cat-file`; Python para parsing JSONL, SQLite read-only, reconstrução somente em TEMP, comparação SHA-256 e inventário; Biome existente via stdin para formatar/organizar candidatos temporários; parser PowerShell e previews da restauração; mensagens/checkpoints/heartbeats/checks Orca. Não houve reexecução automática de comandos das transcrições.

Verificações finais: 53 hashes atuais iguais aos 53 hashes históricos; preview das duas fases; relatório em UTF-8 literal; busca de escapes Unicode nos arquivos produzidos; `git diff --check` limitado ao relatório; estado Git conferido para preservar alterações concorrentes. Esses checks verificam a recuperação documental e a integridade dos candidatos, não o funcionamento do produto.

## Inventário recuperado

Todos os itens abaixo têm integridade exata em relação a `R:173`. A origem detalhada de cada recorte/patch e a política de cópia estão no manifest; os hashes completos também estão aqui para preservar a referência fora de TEMP.

| Arquivo | SHA-256 histórico e recuperado |
| --- | --- |
| `apps/mobile/.gitignore` | `1206e1fd083ab7d61741c2d697c1058d02dc7612b3642f17ef36b629f60eb61e` |
| `apps/mobile/AGENTS.md` | `08bba1bd9e6b216b2af465850fb29aeb23ce8cd40d40281f3e3e7c3e9890dc87` |
| `apps/mobile/app.json` | `3638b34f6fb17c07fc2bb98501b421753ba80b58322298d4a62cb45c4519d032` |
| `apps/mobile/app/_layout.tsx` | `2e4e97b42d570c990010856a49348da38afd07f61e1b8fb5c6d0b932bb76fa30` |
| `apps/mobile/babel.config.js` | `20c72358814f80b37dc6438aa69994d73fcc5a01741690abecbcabcb06e35e0d` |
| `apps/mobile/global.css` | `cc1a7ad0d019ddb1d32d0ecb588ba0ac26ce41d8625dd6c366348b25f83a28ec` |
| `apps/mobile/metro.config.js` | `5a4e1b3c20859b797ba6c5f6b5e3f25c12f47e4b9822d47aceae9f27e2f2c355` |
| `apps/mobile/nativewind-env.d.ts` | `ba93dc3eac6e58df36919fd4905c4cf02cae566cbb7849c3e3de3451f8ac28ff` |
| `apps/mobile/package.json` | `2ce09951c108b05f03e5b17b690c350f706a1510f2ec420032cda95af11adb82` |
| `apps/mobile/src/__tests__/root-layout.test.tsx` | `ea3c0ddca42e1101c6ffd69e29693c1c4b29bdcd992df9a78b0d6212b57387ac` |
| `apps/mobile/src/components/ui/v2/LICENSE` | `827e94b16a81817363285cb5358987a93d7f34155750d525e3f674e65525fa4f` |
| `apps/mobile/src/components/ui/v2/README.md` | `b7a38a58e14ed4a3fd7633d8b4fd7c2f04e451ec1403b8ed77754bdc8c7fc5f3` |
| `apps/mobile/src/components/ui/v2/actions.test.tsx` | `658dcdb427984f7e6060c473f8e52eda97e8c170f03811e7f695130e992fafe6` |
| `apps/mobile/src/components/ui/v2/badge.tsx` | `e08d896d096de836191061ad83e0d9e77f2801db944be607a9f7db738e042bb6` |
| `apps/mobile/src/components/ui/v2/button.tsx` | `1a16efabc82174b5b0f1ba60b35ef235394d6e9ac9725bc35c632b55f351a122` |
| `apps/mobile/src/components/ui/v2/card.tsx` | `22506b8127f526c740cbd6f24745057a98a6a9b0ff647fc12cdd75e5d9ba82ca` |
| `apps/mobile/src/components/ui/v2/control.ts` | `29b0ed3180ff6db584a501c0c018ab113499b8c0806be479eae7282885e41ee1` |
| `apps/mobile/src/components/ui/v2/feedback.test.tsx` | `213ffa7acdbce8b441ebb7eb68af571c6430074b740a2222c60b57e0d7348400` |
| `apps/mobile/src/components/ui/v2/field.tsx` | `0370e0395edadb04a2df2f758b0ef8c633d5c31dbb52eb90da85188f37a2384d` |
| `apps/mobile/src/components/ui/v2/fields.test.tsx` | `b756200b3e68b8e598fc3d36de618794d06c342cfd40f8cc6d4c81f7572e0243` |
| `apps/mobile/src/components/ui/v2/header.tsx` | `0bf47bf1ef1b55b09a53ec3d0a4ec3bf72fe3de834020eb741c09dda678cc7f5` |
| `apps/mobile/src/components/ui/v2/icon-button.tsx` | `8de13300655a92ffb65b9267da3e1b64219ab58d57e931aef9dab8929e11a964` |
| `apps/mobile/src/components/ui/v2/index.ts` | `69ddf982cb8cbedcf1fc7637231035101e24eb4797ca856f7559957976e50777` |
| `apps/mobile/src/components/ui/v2/message.tsx` | `69008224a1bf4660fa9ccab67e34966a0f322d22ea1f4d3397d2b5cfa121dafe` |
| `apps/mobile/src/components/ui/v2/numeric-field.tsx` | `255b87defb6fb605f29d764fb3010a1db1005bc3e4571a3e2c69f0f84cb39335` |
| `apps/mobile/src/components/ui/v2/section-tab.tsx` | `e9bd49594f9c0d3cda3f23c0cede59929924b483daa8b408b1255b61b49d861e` |
| `apps/mobile/src/components/ui/v2/sheet-surface.tsx` | `b38742eff9ff605409ec775468ab9f45a3f823299cc9ac69a0a7c63d5724edd5` |
| `apps/mobile/src/components/ui/v2/skeleton.tsx` | `f2e260a3d43d12a61efa926d42e2084fe9f19adeb2bd235d5c6bbcee01373b1e` |
| `apps/mobile/src/components/ui/v2/state-panel.tsx` | `0654e724ddfcf95bd26930b45b00afbb6008d87dda8d2609134760c2b5e24612` |
| `apps/mobile/src/components/ui/v2/surface.tsx` | `4ba7e05d780caebec7544f771edbf839db1b54e2fa13469d10f8eca63351e62e` |
| `apps/mobile/src/components/ui/v2/text.tsx` | `67dcbf931f43198dc322d7aad2da444169cc4f7d146fdbdf68f70c0620d72ee8` |
| `apps/mobile/src/lib/design-system/cn.test.ts` | `21e5b7e93c19a23db2d8531100e00a97ba120a6520e0095252e40e9220ca0afe` |
| `apps/mobile/src/lib/design-system/cn.ts` | `d86ed37269779e6a8c3b25f89b6edbf51d752254f870a667bf9a9128bb3c594b` |
| `apps/mobile/src/lib/design-system/tokens.test.ts` | `e7ffcf2b50ec5fa3bf6b47a67410b24e2ece6c3c68b0e7db8fbd296f1a3ce16e` |
| `apps/mobile/src/lib/design-system/tokens.ts` | `7ec0b8bac0fc25c4241d5d3ae239c2c9487cec9a19795f25985e8ecd8f11e626` |
| `apps/mobile/tailwind.config.ts` | `59dd801f8a55b0ecc5406c09541c4167007294b7be77527e7f16fc3ec0e7bb4b` |
| `apps/mobile/test/foundation/app.json` | `89fd1c97672dada8f04233874997b3752d29120de1605a3dd0efe82f293c2a8e` |
| `apps/mobile/test/foundation/babel.config.js` | `8e2a6fed392560865136c878afb4ca18184ea1ff51cc578ed3f76ddf87921929` |
| `apps/mobile/test/foundation/entry.tsx` | `9c9796466983476af571a32f93679fe71263df04b859a0d3134907c677bdedac` |
| `apps/mobile/test/foundation/foundation.yaml` | `883e43965021c86fc756b1e52d5376a714afc8900c090daf957126ae96a9ca24` |
| `apps/mobile/test/foundation/metro.config.js` | `5d4fbd1ccf8b1661275924a9db019a4f487098ba68890be7d1f913bd627682e9` |
| `apps/mobile/test/foundation/package.json` | `403fa9083e42fd2ed81bc6f9a00f0c6d89a2909ceaf4d07e982ed937b80e3026` |
| `apps/mobile/test/foundation/tsconfig.json` | `2239fed9a23518da182918cbdcb8e689af7c44a15689b26ad4ebe4329ece34be` |
| `apps/mobile/test/react-native-svg.mock.ts` | `4597fd1deebd2dc5c892e6f481968213241226a3c83eeb99157fdb389e2ccdc8` |
| `apps/mobile/test/setup.ts` | `3ee81be463ea363144a0bc4c5350aa6e76633901cac076db2b3bd4e6b86e8c87` |
| `apps/mobile/vitest.config.ts` | `7a1f6dc750e6b76298629d6cdd7966254e3498d582be232af9d6ea2d90d6c795` |
| `apps/mobile/vitest.coverage.config.ts` | `3222a0bedd722d404c9007eecbbff16b69d392ef903ec9c4cec571791e6eb28e` |
| `apps/mobile/vitest.ui-coverage.config.ts` | `a690a40fd351b978d827d13cf14c943da4ab1aab591beed5607c0059a0189d07` |
| `docs/muv-32-execution-ledger.md` | `6e2fe673b0b423860a83883f732e63c618753a29790af91903a23191d199ae0e` |
| `docs/muv-32-primitives-report.md` | `4fe3a09d5eadd7d59573e04ecf9da20321adde2cdb49c122d1f5f379a329a225` |
| `docs/muv-32-review-job-capsule.md` | `ef4e3faa9e42f559a88a07d1f16a412c9f2fcdde6d7356511d73e6ddbf99aca4` |
| `docs/superpowers/plans/2026-10-09-muv-32-foundation-mobile-v2.md` | `bd120dd82a1370e7a3316b8af65196a46e2f9f9e786ee3d5ab0ab60de6bbe188` |
| `docs/superpowers/specs/2026-10-09-muv-32-foundation-mobile-v2-design.md` | `da176bfba263951a641df69665f68640ebef101b1acc279d414ac873c154ac57` |

Pacote de transferência preservado pelo Pai: `C:/Users/Leonardo/orca/recovery/muv-32/muv32-recovery-verified.zip`. O pacote contém os 53 candidatos, manifests, evidência selecionada, script de preview/restauração e cópia deste relatório; não depende de arquivos temporários para a continuidade.
