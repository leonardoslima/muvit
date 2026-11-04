"""Reserva local por card, compartilhada pelas worktrees do mesmo clone."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import socket
import subprocess
import sys


def git(*args: str) -> str:
    return subprocess.run(['git', *args], check=True, capture_output=True,
                          text=True, encoding='utf-8').stdout.strip()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['acquire', 'show', 'release'])
    parser.add_argument('--card', required=True)
    parser.add_argument('--run-id')
    args = parser.parse_args()
    card = args.card.upper()
    if not re.fullmatch(r'MUV-[1-9][0-9]*', card):
        parser.error('Use um identificador como MUV-15.')
    if args.action != 'show' and not (args.run_id and args.run_id.strip()):
        parser.error('--run-id é obrigatório para adquirir ou liberar a trava.')

    try:
        common = Path(git('rev-parse', '--path-format=absolute', '--git-common-dir'))
        path = common / 'muvit-autonomous' / 'locks' / f'{card}.json'
        if args.action == 'acquire':
            record = {
                'card': card,
                'run_id': args.run_id,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'host': socket.gethostname(),
                'worktree': str(Path(git('rev-parse', '--show-toplevel')).resolve()),
                'branch': git('branch', '--show-current') or 'HEAD',
                'lock_path': str(path),
            }
            path.parent.mkdir(parents=True, exist_ok=True)
            # O modo x usa criação exclusiva: nunca substitui uma reserva existente.
            with path.open('x', encoding='utf-8') as lock:
                json.dump(record, lock, ensure_ascii=False, indent=2)
                lock.write('\n')
        else:
            if not path.exists():
                if args.action == 'release':
                    raise ValueError('Trava ausente; nenhuma reserva foi liberada.')
                record = None
            else:
                record = json.loads(path.read_text(encoding='utf-8'))
                if args.action == 'release':
                    if not isinstance(record, dict) or record.get('run_id') != args.run_id:
                        raise ValueError('A trava pertence a outra rodada; preservada.')
                    path.unlink()
        print(json.dumps(record, ensure_ascii=False))
        return 0
    except FileExistsError:
        print(f'Card já reservado localmente: {path}. Consulte show; não sobrescreva.',
              file=sys.stderr)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        print(f'Falha na trava local; interrompa a tomada: {error}', file=sys.stderr)
    return 1


if __name__ == '__main__':
    sys.exit(main())
