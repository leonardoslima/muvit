"""Gates da automação com retratos Orca controlados, sem lançar agentes."""
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'automation_gate.py'
SPEC = importlib.util.spec_from_file_location('automation_gate', SCRIPT)
assert SPEC and SPEC.loader
gate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(gate)


class AutomationGateTests(unittest.TestCase):
    def snapshot(self, agent_counts=(1,)):
        return {'ok': True, 'result': {
            'worktrees': [
                {'repoId': 'repo-muvit', 'path': str(Path.cwd()),
                 'agents': [{'state': 'working'}] * count}
                for count in agent_counts
            ],
            'hostScope': {'hostIds': ['local'], 'omittedHostIds': []},
            'truncated': False,
        }}

    def test_allows_first_launch_with_worker_slot(self):
        decision = gate.evaluate(self.snapshot((1,)), 'repo-muvit', 0)
        self.assertTrue(decision['allowed'])
        self.assertEqual(decision['live_agents'], 1)

    def test_completed_chats_do_not_consume_live_agent_slots(self):
        snapshot = self.snapshot((3,))
        snapshot['result']['worktrees'][0]['agents'] = [
            {'state': 'working'}, {'state': 'done'}, {'state': 'done'},
        ]
        decision = gate.evaluate(snapshot, 'repo-muvit', 0)
        self.assertTrue(decision['allowed'])
        self.assertEqual(decision['live_agents'], 1)

    def test_denies_second_launch_without_worker_slot(self):
        decision = gate.evaluate(self.snapshot((1, 2)), 'repo-muvit', 1)
        self.assertFalse(decision['allowed'])
        self.assertEqual(decision['reason'], 'insufficient_capacity')

    def test_denies_incomplete_snapshot(self):
        snapshot = self.snapshot()
        snapshot['result']['hostScope']['omittedHostIds'] = ['remote']
        self.assertEqual(gate.evaluate(snapshot, 'repo-muvit', 0)['reason'], 'incomplete_snapshot')

    def test_denies_third_round(self):
        self.assertEqual(gate.evaluate(self.snapshot(), 'repo-muvit', 2)['reason'], 'run_limit')

    def test_denies_wrong_repository(self):
        self.assertEqual(gate.evaluate(self.snapshot(), 'other-repo', 0)['reason'], 'repo_mismatch')

    def test_missing_lock_fails_closed_and_reports_denial(self):
        with tempfile.TemporaryDirectory() as temp:
            report = Path(temp) / 'gate.json'
            args = ['automation_gate.py', '--repo-id', 'repo-muvit', '--card',
                    'MUV-99', '--run-id', 'test-run', '--started', '0', '--report', str(report)]
            response = subprocess.CompletedProcess(args=[], returncode=0,
                                                   stdout=json.dumps(self.snapshot()))
            with patch.object(sys, 'argv', args), patch.object(gate.subprocess, 'run', return_value=response), \
                    patch.object(gate, 'check_lock', side_effect=FileNotFoundError), \
                    patch('sys.stdout', new_callable=io.StringIO):
                exit_code = gate.main()
            self.assertEqual(exit_code, 1)
            saved = json.loads(report.read_text(encoding='utf-8'))
            self.assertFalse(saved['allowed'])
            self.assertEqual(saved['reason'], 'gate_error')


if __name__ == '__main__':
    unittest.main()
