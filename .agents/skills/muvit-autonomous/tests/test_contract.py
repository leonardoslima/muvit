"""Testes estáticos do contrato da skill standalone. Não executam repo/CLI/Linear reais."""
from pathlib import Path
import re
import shlex
import tomllib
import unittest

ROOT = Path(__file__).resolve().parents[1]

class MuvitContractTests(unittest.TestCase):
    def read(self, path):
        return (ROOT/path).read_text(encoding='utf-8')

    def test_skill_metadata(self):
        skill=self.read('SKILL.md')
        self.assertIn('name: muvit-autonomous', skill)
        self.assertIn('version: "8.2.0"', skill)

    def test_standalone_files(self):
        for p in ['README.md','MIGRATION-NOTE.md','SKILL.md','references/selection-and-state.md',
                  'references/environment.md','references/superpowers-and-delegation.md',
                  'references/pr-and-review-loop.md','references/quality-and-qa.md',
                  'references/mobile.md','references/web-and-design.md',
                  'references/closure-and-recovery.md','templates/pr-description.md']:
            self.assertTrue((ROOT/p).is_file(), p)

    def test_one_card_and_orca_delegation(self):
        s=self.read('SKILL.md')
        self.assertIn('um card', s.lower())
        self.assertNotIn('`orchestrator`',s)
        self.assertIn('Superpowers',s)
        self.assertIn('agente', s.lower())
        self.assertIn('Orca', s)

    def test_orca_launch_matches_planner_profile(self):
        protocol = self.read('references/superpowers-and-delegation.md')
        commands = re.findall(r'^ORCA orchestration worker-start .+$', protocol, re.MULTILINE)
        self.assertEqual(len(commands), 1, 'Manter um exemplo de lançamento verificável')
        args = shlex.split(commands[0])
        profile_path = ROOT.parents[2] / '.codex/agents/muvit-planner.toml'
        profile = tomllib.loads(profile_path.read_text(encoding='utf-8'))
        expected = {
            '--agent': 'codex',
            '--model': profile['model'],
            '--effort': profile['model_reasoning_effort'],
            '--worktree': '<seletor-exato-da-worktree-do-card>',
        }
        for flag, value in expected.items():
            self.assertIn(flag, args)
            self.assertEqual(args[args.index(flag) + 1], value)
        self.assertIn('--spec-file', args)
        self.assertNotIn('--surface', args)
        self.assertNotIn('fork_turns', protocol)

    def test_orca_recovery_and_resume_contract(self):
        protocol = self.read('references/superpowers-and-delegation.md')
        for command in ['skills get orchestration', 'orchestration send',
                        'orchestration worker-read', 'worker_done']:
            with self.subTest(command=command):
                self.assertIn(command, protocol)
        recovery = self.read('references/closure-and-recovery.md')
        self.assertIn('references/recovery-and-cleanup.md', recovery)
        self.assertIn('Dispatch', recovery)
        progress = self.read('templates/progress.md')
        self.assertIn('Run/Task/Dispatch', progress)
        self.assertIn('chat/CLI', progress)

    def test_review_rules(self):
        s=self.read('references/pr-and-review-loop.md')
        for phrase in ['5 minutos','6 checagens','sem limite fixo','P0/P1','P2/P3','revisão humana','não fazer merge']:
            self.assertIn(phrase.lower(),s.lower())

    def test_qa_rules(self):
        s=self.read('references/environment.md')+self.read('references/mobile.md')+self.read('references/web-and-design.md')
        for phrase in ['Docker','PostgreSQL','API','adb','Orca','Pen CLI']:
            self.assertIn(phrase.lower(),s.lower())

    def test_fixed_project_profiles(self):
        project = ROOT.parents[2]
        coordinator_path = project / '.codex/config.toml'
        self.assertTrue(coordinator_path.is_file())
        coordinator = tomllib.loads(coordinator_path.read_text(encoding='utf-8'))
        self.assertEqual(coordinator['model'], 'gpt-6.1-terra')
        self.assertEqual(coordinator['model_reasoning_effort'], 'medium')
        self.assertEqual(coordinator['agents']['max_concurrent_threads_per_session'], 3)
        expected = {
            'planner': ('gpt-6.1-sol', 'high'),
            'implementer': ('gpt-6.1-terra', 'xhigh'),
            'reviewer': ('gpt-6.1-sol', 'high'),
            'quality-verifier': ('gpt-6-luna', 'medium'),
            'visual-qa': ('gpt-6.1-terra', 'medium'),
        }
        for role, profile in expected.items():
            with self.subTest(role=role):
                path = project / '.codex/agents' / f'muvit-{role}.toml'
                self.assertTrue(path.is_file(), str(path))
                config = tomllib.loads(path.read_text(encoding='utf-8'))
                self.assertEqual(config['name'], f'muvit-{role}')
                self.assertEqual((config['model'], config['model_reasoning_effort']), profile)
                self.assertTrue(config['description'].strip())
                self.assertTrue(config['developer_instructions'].strip())
                for key in ['sandbox_mode', 'approval_policy', 'model_provider', 'mcp_servers']:
                    self.assertNotIn(key, config)

    def test_not_updater(self):
        self.assertFalse((ROOT/'apply.py').exists())
        self.assertFalse((ROOT/'muvit-integration').exists())

if __name__=='__main__': unittest.main()
