"""Ownership e encerramento restrito aos recursos de uma rodada."""
import hashlib
import json
from pathlib import Path
import re
import time
from typing import Callable


def resource_identity(request: dict) -> tuple[str, str]:
    identity = hashlib.sha256(
        f"{request['root']}|{request['card']}|{request['run_id']}".encode()
    ).hexdigest()[:12]
    return identity, f'muvit-env-{identity}'


def assert_launchable(state: dict) -> None:
    if state.get('launch_pending'):
        raise RuntimeError('Lançamento Android anterior incerto; reconciliar antes de relançar.')


def validate_state(state: dict, root: Path, folder: Path, card: str, run_id: str) -> None:
    expected = root / 'artifacts' / card.lower() / run_id / 'environment'
    if folder.resolve() != expected or not folder.resolve().is_relative_to(root.resolve()):
        raise RuntimeError('Diretório de recursos fora do escopo da worktree.')
    if not isinstance(state, dict) or not isinstance(state.get('request'), dict):
        raise RuntimeError('Formato de estado inválido.')
    request = state['request']
    if (state.get('schema_version') != 2 or request.get('root') != str(root)
            or request.get('card') != card or request.get('run_id') != run_id):
        raise RuntimeError('Estado legado, incompleto ou de outra rodada; não será adotado.')
    identity, name = resource_identity(request)
    if state.get('identity') != identity or state.get('name') != name:
        raise RuntimeError('Identidade de recursos divergente.')
    if not isinstance(request.get('backend'), bool) or not isinstance(request.get('android'), bool):
        raise RuntimeError('Seleção de recursos inválida no estado.')
    if not (request['backend'] or request['android']):
        raise RuntimeError('Estado sem recursos declarados.')


def assert_container(info: dict, state: dict) -> None:
    labels = info.get('Config', {}).get('Labels') or {}
    if (not state.get('container_id') or info.get('Id') != state['container_id']
            or info.get('Name') != '/' + state['name']
            or state.get('container') != state['name']
            or labels.get('muvit.environment') != state['identity']):
        raise RuntimeError('Ownership Docker incompleto ou recurso substituído.')


def assert_avd(state: dict, folder: Path, avd_home: Path) -> bool:
    expected = folder / 'avd'
    if expected.resolve() != expected or not expected.resolve().is_relative_to(folder.resolve()):
        raise RuntimeError('Caminho AVD redirecionado ou fora do escopo.')
    ini = avd_home / f"{state['name']}.ini"
    if not ini.exists() and not expected.exists():
        return False
    if (state.get('avd_reserved') is not True or state.get('avd_path') != str(expected)
            or state.get('avd_home') != str(avd_home)):
        raise RuntimeError('Recibo de criação AVD incompleto.')
    marker_path = folder / 'avd-owner.json'
    if marker_path.is_symlink() or ini.is_symlink():
        raise RuntimeError('Registro/marcador AVD redirecionado.')
    marker = json.loads(marker_path.read_text(encoding='utf-8'))
    if marker != {'identity': state['identity'], 'path': str(expected)}:
        raise RuntimeError('Marcador de ownership AVD divergente.')
    if not ini.is_file() or not expected.is_dir():
        raise RuntimeError('AVD parcialmente criado/removido; requer reconciliação manual.')
    config = dict(line.split('=', 1) for line in ini.read_text(encoding='utf-8').splitlines()
                  if '=' in line)
    if Path(config.get('path', '')).resolve() != expected:
        raise RuntimeError('Registro do SDK aponta para outro diretório; exclusão recusada.')
    return True


def active_avd(state: dict, adb: str, invoke: Callable[..., str]) -> str | None:
    devices = invoke([adb, 'devices'])
    own = None
    expected_serial = f"emulator-{state.get('emulator_port')}"
    for line in devices.splitlines():
        parts = line.split()
        if not parts or not re.fullmatch(r'emulator-[0-9]+', parts[0]):
            continue
        serial = parts[0]
        if len(parts) < 2 or parts[1] != 'device':
            raise RuntimeError('Emulador offline/indeterminado; cleanup bloqueado.')
        names = invoke([adb, '-s', serial, 'emu', 'avd', 'name']).splitlines()
        if not names or names[-1] != 'OK':
            raise RuntimeError('Não foi possível comprovar o nome do AVD ativo.')
        name = names[0]
        if serial == expected_serial and name != state['name']:
            raise RuntimeError('Serial da rodada ocupado por outro AVD.')
        if name == state['name']:
            if own or serial != expected_serial:
                raise RuntimeError('AVD ativo com serial inesperado ou duplicado.')
            own = serial
    return own


def inspect_resources(state: dict, folder: Path, tools: dict,
                      invoke: Callable[..., str]) -> dict:
    result = {'container_running': False, 'container_id': None,
              'serial': None, 'avd_exists': False}
    if state['request']['backend']:
        found = invoke(['docker', 'ps', '-aq', '--no-trunc', '--filter', f"name=^/{state['name']}$"])
        if found:
            rows = json.loads(invoke(['docker', 'inspect', state['name']]))
            if len(rows) != 1:
                raise RuntimeError('Resultado Docker ambíguo.')
            info = rows[0]
            assert_container(info, state)
            result['container_id'] = info['Id']
            result['container_running'] = info['State']['Running']
    if state['request']['android']:
        result['avd_exists'] = assert_avd(state, folder, tools['avd_home'])
        result['serial'] = active_avd(state, tools['adb'], invoke)
        if result['serial'] and not result['avd_exists']:
            raise RuntimeError('AVD ativo sem registro de ownership completo.')
    return result


def cleanup(action: str, state: dict, folder: Path, tools: dict,
            invoke: Callable[..., str]) -> dict:
    if action not in ('stop', 'remove'):
        raise RuntimeError('Ação de cleanup inválida.')
    # Primeiro conferir todos: um AVD alheio bloqueia inclusive a parada do banco.
    before = inspect_resources(state, folder, tools, invoke)
    if action == 'remove' and (before['container_running'] or before['serial']):
        raise RuntimeError('Recursos ativos; execute stop antes de remove.')
    if action == 'stop':
        if before['serial']:
            invoke([tools['adb'], '-s', before['serial'], 'emu', 'kill'])
            deadline = time.monotonic() + 30
            while before['serial'] in invoke([tools['adb'], 'devices']).split():
                if time.monotonic() >= deadline:
                    raise RuntimeError('Emulador não encerrou; recursos restantes preservados.')
                time.sleep(1)
        if before['container_running']:
            invoke(['docker', 'stop', before['container_id']])
    else:
        if before['avd_exists']:
            # Revalidar caminho imediatamente antes da exclusão recursiva pelo SDK.
            assert_avd(state, folder, tools['avd_home'])
            invoke([tools['avdmanager'], 'delete', 'avd', '-n', state['name']])
        if before['container_id']:
            current = inspect_resources(state, folder, tools, invoke)
            if current['container_running'] or current['serial']:
                raise RuntimeError('Recurso reiniciado durante cleanup; remoção interrompida.')
            if current['container_id']:
                invoke(['docker', 'rm', '--volumes', current['container_id']])
    after = inspect_resources(state, folder, tools, invoke)
    if after['serial'] or after['container_running']:
        raise RuntimeError('Encerramento não comprovado.')
    if action == 'remove' and (after['container_id'] or after['avd_exists']):
        raise RuntimeError('Remoção não comprovada.')
    return after
