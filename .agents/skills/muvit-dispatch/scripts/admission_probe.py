"""Resume em leitura os candidatos Linear e as sessões Orca da automação Muvit."""
import argparse
import json
import os
import re
import subprocess
import sys


WORKSPACE_ID = '18309e87-272d-4c09-aa18-ed1711c84dcf'


def required_text(fields: object, key: str) -> str:
    value = fields.get(key) if isinstance(fields, dict) else None
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f'Dados incompletos do Linear: {key}.')
    return value


def summarize_linear(response: object, workspace_id: str) -> dict[str, object]:
    if not isinstance(response, dict) or response.get('ok') is not True:
        raise ValueError('Consulta Linear falhou.')
    result = response.get('result')
    if not isinstance(result, dict) or result.get('truncated') is not False:
        raise ValueError('Consulta Linear truncada ou inválida.')
    meta = result.get('meta')
    if (not isinstance(meta, dict) or meta.get('partial') is not False
            or meta.get('hasMore') is not False or meta.get('workspaceErrors') != []
            or meta.get('limit', False) is not None):
        raise ValueError('Consulta Linear parcial ou com páginas pendentes.')
    if meta.get('workspaceId') != workspace_id:
        raise ValueError('Workspace divergente na consulta Linear.')
    issues = result.get('issues')
    if not isinstance(issues, list) or type(meta.get('returned')) is not int or meta['returned'] != len(issues):
        raise ValueError('Contagem de cards divergente na consulta Linear.')
    candidates: list[dict[str, object]] = []
    excluded: list[dict[str, str]] = []
    assignee_ids: set[str] = set()
    for issue in issues:
        identifier = required_text(issue, 'identifier')
        issue_id = required_text(issue, 'id')
        if required_text(issue.get('workspace'), 'id') != workspace_id:
            raise ValueError(f'Workspace divergente no card {identifier}.')
        team_key = required_text(issue.get('team'), 'key')
        state = issue.get('state')
        state_name = required_text(state, 'name')
        state_type = required_text(state, 'type')
        state_id = required_text(state, 'id')
        if 'assignee' not in issue:
            raise ValueError(f'Responsável ausente da leitura do card {identifier}.')
        assignee_id = None if issue['assignee'] is None else required_text(issue['assignee'], 'id')
        if assignee_id is not None:
            assignee_ids.add(assignee_id)
        reason = None
        if team_key != 'MUV' or not re.fullmatch(r'MUV-[1-9][0-9]*', identifier):
            reason = 'outro_time'
        elif state_name != 'Todo' or state_type != 'unstarted':
            reason = 'estado_inelegivel'
        elif assignee_id is None:
            reason = 'sem_responsavel'
        if reason:
            excluded.append({'identifier': identifier, 'reason': reason})
            continue
        candidates.append({
            'identifier': identifier,
            'issue_id': issue_id,
            'title': issue.get('title'),
            'priority': issue.get('priority'),
            'state': state_name,
            'state_id': state_id,
            'assignee_id': assignee_id,
        })
    if len(assignee_ids) > 1:
        raise ValueError('Filtro assignee me retornou responsáveis diferentes.')
    return {
        'assignee_id': next(iter(assignee_ids), None),
        'candidate_count': len(candidates),
        'candidates': candidates,
        'excluded': excluded,
    }


def recheck_candidate(linear: dict[str, object], expected: list[str]) -> dict[str, object]:
    fields = ('identifier', 'issue_id', 'assignee_id', 'state_id')
    matches = [item for item in linear['candidates'] if item['identifier'] == expected[0]]
    if len(matches) != 1 or [matches[0][key] for key in fields] != expected:
        raise ValueError('Card não confirmado na fila Todo com a mesma identidade após a reserva.')
    return matches[0]


