import sys
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))

from delivery_gate import Blocked, CHECKS, Github as GithubApi, REPO, WORKSPACE_ID, close_plan, merge

HEAD = 'a' * 40
MERGED = 'b' * 40
URL = f'https://github.com/{REPO}/pull/99'


class Github:
    def __init__(self):
        self.pr = {'number': 99, 'html_url': URL, 'state': 'open', 'draft': False,
                   'merged': False, 'head': {'sha': HEAD, 'ref': 'muv-999', 'repo': {'full_name': REPO}},
                   'base': {'ref': 'develop', 'repo': {'full_name': REPO}}}
        self.checks = [{'name': name, 'app': {'id': 15368}, 'head_sha': HEAD,
                        'status': 'completed', 'conclusion': 'success'} for name in CHECKS]
        self.protected = True
        self.reject = False
        self.timeout = False
        self.reached_develop = True
        self.calls = []

    def read_pr(self, number):
        return deepcopy(self.pr)

    def require_protection(self):
        if not self.protected:
            raise Blocked('Proteção insuficiente')

    def read_checks(self, sha):
        return self.checks

    def merge_pr(self, number, sha):
        self.calls.append((number, sha))
        if self.reject:
            return {'merged': False, 'message': 'HEAD alterada pelo GitHub'}
        self.pr.update(state='closed', merged=True, merge_commit_sha=MERGED)
        if self.timeout:
            raise Blocked('Resposta indisponível')
        return {'merged': True, 'sha': MERGED}

    def in_develop(self, sha):
        return sha == MERGED and self.reached_develop


