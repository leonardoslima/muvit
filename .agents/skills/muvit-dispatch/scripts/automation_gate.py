"""Confere vagas Orca e a reserva local antes de lançar um coordenador."""
import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import subprocess
import sys


MAX_AGENTS = 4
MAX_ROUNDS_PER_RUN = 2


def evaluate(snapshot: object, repo_id: str, started: int,
             expected_path: str | None = None) -> dict[str, object]:
    decision: dict[str, object] = {
        'allowed': False, 'reason': 'incomplete_snapshot',
        'live_agents': None, 'started_rounds': started,
    }
    if started < 0 or started >= MAX_ROUNDS_PER_RUN:
        decision['reason'] = 'run_limit'
        return decision
    if not isinstance(snapshot, dict) or snapshot.get('ok') is not True:
        return decision
    result = snapshot.get('result')
    if not isinstance(result, dict) or result.get('truncated') is not False:
        return decision
    scope = result.get('hostScope')
    if not isinstance(scope, dict) or scope.get('omittedHostIds') != []:
        return decision
    if not isinstance(scope.get('hostIds'), list) or not scope['hostIds']:
        return decision
    worktrees = result.get('worktrees')
    if not isinstance(worktrees, list):
        return decision
    live_agents = 0
    matched_repo = False
    matched_path = expected_path is None
    for worktree in worktrees:
        if not isinstance(worktree, dict) or not isinstance(worktree.get('repoId'), str):
            return decision
        if worktree['repoId'] != repo_id:
            continue
        matched_repo = True
        path = worktree.get('path')
        if isinstance(path, str) and expected_path is not None:
            matched_path |= path.replace('\\', '/').casefold() == expected_path.replace('\\', '/').casefold()
        agents = worktree.get('agents')
        if not isinstance(agents, list) or not all(isinstance(agent, dict) for agent in agents):
            return decision
        live_agents += sum(agent.get('state') not in {'done', 'exited'} for agent in agents)
        if worktree.get('unverifiableTerminalCount', 0):
            return decision
    if not matched_repo or not matched_path:
        decision['reason'] = 'repo_mismatch'
        return decision
    decision['live_agents'] = live_agents
    if live_agents + 2 > MAX_AGENTS:
        decision['reason'] = 'insufficient_capacity'
        return decision
    decision['allowed'] = True
    decision['reason'] = 'capacity_available'
    return decision


def check_lock(card: str, run_id: str) -> bool:
    common = subprocess.run(
        ['git', 'rev-parse', '--path-format=absolute', '--git-common-dir'],
        check=True, capture_output=True, text=True, encoding='utf-8',
    ).stdout.strip()
    path = Path(common) / 'muvit-autonomous' / 'locks' / f'{card}.json'
    record = json.loads(path.read_text(encoding='utf-8'))
    return isinstance(record, dict) and record.get('card') == card and record.get('run_id') == run_id


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--repo-id', required=True)
    parser.add_argument('--card', required=True)
    parser.add_argument('--run-id', required=True)
    parser.add_argument('--started', type=int, required=True)
    parser.add_argument('--report', type=Path, required=True)
    parser.add_argument('--orca-command', default=os.environ.get('ORCA_CLI_COMMAND', 'orca'))
    args = parser.parse_args()
    if not re.fullmatch(r'MUV-[1-9][0-9]*', args.card):
        parser.error('--card deve ter formato MUV-42')
    record: dict[str, object] = {
        'checked_at': datetime.now(timezone.utc).isoformat(),
        'card': args.card, 'started_rounds': args.started,
        'allowed': False, 'reason': 'gate_error',
    }
    try:
        response = subprocess.run(
            [args.orca_command, 'worktree', 'ps', '--limit', '10000', '--json'],
            check=True, capture_output=True, text=True, encoding='utf-8',
        )
        record.update(evaluate(json.loads(response.stdout), args.repo_id,
                               args.started, str(Path.cwd())))
        if record['allowed'] and not check_lock(args.card, args.run_id):
            record['allowed'] = False
            record['reason'] = 'lock_mismatch'
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        record['allowed'] = False
        record['reason'] = 'gate_error'
        record['error_type'] = type(error).__name__
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(record, ensure_ascii=False))
    return 0 if record['allowed'] else 1


if __name__ == '__main__':
    sys.exit(main())
