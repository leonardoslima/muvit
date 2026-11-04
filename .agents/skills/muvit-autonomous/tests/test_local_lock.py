"""Exercita reservas locais em um repositório temporário, sem acessar serviços."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts/local_lock.py'


class LocalLockTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name)
        subprocess.run(['git', 'init', '--quiet', str(self.repo)], check=True)

    def command(self, action, *args):
        return [sys.executable, '-B', '-X', 'utf8', str(SCRIPT), action,
                '--card', 'MUV-15', *args]

    def run_lock(self, action, *args):
        return subprocess.run(self.command(action, *args), cwd=self.repo,
                              capture_output=True, text=True, encoding='utf-8')

    def test_records_owner_and_preserves_first_reservation(self):
        first = self.run_lock('acquire', '--run-id', 'rodada-á')
        self.assertEqual(first.returncode, 0, first.stderr)
        record = json.loads(first.stdout)
        self.assertEqual(record['card'], 'MUV-15')
        self.assertEqual(record['run_id'], 'rodada-á')
        self.assertEqual(Path(record['worktree']), self.repo.resolve())
        self.assertIn('created_at', record)
        self.assertTrue(Path(record['lock_path']).is_relative_to(self.repo / '.git'))
        duplicate = self.run_lock('acquire', '--run-id', 'outra-rodada')
        self.assertNotEqual(duplicate.returncode, 0)
        self.assertEqual(json.loads(self.run_lock('show').stdout), record)
        status = subprocess.run(['git', 'status', '--porcelain'], cwd=self.repo,
                                capture_output=True, text=True, check=True)
        self.assertEqual(status.stdout, '')

    def test_only_owner_can_release(self):
        self.assertEqual(self.run_lock('acquire', '--run-id', 'owner').returncode, 0)
        self.assertNotEqual(self.run_lock('release', '--run-id', 'other').returncode, 0)
        self.assertEqual(self.run_lock('release', '--run-id', 'owner').returncode, 0)
        self.assertEqual(json.loads(self.run_lock('show').stdout), None)
        self.assertEqual(self.run_lock('acquire', '--run-id', 'next').returncode, 0)

    def test_concurrent_acquisition_has_exactly_one_winner(self):
        processes = [subprocess.Popen(self.command('acquire', '--run-id', str(i)),
                                     cwd=self.repo, stdout=subprocess.PIPE,
                                     stderr=subprocess.PIPE) for i in range(6)]
        for process in processes:
            process.communicate(timeout=20)
        self.assertEqual(sum(p.returncode == 0 for p in processes), 1)

    def test_card_cannot_escape_lock_directory(self):
        command = self.command('acquire', '--run-id', 'owner')
        command[command.index('MUV-15')] = '../outside'
        result = subprocess.run(command, cwd=self.repo, capture_output=True)
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse((self.repo / '.git/muvit-autonomous').exists())

    def test_linked_worktree_shares_reservation(self):
        subprocess.run(['git', '-c', 'user.name=Teste', '-c', 'user.email=test@example.invalid',
                        '-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-qm', 'fixture'],
                       cwd=self.repo, check=True)
        linked = self.repo / 'linked'
        subprocess.run(['git', 'worktree', 'add', '--detach', str(linked), 'HEAD'],
                       cwd=self.repo, check=True, capture_output=True)
        self.assertEqual(self.run_lock('acquire', '--run-id', 'owner').returncode, 0)
        other = subprocess.run(self.command('acquire', '--run-id', 'other'), cwd=linked,
                               capture_output=True)
        self.assertNotEqual(other.returncode, 0)
        shown = subprocess.run(self.command('show'), cwd=linked, capture_output=True,
                               text=True, encoding='utf-8', check=True)
        self.assertEqual(json.loads(shown.stdout), json.loads(self.run_lock('show').stdout))

    def test_invalid_record_is_preserved(self):
        acquired = self.run_lock('acquire', '--run-id', 'owner')
        path = Path(json.loads(acquired.stdout)['lock_path'])
        path.write_text('{', encoding='utf-8')
        for action, args in [('acquire', ['--run-id', 'other']),
                             ('show', []), ('release', ['--run-id', 'owner'])]:
            with self.subTest(action=action):
                self.assertNotEqual(self.run_lock(action, *args).returncode, 0)
                self.assertEqual(path.read_text(encoding='utf-8'), '{')


if __name__ == '__main__':
    unittest.main()