class DeliveryTest(unittest.TestCase):
    def setUp(self):
        self.github = Github()
        self.record = {'pr': 99, 'branch': 'muv-999', 'head': HEAD, 'card': 'MUV-999',
                       'issue_id': 'issue-fixture', 'workspace_id': WORKSPACE_ID,
                       'assignee_id': 'owner-fixture', 'profile': 'hybrid_go',
                       'review': {'head': HEAD, 'result': 'PASS', 'evidence': 'recibo Orca'},
                       'qa': {'head': HEAD, 'result': 'NOT_APPLICABLE', 'evidence': 'escopo documental'},
                       'threads': {'head': HEAD, 'result': 'PASS', 'evidence': 'inspeção do PR'}}
        self.linear = {'card': 'MUV-999', 'issue_id': 'issue-fixture',
                       'workspace_id': WORKSPACE_ID, 'assignee_id': 'owner-fixture',
                       'state': 'In Review', 'links': [URL], 'labels': ['agent_review', 'Mobile']}

    def do_merge(self):
        return merge(self.github, self.record, self.linear)

    def test_bloqueia_evidência_de_outra_head_ou_gate_pendente(self):
        for gate in ('review', 'qa', 'threads'):
            for value in ({'head': MERGED}, {'result': 'PENDING'}, {'evidence': ''}):
                with self.subTest(gate=gate, value=value):
                    original = self.record[gate].copy()
                    self.record[gate].update(value)
                    with self.assertRaises(Blocked):
                        self.do_merge()
                    self.record[gate] = original
        self.assertEqual(self.github.calls, [])

    def test_exige_checks_com_sucesso_na_head_e_origem_certa(self):
        for field, value in [('head_sha', MERGED), ('conclusion', 'skipped'), ('app', {'id': 1})]:
            with self.subTest(field=field):
                original = self.github.checks[0][field]
                self.github.checks[0][field] = value
                with self.assertRaises(Blocked):
                    self.do_merge()
                self.github.checks[0][field] = original
        self.assertEqual(self.github.calls, [])

    def test_proteção_e_identidade_do_pr_são_obrigatórias(self):
        self.github.protected = False
        with self.assertRaises(Blocked):
            self.do_merge()
        self.github.protected = True
        self.github.pr['head']['sha'] = MERGED
        with self.assertRaises(Blocked):
            self.do_merge()
        self.assertEqual(self.github.calls, [])

    def test_merge_recusado_mantém_linear_pendente(self):
        self.github.reject = True
        with self.assertRaises(Blocked):
            self.do_merge()
        self.assertEqual(self.github.calls, [(99, HEAD)])
        with self.assertRaises(Blocked):
            close_plan(self.github, self.record, self.linear)

    def test_retomada_após_resposta_incerta_não_repete_merge(self):
        self.github.timeout = True
        with self.assertRaises(Blocked):
            self.do_merge()
        self.assertEqual(self.do_merge()['merge_sha'], MERGED)
        self.assertEqual(self.github.calls, [(99, HEAD)])

    def test_plano_linear_exige_merge_em_develop_e_vínculo(self):
        self.assertEqual(self.do_merge()['merge_sha'], MERGED)
        self.github.reached_develop = False
        with self.assertRaises(Blocked):
            close_plan(self.github, self.record, self.linear)
        self.github.reached_develop = True
        self.linear['links'] = []
        with self.assertRaises(Blocked):
            close_plan(self.github, self.record, self.linear)
        self.linear['links'] = [URL]
        self.assertEqual(close_plan(self.github, self.record, self.linear)['status'], 'UPDATE_LINEAR')
        self.linear['state'] = 'Done'
        self.assertEqual(close_plan(self.github, self.record, self.linear)['status'], 'DONE_CONFIRMED')

    def test_entrega_preserva_labels_e_aceita_snapshot_sem_labels(self):
        for labels in (None, [], ['Mobile', 'Bug', 'agent_ready', 'agent_in_progress',
                                  'agent_review', 'agent_blocked']):
            with self.subTest(labels=labels):
                self.setUp()
                if labels is None:
                    self.linear.pop('labels')
                else:
                    self.linear['labels'] = labels
                snapshot = deepcopy(self.linear)
                self.assertEqual(self.do_merge()['merge_sha'], MERGED)
                plan = close_plan(self.github, self.record, self.linear)
                self.assertEqual(plan['status'], 'UPDATE_LINEAR')
                self.assertEqual(plan['state'], 'Done')
                self.assertNotIn('remove_labels', plan)
                self.assertEqual(self.linear, snapshot)
                self.linear['state'] = 'Done'
                self.assertEqual(close_plan(self.github, self.record, self.linear)['status'], 'DONE_CONFIRMED')

    def test_label_legada_nao_autoriza_merge_ou_fechamento_em_todo(self):
        self.linear['state'] = 'Todo'
        with self.assertRaises(Blocked):
            self.do_merge()
        self.assertEqual(self.github.calls, [])
        self.linear['state'] = 'In Review'
        self.do_merge()
        self.linear['state'] = 'Todo'
        with self.assertRaises(Blocked):
            close_plan(self.github, self.record, self.linear)

    def test_bloqueia_escrita_linear_com_responsável_alterado(self):
        self.do_merge()
        self.linear['assignee_id'] = 'outro'
        with self.assertRaises(Blocked):
            close_plan(self.github, self.record, self.linear)

    def test_bloqueia_workspace_fora_do_muvit_mesmo_se_os_snapshots_coincidem(self):
        self.record['workspace_id'] = self.linear['workspace_id'] = 'outro'
        with self.assertRaises(Blocked):
            self.do_merge()
        self.assertEqual(self.github.calls, [])

    def test_revalida_base_imediatamente_antes_do_merge(self):
        with patch.object(self.github, 'read_pr', side_effect=[
            deepcopy(self.github.pr), {**self.github.pr, 'base': {'ref': 'main', 'repo': {'full_name': REPO}}},
        ]):
            with self.assertRaises(Blocked):
                self.do_merge()
        self.assertEqual(self.github.calls, [])


class GithubApiTest(unittest.TestCase):
    def test_merge_envia_sha_esperado_por_put_normal(self):
        github = GithubApi()
        with patch.object(github, 'api') as api:
            github.merge_pr(99, HEAD)
        api.assert_called_once_with('pulls/99/merge', '--method', 'PUT',
                                    '-f', f'sha={HEAD}', '-f', 'merge_method=squash')

    def test_proteção_exige_checks_estritos_e_threads_no_mesmo_ruleset(self):
        github = GithubApi()
        status = {'type': 'required_status_checks', 'ruleset_id': 8, 'parameters': {
            'strict_required_status_checks_policy': True,
            'required_status_checks': [{'context': name, 'integration_id': 15368} for name in CHECKS],
        }}
        pr = {'type': 'pull_request', 'ruleset_id': 8, 'parameters': {
            'required_review_thread_resolution': True,
        }}
        with patch.object(github, 'api', return_value=[status, pr]):
            github.require_protection()
            pr['ruleset_id'] = 9
            with self.assertRaises(Blocked):
                github.require_protection()
            pr['ruleset_id'] = 8
            status['parameters']['strict_required_status_checks_policy'] = False
            with self.assertRaises(Blocked):
                github.require_protection()


if __name__ == '__main__':
    unittest.main()