def summarize_worktrees(response: object, repo_id: str) -> dict[str, object]:
    if not isinstance(response, dict) or response.get('ok') is not True:
        raise ValueError('Consulta Orca falhou.')
    result = response.get('result')
    if not isinstance(result, dict) or result.get('truncated') is not False:
        raise ValueError('Retrato Orca truncado ou inválido.')
    scope = result.get('hostScope')
    if not isinstance(scope, dict) or not isinstance(scope.get('hostIds'), list) or not scope['hostIds'] or scope.get('omittedHostIds') != []:
        raise ValueError('Retrato Orca omitiu hosts.')
    worktrees = result.get('worktrees')
    if not isinstance(worktrees, list):
        raise ValueError('Retrato Orca sem worktrees.')
    selected: list[dict[str, object]] = []
    live_agents = 0
    for worktree in worktrees:
        if not isinstance(worktree, dict):
            raise ValueError('Worktree Orca inválida.')
        if worktree.get('repoId') != repo_id:
            continue
        agents = worktree.get('agents')
        if not isinstance(agents, list) or not all(isinstance(agent, dict) for agent in agents):
            raise ValueError('Lista de agentes Orca incompleta.')
        states = [str(agent.get('state', 'unverifiable')) for agent in agents]
        live_agents += sum(state not in {'done', 'exited'} for state in states)
        selected.append({
            'path': worktree.get('path'),
            'branch': worktree.get('branch'),
            'states': states,
            'unverifiable_terminals': worktree.get('unverifiableTerminalCount', 0),
        })
    if not selected:
        raise ValueError('Repositório Muvit ausente do retrato Orca.')
    return {'live_agents': live_agents, 'worktrees': selected}


def call_orca(command: str, args: list[str]) -> object:
    result = subprocess.run([command, *args], capture_output=True, text=True,
                            encoding='utf-8', timeout=45)
    try:
        response = json.loads(result.stdout)
    except json.JSONDecodeError as error:
        raise ValueError('CLI Orca não retornou JSON válido.') from error
    if result.returncode != 0:
        detail = response.get('error') if isinstance(response, dict) else None
        message = detail.get('message') if isinstance(detail, dict) else None
        raise ValueError(f'CLI Orca falhou: {message or result.returncode}')
    return response


def read_linear(command: str, workspace_id: str) -> dict[str, object]:
    # O Orca resolve "me" na conexão do workspace. IDs de responsável vêm dos cards.
    return summarize_linear(call_orca(command, [
        'linear', 'list-issues', '--team', 'MUV', '--state', 'Todo',
        '--assignee', 'me', '--workspace', workspace_id, '--json',
    ]), workspace_id)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace-id', required=True)
    parser.add_argument('--repo-id', required=True)
    parser.add_argument('--orca-command', default=os.environ.get('ORCA_CLI_COMMAND', 'orca'))
    parser.add_argument('--recheck', nargs=4,
                        metavar=('CARD', 'ISSUE_ID', 'ASSIGNEE_ID', 'STATE_ID'),
                        help='Revalida um candidato do probe após a reserva.')
    args = parser.parse_args()
    if args.workspace_id != WORKSPACE_ID:
        parser.error('--workspace-id deve ser o UUID do workspace Muvit')
    try:
        linear = read_linear(args.orca_command, args.workspace_id)
        if args.recheck:
            candidate = recheck_candidate(linear, args.recheck)
            print(json.dumps({'ok': True, 'workspace_id': args.workspace_id,
                              'candidate': candidate}, ensure_ascii=False))
            return 0
        orca = summarize_worktrees(call_orca(args.orca_command, [
            'worktree', 'ps', '--limit', '10000', '--json',
        ]), args.repo_id)
        print(json.dumps({'ok': True, 'workspace_id': args.workspace_id,
                          'linear': linear, 'orca': orca}, ensure_ascii=False))
        return 0
    except (OSError, ValueError, subprocess.TimeoutExpired) as error:
        print(json.dumps({'ok': False, 'error_type': type(error).__name__,
                          'error': str(error)}, ensure_ascii=False))
        return 1


if __name__ == '__main__':
    sys.exit(main())
