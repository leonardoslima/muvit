"""Confere um retrato compacto de admissão sem acessar Linear ou iniciar agentes."""
import importlib.util
from pathlib import Path
import unittest


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'admission_probe.py'
SPEC = importlib.util.spec_from_file_location('admission_probe', SCRIPT)


class AdmissionProbeTests(unittest.TestCase):
    def load_probe(self):
        self.assertTrue(SCRIPT.exists(), 'O probe de admissão ainda não existe.')
        self.assertIsNotNone(SPEC)
        self.assertIsNotNone(SPEC.loader)
        module = importlib.util.module_from_spec(SPEC)
        SPEC.loader.exec_module(module)
        return module

    def test_linear_keeps_only_complete_own_ready_cards(self):
        probe = self.load_probe()
        issue = {'identifier': 'MUV-46', 'title': 'Validar fluxo',
                 'team': {'key': 'MUV'}, 'state': {'type': 'backlog'},
                 'assignee': {'id': 'user-1'}, 'labels': [{'name': 'agent_ready'}],
                 'priority': 2}
        blocked = {**issue, 'identifier': 'MUV-47',
                   'labels': [{'name': 'agent_ready'}, {'name': 'agent_blocked'}]}
        response = {'ok': True, 'result': {'issues': [issue, blocked],
                    'truncated': False, 'meta': {'partial': False, 'hasMore': False}}}
        result = probe.summarize_linear(response)
        self.assertEqual(result['assignee_id'], 'user-1')
        self.assertEqual([item['identifier'] for item in result['candidates']], ['MUV-46'])
        self.assertEqual(result['excluded'][0]['identifier'], 'MUV-47')

    def test_incomplete_linear_result_is_rejected(self):
        probe = self.load_probe()
        response = {'ok': True, 'result': {'issues': [], 'truncated': True,
                    'meta': {'partial': False, 'hasMore': True}}}
        with self.assertRaises(ValueError):
            probe.summarize_linear(response)

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
