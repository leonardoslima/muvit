"""Confere um retrato compacto de admissão sem acessar Linear ou iniciar agentes."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'admission_probe.py'
SPEC = importlib.util.spec_from_file_location('admission_probe', SCRIPT)
WORKSPACE = '18309e87-272d-4c09-aa18-ed1711c84dcf'
ISSUE = {
    'id': 'issue-1', 'identifier': 'MUV-46', 'title': 'Validar fluxo',
    'team': {'key': 'MUV'}, 'workspace': {'id': WORKSPACE},
    'state': {'name': 'Todo', 'type': 'unstarted', 'id': 'todo-id'},
    'assignee': {'id': 'user-1'}, 'priority': 2,
}


def linear_result(*issues):
    return {'ok': True, 'result': {'issues': list(issues), 'truncated': False,
            'meta': {'partial': False, 'hasMore': False, 'workspaceId': WORKSPACE,
                     'workspaceErrors': [], 'limit': None, 'returned': len(issues)}}}


class AdmissionProbeTests(unittest.TestCase):
    def load_probe(self):
        self.assertTrue(SCRIPT.exists(), 'O probe de admissão ainda não existe.')
        self.assertIsNotNone(SPEC)
        self.assertIsNotNone(SPEC.loader)
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        return module

    def test_linear_requires_exact_todo_and_ignores_legacy_labels(self):
        probe = self.load_probe()
        legacy = {**ISSUE, 'id': 'issue-2', 'identifier': 'MUV-47',
                  'labels': [{'name': name} for name in (
                      'agent_ready', 'agent_in_progress', 'agent_review', 'agent_blocked', 'Mobile')]}
        result = probe.summarize_linear(linear_result(ISSUE, legacy), WORKSPACE)
        self.assertEqual(result['assignee_id'], 'user-1')
        self.assertEqual([item['identifier'] for item in result['candidates']], ['MUV-46', 'MUV-47'])
        for state in ('Backlog', 'In Progress', 'In Review', 'Done', 'todo', 'Outro não iniciado'):
            with self.subTest(state=state):
                issue = {**legacy, 'state': {**ISSUE['state'], 'name': state}}
                excluded = probe.summarize_linear(linear_result(issue), WORKSPACE)
                self.assertEqual(excluded['candidate_count'], 0)
                self.assertEqual(excluded['excluded'][0]['reason'], 'estado_inelegivel')

    def test_incomplete_linear_result_is_rejected(self):
        probe = self.load_probe()
        for invalid in ({'partial': True}, {'hasMore': True}, {'workspaceId': 'outro'},
                        {'workspaceErrors': [{}]}, {'returned': 0}, {'limit': 1}):
            with self.subTest(meta=invalid):
                response = linear_result(ISSUE)
                response['result']['meta'].update(invalid)
                with self.assertRaises(ValueError):
                    probe.summarize_linear(response, WORKSPACE)
        for invalid in ({'workspace': {'id': 'outro'}}, {'assignee': {}}, {'state': {}},
                        {'team': {}}, {'id': None}):
            with self.subTest(issue=invalid), self.assertRaises(ValueError):
                probe.summarize_linear(linear_result({**ISSUE, **invalid}), WORKSPACE)

    def test_rejects_multiple_assignees_and_excludes_wrong_team_or_unassigned(self):
        probe = self.load_probe()
        second = {**ISSUE, 'identifier': 'MUV-47', 'id': 'issue-2'}
        with self.assertRaises(ValueError):
            probe.summarize_linear(linear_result(ISSUE, {**second, 'assignee': {'id': 'other'}}), WORKSPACE)
        result = probe.summarize_linear(linear_result({**second, 'team': {'key': 'OTHER'}}), WORKSPACE)
        self.assertEqual(result['candidate_count'], 0)
        result = probe.summarize_linear(linear_result({**ISSUE, 'assignee': None}), WORKSPACE)
        self.assertEqual(result['excluded'], [{'identifier': 'MUV-46', 'reason': 'sem_responsavel'}])

    def test_recheck_after_lock_requires_same_card_owner_and_todo(self):
        probe = self.load_probe()
        original = probe.summarize_linear(linear_result(ISSUE), WORKSPACE)
        expected = ['MUV-46', 'issue-1', 'user-1', 'todo-id']
        self.assertEqual(probe.recheck_candidate(original, expected), original['candidates'][0])
        moved = {**ISSUE, 'state': {**ISSUE['state'], 'name': 'In Progress'}}
        for issues in ((), (moved,), ({**ISSUE, 'assignee': {'id': 'other'}},),
                       ({**ISSUE, 'id': 'issue-2'},),
                       ({**ISSUE, 'state': {**ISSUE['state'], 'id': 'changed'}},)):
            with self.subTest(issues=issues), self.assertRaises(ValueError):
                probe.recheck_candidate(probe.summarize_linear(linear_result(*issues), WORKSPACE), expected)

    def test_reads_authenticated_todo_queue_without_label_filter(self):
        probe = self.load_probe()
        with patch.object(probe, 'call_orca', return_value=linear_result()) as call:
            probe.read_linear('orca', WORKSPACE)
        call.assert_called_once_with('orca', [
            'linear', 'list-issues', '--team', 'MUV', '--state', 'Todo',
            '--assignee', 'me', '--workspace', WORKSPACE, '--json',
        ])

    def test_worktree_summary_keeps_scope_and_live_states(self):
        probe = self.load_probe()
        response = {'ok': True, 'result': {'truncated': False,
                    'hostScope': {'hostIds': ['local'], 'omittedHostIds': []},
                    'worktrees': [
                        {'repoId': 'repo-1', 'path': 'C:/muvit',
                         'agents': [{'state': 'working'}, {'state': 'done'}],
                         'unverifiableTerminalCount': 0},
                        {'repoId': 'other', 'path': 'C:/other', 'agents': []},
                    ]}}
        result = probe.summarize_worktrees(response, 'repo-1')
        self.assertEqual(result['live_agents'], 1)
        self.assertEqual(result['worktrees'][0]['path'], 'C:/muvit')
        self.assertEqual(result['worktrees'][0]['states'], ['working', 'done'])


if __name__ == '__main__':
    unittest.main()
