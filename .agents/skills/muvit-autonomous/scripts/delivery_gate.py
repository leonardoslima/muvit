"""Gate do coordenador para merge em develop e verificação antes de fechar no Linear."""
import argparse
import json
import re
import socket
import subprocess
import sys
from pathlib import Path

from local_lock import git

REPO = 'leonardoslima/muvit'
BASE = 'develop'
ACTIONS_APP = 15368
CHECKS = ('Check (Biome)', 'Test (Turborepo)', 'Build (Turborepo)', 'TypeScript Check')
WORKSPACE_ID = '18309e87-272d-4c09-aa18-ed1711c84dcf'


class Blocked(ValueError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise Blocked(message)


def sha_valid(value: str) -> bool:
    return isinstance(value, str) and bool(re.fullmatch('[0-9a-f]{40}', value))


def verify_identity(record: dict, linear: dict) -> str:
    require(record['profile'] == 'hybrid_go', 'A entrega exige o perfil hybrid_go.')
    require(type(record['pr']) is int and record['pr'] > 0 and sha_valid(record['head']),
            'Número do PR ou HEAD inválidos.')
    require(record['workspace_id'] == WORKSPACE_ID, 'Workspace fora do escopo Muvit.')
    for key in ('card', 'issue_id', 'workspace_id', 'assignee_id'):
        require(bool(record[key]) and linear[key] == record[key],
                f'Identidade divergente no Linear: {key}.')
    url = f'https://github.com/{REPO}/pull/{record["pr"]}'
    require(url in linear['links'], 'O PR esperado precisa estar vinculado no Linear.')
    return url


def verify_pr(pr: dict, record: dict, url: str) -> None:
    require(pr['number'] == record['pr'] and pr['html_url'] == url
            and pr['base']['repo']['full_name'] == REPO and pr['base']['ref'] == BASE
            and pr['head']['repo']['full_name'] == REPO and pr['head']['ref'] == record['branch']
            and pr['head']['sha'] == record['head'],
            'O PR remoto diverge do repositório, base, branch ou HEAD registrados.')


def merge_proof(github: 'Github', pr: dict) -> dict:
    require(pr['merged'] is True and pr['state'] == 'closed', 'Merge do PR ainda não comprovado.')
    sha = pr['merge_commit_sha']
    require(sha_valid(sha) and github.in_develop(sha), 'Commit de merge ausente em develop.')
    return {'pr_url': pr['html_url'], 'head': pr['head']['sha'], 'merge_sha': sha}


def verify_evidence(record: dict) -> None:
    for gate in ('review', 'qa', 'threads'):
        evidence = record[gate]
        allowed = {'PASS', 'NOT_APPLICABLE'} if gate == 'qa' else {'PASS'}
        require(evidence['head'] == record['head'] and evidence['result'] in allowed
                and bool(evidence['evidence'].strip()), f'Gate {gate} sem evidência na HEAD.')


def merge(github: 'Github', record: dict, linear: dict) -> dict:
    url = verify_identity(record, linear)
    verify_evidence(record)
    pr = github.read_pr(record['pr'])
    verify_pr(pr, record, url)
    if pr['merged'] is True:
        return merge_proof(github, pr)

    require(pr['state'] == 'open' and pr['draft'] is False, 'PR precisa estar aberto e pronto.')
    require(linear['state'] == 'In Review', 'Reconciliar estado do card antes do merge.')
    github.require_protection()
    checks = github.read_checks(record['head'])
    for name in CHECKS:
        runs = [run for run in checks if run['name'] == name and run['app']['id'] == ACTIONS_APP]
        require(len(runs) == 1 and runs[0]['head_sha'] == record['head']
                and runs[0]['status'] == 'completed' and runs[0]['conclusion'] == 'success',
                f'Check obrigatório sem sucesso inequívoco na HEAD: {name}.')

    pr = github.read_pr(record['pr'])
    verify_pr(pr, record, url)
    if pr['merged'] is True:
        return merge_proof(github, pr)
    require(pr['state'] == 'open' and pr['draft'] is False, 'PR deixou de estar aberto e pronto.')
    result = github.merge_pr(record['pr'], record['head'])
    require(result.get('merged') is True, f'Merge recusado: {result.get("message")}.')
    pr = github.read_pr(record['pr'])
    verify_pr(pr, record, url)
    proof = merge_proof(github, pr)
    require(proof['merge_sha'] == result.get('sha'), 'Resposta de merge diverge da releitura.')
    return proof


def close_plan(github: 'Github', record: dict, linear: dict) -> dict:
    url = verify_identity(record, linear)
    verify_evidence(record)
    pr = github.read_pr(record['pr'])
    verify_pr(pr, record, url)
    proof = merge_proof(github, pr)
    require(linear['state'] in {'In Review', 'In Progress', 'Done'},
            'Estado do card divergente: reconciliar ownership antes de fechar.')
    status = 'DONE_CONFIRMED' if linear['state'] == 'Done' else 'UPDATE_LINEAR'
    return {**proof, 'status': status, 'issue_id': record['issue_id'],
            'state': 'Done'}


class Github:
    def api(self, path: str, *args: str) -> dict | list:
        return json.loads(subprocess.run(
            ['gh', 'api', '--hostname', 'github.com', f'repos/{REPO}/{path}', *args],
            check=True, stdout=subprocess.PIPE, text=True, encoding='utf-8',
        ).stdout)

    def read_pr(self, number: int) -> dict:
        return self.api(f'pulls/{number}')

    def require_protection(self) -> None:
        rules = self.api(f'rules/branches/{BASE}')
        pr_rules = [rule for rule in rules if rule['type'] == 'pull_request'
                    and rule['parameters']['required_review_thread_resolution'] is True]
        expected = {(name, ACTIONS_APP) for name in CHECKS}
        for rule in rules:
            if rule['type'] != 'required_status_checks':
                continue
            params = rule['parameters']
            actual = {(check['context'], check.get('integration_id'))
                      for check in params['required_status_checks']}
            if (params['strict_required_status_checks_policy'] is True and expected <= actual
                    and any(pr['ruleset_id'] == rule['ruleset_id'] for pr in pr_rules)):
                return
        raise Blocked('Ruleset ativo de develop precisa exigir PR, threads resolvidas e CI estrito.')

    def read_checks(self, sha: str) -> list:
        pages = self.api(f'commits/{sha}/check-runs?filter=latest&per_page=100',
                         '--paginate', '--slurp')
        return [check for page in pages for check in page['check_runs']]

    def merge_pr(self, number: int, sha: str) -> dict:
        return self.api(f'pulls/{number}/merge', '--method', 'PUT',
                        '-f', f'sha={sha}', '-f', 'merge_method=squash')

    def in_develop(self, sha: str) -> bool:
        return self.api(f'compare/{sha}...{BASE}')['status'] in {'ahead', 'identical'}


def require_lock(record: dict) -> None:
    card = record['card']
    require(bool(re.fullmatch(r'MUV-[1-9][0-9]*', card)), 'Card MUV inválido.')
    common = Path(git('rev-parse', '--path-format=absolute', '--git-common-dir'))
    lock_path = common / 'muvit-autonomous' / 'locks' / f'{card}.json'
    lock = json.loads(lock_path.read_text(encoding='utf-8'))
    require(lock['card'] == card and lock['run_id'] == record['run_id']
            and lock['host'] == socket.gethostname()
            and Path(lock['worktree']).resolve() == Path(git('rev-parse', '--show-toplevel')).resolve()
            and lock['branch'] == record['branch'] == git('branch', '--show-current'),
            'A reserva, branch ou worktree não pertence a esta rodada.')


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['merge', 'close-plan'])
    parser.add_argument('--record', required=True, type=Path)
    parser.add_argument('--linear', required=True, type=Path)
    args = parser.parse_args()
    try:
        record = json.loads(args.record.read_text(encoding='utf-8-sig'))
        linear = json.loads(args.linear.read_text(encoding='utf-8-sig'))
        require_lock(record)
        if args.action == 'merge':
            result = merge(Github(), record, linear)
        else:
            result = close_plan(Github(), record, linear)
        print(json.dumps(result, ensure_ascii=False))
        return 0
    except (OSError, ValueError, KeyError, TypeError, AttributeError, subprocess.CalledProcessError) as error:
        print(f'Entrega pendente. Reconcilie GitHub e Linear antes de repetir: {error}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())
