"""Resume em leitura os candidatos Linear e as sessões Orca da automação Muvit."""
import argparse
import json
import os
import re
import subprocess
import sys


CONFLICTING_LABELS = {'agent_in_progress', 'agent_blocked', 'agent_review'}
ELIGIBLE_STATES = {'triage', 'backlog', 'unstarted'}


def summarize_linear(response: object) -> dict[str, object]:
    if not isinstance(response, dict) or response.get('ok') is not True:
        raise ValueError('Consulta Linear falhou.')
    result = response.get('result')
    if not isinstance(result, dict) or result.get('truncated') is not False:
        raise ValueError('Consulta Linear truncada ou inválida.')
    meta = result.get('meta')
    if not isinstance(meta, dict) or meta.get('partial') is not False or meta.get('hasMore') is not False:
        raise ValueError('Consulta Linear parcial ou com páginas pendentes.')
    issues = result.get('issues')
    if not isinstance(issues, list):
        raise ValueError('Consulta Linear sem lista de cards.')
    candidates: list[dict[str, object]] = []
    excluded: list[dict[str, str]] = []
    assignee_ids: set[str] = set()
    for issue in issues:
        if not isinstance(issue, dict) or not isinstance(issue.get('identifier'), str):
            raise ValueError('Card Linear inválido.')
        identifier = issue['identifier']
        team = issue.get('team')
        state = issue.get('state')
        assignee = issue.get('assignee')
        labels = issue.get('labels')
        if not isinstance(team, dict) or not isinstance(state, dict) or not isinstance(assignee, dict) or not isinstance(labels, list):
            raise ValueError(f'Dados incompletos do card {identifier}.')
        assignee_id = assignee.get('id')
        if not isinstance(assignee_id, str) or not assignee_id:
            raise ValueError(f'Responsável não confirmado no card {identifier}.')
        assignee_ids.add(assignee_id)
        names = {label.get('name') for label in labels if isinstance(label, dict)}
        reason = None
        if team.get('key') != 'MUV':
            reason = 'outro_time'
        elif state.get('type') not in ELIGIBLE_STATES:
            reason = 'estado_inelegivel'
        elif 'agent_ready' not in names:
            reason = 'sem_agent_ready'
        elif names & CONFLICTING_LABELS:
            reason = 'label_conflitante'
        if reason:
            excluded.append({'identifier': identifier, 'reason': reason})
            continue
        candidates.append({
            'identifier': identifier,
            'title': issue.get('title'),
            'priority': issue.get('priority'),
            'state': state.get('name'),
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


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--workspace-id', required=True)
    parser.add_argument('--repo-id', required=True)
    parser.add_argument('--orca-command', default=os.environ.get('ORCA_CLI_COMMAND', 'orca'))
    args = parser.parse_args()
    if not re.fullmatch(r'[0-9a-fA-F-]{36}', args.workspace_id):
        parser.error('--workspace-id deve ser o ID UUID do workspace Linear')
    try:
        linear = summarize_linear(call_orca(args.orca_command, [
            'linear', 'list-issues', '--team', 'MUV', '--label', 'agent_ready',
            '--assignee', 'me', '--workspace', args.workspace_id, '--json',
        ]))
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
