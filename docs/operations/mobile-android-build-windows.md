# Build Android nativo em worktree Windows

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

O runner `pnpm.cmd mobile:e2e --scenario all --device <serial> --avd-name <nome-do-avd>` usa Expo Go e verifica as jornadas do aluno e professor com banco/API descartáveis. Ele não executa o APK nativo; registre separadamente build, instalação, abertura do APK com Metro e resultado do Maestro, incluindo o serial, no relatório da execução em `artifacts/<escopo>/<execucao>/`, conforme [qa-artifacts.md](qa-artifacts.md).
