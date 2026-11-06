# Build Android nativo em worktree Windows

## Mitigação para worktree longa já existente

Quando não for possível usar caminho curto, o plugin Expo versionado `apps/mobile/plugins/with-windows-long-paths.js` ajusta autolinking, codegen e CMake durante o prebuild. A mitigação só é ativada com `MUVIT_WORKSPACE_ALIAS` e `MUVIT_NATIVE_ROOT`; ela mantém `node_modules` e o virtual store na worktree e usa um alias para acessar os mesmos arquivos. Confira que a letra escolhida está livre antes de executar `subst`. Em builds simultâneos na mesma máquina, reserve uma letra diferente por worktree e mantenha as variáveis no processo de cada build; duas worktrees não podem compartilhar o mesmo alias. O plugin exige alias absoluto para esta worktree e staging absoluto no diretório reservado `apps/mobile/android/.cxx-muvit`; também verifica os destinos e caminhos existentes dos módulos para rejeitar redirecionamentos por junction ou link. Use `R:/` ou `R:\` como alias de uma unidade mapeada; `R:` é relativo à unidade e será rejeitado.

Na raiz da worktree, escolha uma letra livre e um diretório de staging exclusivo dentro do Android gerado, confirme nome, serial e boot do AVD próprio e execute:

```powershell
if (Get-PSDrive -Name R -ErrorAction SilentlyContinue) { throw 'R: já está em uso' }
subst R: "$PWD"
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível reservar R:' }
$env:MUVIT_WORKSPACE_ALIAS = 'R:/'
$env:MUVIT_NATIVE_ROOT = 'R:/apps/mobile/android/.cxx-muvit'
$env:ANDROID_SERIAL = '<serial-do-avd-confirmado>'
pnpm.cmd --dir apps/mobile exec expo prebuild --platform android --no-install
pnpm.cmd mobile:android:build --device <nome-do-avd-confirmado> --no-bundler
```

Ao terminar, remova o alias somente após conferir que `subst` ainda o associa a esta worktree: `subst R: /D`. Não remova nem reutilize aliases alheios. As variáveis são locais ao processo e devem ser definidas novamente em builds com a mitigação; em outros ambientes o plugin não ativa os ajustes. O autolinking regenera o CMake a cada build para restaurar os caminhos físicos quando o alias deixa de ser usado. Após o prebuild, `pnpm.cmd mobile:test:android-paths` executa no Windows as regressões de caminhos, junctions e alternância de alias usando o Gradle gerado. Após alterar versões Expo, React Native ou Gradle, valide novamente o build nativo, pois a mitigação depende dos pontos de integração dessas ferramentas. Avisos de comprimento de objeto não comprovam sucesso: confira resultado, APK e instalação.

Use uma worktree Orca de caminho curto, como `C:\Dev\orca-wt\muv-42-pendencias`, para limitar os caminhos gerados por pnpm e CMake. O build antigo da MUV-36 falhou em uma worktree longa durante `app:assembleDebug`; um alias `subst` isolado não é uma correção confiável porque o autolinking pode manter os caminhos absolutos originais. Crie a worktree no caminho curto antes da instalação das dependências. Não copie `node_modules` nem os diretórios `.cxx` de outra worktree.

Execute da raiz da worktree, depois de copiar os `.env` locais ignorados conforme o `AGENTS.md`:

```powershell
pnpm.cmd install --frozen-lockfile
pnpm.cmd --dir apps/mobile exec expo prebuild --platform android --no-install
$env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA 'Android\Sdk' # ajuste ao SDK instalado
$env:NODE_ENV = 'development'
$sdk = $env:ANDROID_HOME.Replace('\', '/')
"sdk.dir=$sdk" | Set-Content apps/mobile/android/local.properties
& .\apps\mobile\android\gradlew.bat -p .\apps\mobile\android :app:assembleDebug --no-daemon
Test-Path apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

`apps/mobile/android` e `local.properties` são gerados e ignorados pelo Git. A versão de Ninja fornecida por `Android/Sdk/cmake/3.22.1/bin/ninja.exe` deve ser conferida quando houver falha em CMake/Ninja; não substitua binários do SDK nem aumente timeouts sem reproduzir a causa. Avisos `CMAKE_OBJECT_PATH_MAX` indicam risco de caminho e não comprovam falha: exija `BUILD SUCCESSFUL` e o APK antes de concluir.

Instale somente em um AVD dedicado cujo serial e nome foram confirmados:

```powershell
adb devices -l
adb -s <serial> emu avd name
adb -s <serial> shell getprop sys.boot_completed
adb -s <serial> install -r apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
adb -s <serial> shell monkey -p com.anonymous.muvit 1
```

O `monkey` comprova apenas que a atividade nativa abre. Para validar a inicialização JavaScript e a interface, inicie o Metro da mesma worktree em outro terminal, configure `adb -s <serial> reverse tcp:8081 tcp:8081` e abra no development client a URL indicada pelo Metro:

```powershell
pnpm.cmd --dir apps/mobile exec expo start --dev-client --localhost --port 8081
```

O runner `pnpm mobile:e2e --scenario all --mode android --device <serial> --avd-name <nome-do-avd>` usa um development build já instalado e verifica as jornadas com banco/API descartáveis. Registre build, instalação, abertura do APK com Metro e resultado do Maestro, incluindo o serial, no relatório da execução em `artifacts/<escopo>/<execucao>/`, conforme [qa-artifacts.md](qa-artifacts.md).

Mantenha o virtual store do pnpm dentro da worktree. O Metro precisa incluí-lo em `watchFolders` e o manifesto deve apontar para a entrada local `apps/mobile/index.js`, que carrega `expo-router/entry`. Após alterar `metro.config.js` ou a entrada, reinicie o Metro da própria worktree e confirme o manifesto, o bundle Android e a tela no development build; uma resposta `/status` não comprova o carregamento JavaScript.
