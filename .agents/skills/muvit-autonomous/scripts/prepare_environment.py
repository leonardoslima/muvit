"""Prepara, consulta, para e remove recursos exclusivos de uma rodada."""
import argparse
import json
import os
from pathlib import Path
import re
import secrets
import socket
import subprocess
import sys
import time
from typing import Callable

from environment_lifecycle import (
    active_avd, assert_avd, assert_container, assert_launchable, cleanup, inspect_resources,
    resource_identity, validate_state,
)


def command(args: list[str], *, cwd: Path | None = None, input_text: str | None = None,
            check: bool = True) -> str:
    result = subprocess.run(args, cwd=cwd, input=input_text, capture_output=True,
                            text=True, encoding='utf-8', errors='replace', timeout=90)
    if check and result.returncode:
        # Não imprimir argumentos/saídas que possam conter credenciais Docker.
        raise RuntimeError(f'{Path(args[0]).name}: exit {result.returncode}')
    return result.stdout.strip()


def wait_until(check: Callable[[], bool], description: str, seconds: int = 180) -> None:
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        if check():
            return
        time.sleep(2)
    raise RuntimeError(f'Tempo limite: {description}')


def available_port(port: int) -> bool:
    try:
        with socket.socket() as connection:
            connection.bind(('127.0.0.1', port))
        return True
    except OSError:
        return False


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', nargs='?', default='prepare',
                        choices=['prepare', 'run-android', 'status', 'stop', 'remove'])
    parser.add_argument('--card', required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--backend', action='store_true')
    parser.add_argument('--android', action='store_true')
    parser.add_argument('--system-image')
    parser.add_argument('--apply', action='store_true', help='Sem esta opção, apenas exibe o plano.')
    parser.add_argument('--delete-data', action='store_true', help='Permite remove excluir banco e AVD parados.')
    args = parser.parse_args()
    if not re.fullmatch(r'MUV-[1-9][0-9]*|ambiente-spike', args.card):
        parser.error('Card inválido; para o teste use ambiente-spike.')
    if not re.fullmatch(r'[a-zA-Z0-9-]{1,48}', args.run_id):
        parser.error('run-id inválido.')
    if args.action == 'prepare' and not (args.backend or args.android):
        parser.error('Indique --backend e/ou --android.')
    if args.action != 'prepare' and (args.backend or args.android or args.system_image):
        parser.error('Somente prepare aceita seletores de recursos; as demais ações usam o estado.')
    if args.delete_data and args.action != 'remove':
        parser.error('--delete-data só é válido com remove.')
    if args.action == 'remove' and args.apply and not args.delete_data:
        parser.error('Remoção exige --apply --delete-data e recursos já parados.')
    if args.action == 'status' and args.apply:
        parser.error('status é somente leitura; não use --apply.')
    root = Path(command(['git', 'rev-parse', '--show-toplevel'])).resolve()
    if Path.cwd().resolve() != root:
        parser.error('Execute a partir da raiz da worktree.')
    folder = root / 'artifacts' / args.card.lower() / args.run_id / 'environment'
    state_path = folder / 'state.json'
    request = {'root': str(root), 'card': args.card, 'run_id': args.run_id,
               'backend': args.backend, 'android': args.android, 'system_image': args.system_image}
    if folder.resolve() != folder or not folder.resolve().is_relative_to(root):
        raise RuntimeError('Diretório de recursos redirecionado para fora do escopo.')
    if state_path.is_symlink():
        raise RuntimeError('Estado não pode ser um link simbólico.')
    state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else None
    if state is not None:
        validate_state(state, root, folder, args.card, args.run_id)
        if args.action == 'prepare' and state['request'] != request:
            raise RuntimeError('Estado existente pertence a outra configuração.')
        request = state['request']
    elif args.action != 'prepare':
        raise RuntimeError('Estado ausente; nenhum recurso será adotado por nome.')
    identity, name = resource_identity(request)
    if not args.apply and args.action != 'status':
        print(json.dumps({'action': args.action, 'request': request, 'name': name,
                          'state': str(state_path), 'apply': False}, ensure_ascii=False))
        return 0
    if request['backend'] and args.action != 'run-android':
        command(['docker', 'version', '--format', '{{.Server.Version}}'])
        if args.action == 'prepare':
            command(['docker', 'image', 'inspect', 'postgres:16-alpine'])
    sdk = (Path(os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
                or str(Path.home() / 'AppData/Local/Android/Sdk')) if request['android'] else root)
    adb = sdk / 'platform-tools/adb.exe'
    emulator = sdk / 'emulator/emulator.exe'
    managers = sorted(sdk.glob('cmdline-tools/*/bin/avdmanager.bat'))
    avd_home = (Path(os.environ.get('ANDROID_AVD_HOME') or
                    str(Path(os.environ.get('ANDROID_USER_HOME') or str(Path.home() / '.android')) / 'avd')).resolve()
                if request['android'] else root)
    tools = {'adb': str(adb), 'avdmanager': str(managers[-1]) if managers else '', 'avd_home': avd_home}
    if request['android']:
        if not managers or not adb.is_file() or not emulator.is_file():
            raise RuntimeError('SDK Android incompleto.')
        if args.action == 'prepare':
            if not args.system_image or not re.fullmatch(r'system-images;android-[0-9.]+;[a-zA-Z0-9_]+;[a-zA-Z0-9_]+', args.system_image):
                raise RuntimeError('Informe explicitamente uma system-image já instalada.')
            if not (sdk.joinpath(*args.system_image.split(';')) / 'package.xml').is_file():
                raise RuntimeError('System-image não instalada; não será baixada automaticamente.')
        command([str(adb), 'start-server'], cwd=Path.home())
    if args.action == 'status':
        live = inspect_resources(state, folder, tools, command)
        live['android_booted'] = bool(live.get('serial') and command([
            str(adb), '-s', live['serial'], 'shell', 'getprop', 'sys.boot_completed']) == '1')
        print(json.dumps(live, ensure_ascii=False, indent=2))
        return 0
    folder.mkdir(parents=True, exist_ok=True)
    lock_path = folder / 'prepare.lock'
    with lock_path.open('x', encoding='utf-8') as lock:
        lock.write(str(os.getpid()))
    lock_held = True
    try:
        # Releitura sob trava impede uso de estado alterado por outra operação.
        state = json.loads(state_path.read_text(encoding='utf-8')) if state_path.exists() else {
            'schema_version': 2, 'request': request, 'identity': identity, 'name': name}
        validate_state(state, root, folder, args.card, args.run_id)
        if state['request'] != request:
            raise RuntimeError('Configuração alterada durante a preparação.')

        def save() -> None:
            temporary = state_path.with_suffix('.tmp')
            if temporary.is_symlink() or state_path.is_symlink():
                raise RuntimeError('Arquivo de estado redirecionado; escrita recusada.')
            temporary.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding='utf-8')
            temporary.replace(state_path)

        if args.action in ('stop', 'remove'):
            live = cleanup(args.action, state, folder, tools, command)
            state.pop('provisioned', None)
            state['prepared'] = args.action == 'stop' and state.get('prepared', False)
            state['last_action'] = args.action
            state['launch_pending'] = False
            state['observed'] = live
            save()
            print(json.dumps({'action': args.action, 'verified': True, 'observed': live}, ensure_ascii=False, indent=2))
            return 0
        if args.action == 'run-android':
            if not request['android'] or state.get('last_action') == 'remove':
                raise RuntimeError('Rodada sem AVD preparado ou já removida.')
            if not assert_avd(state, folder, avd_home):
                raise RuntimeError('AVD ausente; execute prepare antes de run-android.')
            if active_avd(state, str(adb), command):
                raise RuntimeError('Emulador da rodada já está ativo; não será duplicado.')
            assert_launchable(state)
            port = state.get('emulator_port')
            if not port or not (available_port(port) and available_port(port + 1)):
                raise RuntimeError('Portas do emulador indisponíveis; recursos preservados.')
            state['launch_pending'] = True
            save()
            # Filho em primeiro plano: herda console/saídas e permanece supervisionado
            # por este processo. Sem shell, detach, janela ou dependência do host.
            child = subprocess.Popen([str(emulator), '-avd', name, '-port', str(port),
                                      '-no-snapshot', '-no-boot-anim'], cwd=root)
            state['emulator_pid'] = child.pid
            save()
            lock_path.unlink()
            lock_held = False
            return child.wait()
        state.pop('provisioned', None)
        state['prepared'] = False
        save()
        if state.get('last_action') == 'remove':
            raise RuntimeError('Rodada removida; use outro run-id para um ambiente novo.')
        if args.backend:
            existing = command(['docker', 'ps', '-aq', '--filter', f'name=^/{name}$'])
            if existing:
                info = json.loads(command(['docker', 'inspect', name]))[0]
                assert_container(info, state)
                if not info['State']['Running']:
                    command(['docker', 'start', name])
            else:
                child_env = os.environ.copy()
                child_env['POSTGRES_PASSWORD'] = secrets.token_hex(24)
                result = subprocess.run(['docker', 'run', '-d', '--name', name,
                                         '--label', f'muvit.environment={identity}',
                                         '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=muvit',
                                         '-e', 'POSTGRES_DB=muvit_test',
                                         '-p', '127.0.0.1::5432', 'postgres:16-alpine'],
                                        env=child_env, capture_output=True, timeout=90)
                if result.returncode:
                    raise RuntimeError('Falha criando PostgreSQL; recursos preservados.')
                state['container_id'] = result.stdout.decode('utf-8').strip()
            state['container'] = name
            save()
            wait_until(lambda: command(['docker', 'exec', name, 'pg_isready', '-U', 'muvit', '-d', 'muvit_test'], check=False).endswith('accepting connections'), 'PostgreSQL', 60)
            state['db_binding'] = command(['docker', 'port', name, '5432/tcp'])
            state['database_check'] = command(['docker', 'exec', name, 'psql', '-U', 'muvit', '-d', 'muvit_test', '-Atc', 'select 1'])
            save()
        if args.android:
            # ADB compartilhado nasce fora da worktree; nunca executar kill-server.
            avds = command([str(emulator), '-list-avds']).splitlines()
            avd_exists = assert_avd(state, folder, avd_home)
            if (name in avds) != avd_exists:
                raise RuntimeError('Lista de AVDs diverge do registro local.')
            if name not in avds:
                state['avd_reserved'] = True
                state['avd_path'] = str(folder / 'avd')
                state['avd_home'] = str(avd_home)
                marker = folder / 'avd-owner.json'
                if marker.is_symlink():
                    raise RuntimeError('Marcador AVD redirecionado.')
                marker.write_text(json.dumps({'identity': identity, 'path': state['avd_path']}), encoding='utf-8')
                save()
                command([str(managers[-1]), 'create', 'avd', '-n', name, '-k', args.system_image,
                         '-p', str(folder / 'avd')], input_text='no\n')
                assert_avd(state, folder, avd_home)
            if not state.get('emulator_port'):
                port = next((candidate for candidate in range(5554, 5682, 2)
                             if available_port(candidate) and available_port(candidate + 1)), None)
                if not port:
                    raise RuntimeError('Sem portas livres para o emulador.')
                state['emulator_port'] = port
            state['android_launch'] = [sys.executable, '-B', '-X', 'utf8', str(Path(__file__).resolve()),
                                       'run-android', '--card', args.card, '--run-id', args.run_id, '--apply']
            save()
        state['prepared'] = True
        state['last_action'] = 'prepare'
        save()
        print(json.dumps(state, ensure_ascii=False, indent=2))
        return 0
    finally:
        if lock_held:
            lock_path.unlink()


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (RuntimeError, OSError, subprocess.SubprocessError, ValueError) as error:
        print(f'BLOQUEADO: {error}', file=sys.stderr)
        sys.exit(1)
