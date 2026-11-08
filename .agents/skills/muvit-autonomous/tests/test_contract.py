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
        self.assertIn('version: "9.1.0"', skill)

    def test_standalone_files(self):
        for p in ['README.md','MIGRATION-NOTE.md','SKILL.md','agents.toml','references/selection-and-state.md',
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
        profile = tomllib.loads((ROOT / 'agents.toml').read_text(encoding='utf-8'))['profiles']['hybrid_go']['planner']
        expected = {
            '--agent': profile['agent'],
            '--model': profile['model'],
            '--effort': profile['effort'],
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

    def test_skill_owned_profiles(self):
        project = ROOT.parents[2]
        profiles = tomllib.loads((ROOT / 'agents.toml').read_text(encoding='utf-8'))
        coordinator_path = project / '.codex/config.toml'
        self.assertTrue(coordinator_path.is_file())
        coordinator = tomllib.loads(coordinator_path.read_text(encoding='utf-8'))
        self.assertEqual(coordinator['model'], profiles['profiles']['hybrid_go']['coordinator']['model'])
        self.assertEqual(coordinator['model_reasoning_effort'], profiles['profiles']['hybrid_go']['coordinator']['effort'])
        self.assertEqual(coordinator['agents']['max_concurrent_threads_per_session'], 3)
        hybrid = {
            'planner': ('codex', 'gpt-6.1-sol', 'medium'),
            'implementer': ('opencode', 'opencode-go/deepseek-v4.1-flash', None),
            'implementer_aux': ('opencode', 'opencode-go/deepseek-v4.1-flash', None),
            'reviewer': ('codex', 'gpt-6.1-sol', 'medium'),
            'quality_verifier': ('opencode', 'opencode-go/mimo-v2.6-flash', None),
            'visual_qa': ('opencode', 'opencode-go/deepseek-v4.1-flash', None),
            'escalation': ('codex', 'gpt-6.1-terra', 'high'),
            'coordinator': ('codex', 'gpt-6-luna', 'xhigh'),
        }
        codex_only = dict(hybrid)
        codex_only.update({
            'planner': ('codex', 'gpt-6-luna', 'medium'),
            'implementer': ('codex', 'gpt-6-luna', 'medium'),
            'implementer_aux': ('codex', 'gpt-6-luna', 'medium'),
            'quality_verifier': ('codex', 'gpt-6-luna', 'medium'),
            'visual_qa': ('codex', 'gpt-6.1-terra', 'medium'),
            'escalation': ('codex', 'gpt-6.1-sol', 'high'),
        })
        for mode, expected in [('hybrid_go', hybrid), ('codex_only', codex_only)]:
            for role, route in expected.items():
                with self.subTest(mode=mode, role=role):
                    config = profiles['profiles'][mode][role]
                    self.assertEqual((config['agent'], config['model'], config.get('effort')), route)
                    self.assertTrue(profiles['roles'][role]['instructions'].strip())
        for role in ('planner', 'implementer'):
            config = profiles['profiles']['codex_only'][f'{role}_complex']
            self.assertEqual((config['agent'], config['model'], config['effort']), ('codex', 'gpt-6.1-sol', 'medium'))
        self.assertFalse(list((project / '.codex/agents').glob('muvit-*.toml')))

    def test_hybrid_profiles_and_delegation_contract(self):
        protocol = self.read('references/superpowers-and-delegation.md')
        profiles = self.read('agents.toml')
        self.assertIn('opencode-go/deepseek-v4.1-flash', profiles)
        self.assertIn('opencode-go/mimo-v2.6-flash', profiles)
        self.assertNotIn('opencode/deepseek-v4.1-flash-free', profiles)
        self.assertIn('agents.toml', protocol)
        self.assertIn('--from <handle-do-pai>', protocol)
        self.assertIn('quatro agentes', protocol.lower())
        self.assertIn('dois níveis', protocol.lower())
        self.assertIn('revisor', protocol.lower())
        self.assertIn('verificador', protocol.lower())
        self.assertIn('não iniciam outros agentes', protocol.lower())

    def test_codex_only_mode_is_selected_before_claim(self):
        skill = self.read('SKILL.md')
        protocol = self.read('references/superpowers-and-delegation.md')
        self.assertIn('codex_only', skill)
        self.assertIn('hybrid_go', skill)
        self.assertIn('antes do claim', protocol.lower())
        self.assertIn('sem OpenCode Go', protocol)
        self.assertIn('não troque', protocol.lower())
        self.assertIn('planner_complex', protocol)
        self.assertIn('implementer_complex', protocol)
        self.assertIn('antes do claim', protocol.lower())

    def test_not_updater(self):
        self.assertFalse((ROOT/'apply.py').exists())
        self.assertFalse((ROOT/'muvit-integration').exists())

if __name__=='__main__': unittest.main()
