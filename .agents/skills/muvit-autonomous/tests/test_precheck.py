"""Valida o processo do precheck com respostas controladas, sem modificar o Linear."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/precheck.ps1'


class PrecheckTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.issue = {'team': {'key': 'MUV'}, 'state': {'type': 'backlog'},
                      'assignee': {'id': 'authenticated-user'},
                      'labels': [{'name': 'agent_ready'}]}

    def run_precheck(self, issues, partial=False, exit_code=0):
        response = {'ok': True, 'result': {'issues': issues, 'truncated': False,
                    'meta': {'partial': partial, 'hasMore': False}}}
        (self.root / 'response.json').write_text(json.dumps(response), encoding='utf-8')
        fake = self.root / 'orca-test.ps1'
        fake.write_text("""$args | ConvertTo-Json | Set-Content -Encoding utf8 (Join-Path $PSScriptRoot 'args.json')
Get-Content -Raw (Join-Path $PSScriptRoot 'response.json')
exit """ + str(exit_code), encoding='utf-8-sig')
        result = subprocess.run(['powershell.exe', '-NoProfile', '-NonInteractive',
                                 '-ExecutionPolicy', 'Bypass', '-File', str(SCRIPT),
                                 '-Workspace', 'workspace-test', '-OrcaCommand', str(fake)],
                                capture_output=True)
        args_path = self.root / 'args.json'
        args = json.loads(args_path.read_text(encoding='utf-8-sig')) if args_path.exists() else []
        return result, args

    def test_queries_authenticated_assignee_and_accepts_own_card(self):
        result, args = self.run_precheck([self.issue])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('--assignee', args)
        self.assertEqual(args[args.index('--assignee') + 1], 'me')
        self.assertEqual(args[args.index('--workspace') + 1], 'workspace-test')

    def test_no_assigned_candidates_skips_run(self):
        result, _ = self.run_precheck([])
        self.assertEqual(result.returncode, 1, result.stderr)

    def test_unassigned_card_does_not_start_run(self):
        self.issue['assignee'] = None
        result, _ = self.run_precheck([self.issue])
        self.assertEqual(result.returncode, 1, result.stderr)

    def test_completed_card_does_not_start_run(self):
        self.issue['state']['type'] = 'completed'
        result, _ = self.run_precheck([self.issue])
        self.assertEqual(result.returncode, 1, result.stderr)

    def test_partial_response_blocks_run(self):
        result, _ = self.run_precheck([self.issue], partial=True)
        self.assertEqual(result.returncode, 2, result.stderr)

    def test_cli_failure_blocks_run(self):
        result, _ = self.run_precheck([self.issue], exit_code=1)
        self.assertEqual(result.returncode, 2, result.stderr)


if __name__ == '__main__':
    unittest.main()
