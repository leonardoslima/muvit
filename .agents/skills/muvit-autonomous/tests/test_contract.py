"""Testes estáticos do contrato da skill standalone. Não executam repo/CLI/Linear reais."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]

class MuvitContractTests(unittest.TestCase):
    def read(self, path):
        return (ROOT/path).read_text(encoding='utf-8')

    def test_skill_metadata(self):
        skill=self.read('SKILL.md')
        self.assertIn('name: muvit-autonomous', skill)
        self.assertRegex(skill, r'version: "\d+\.\d+\.\d+"')

    def test_standalone_files(self):
        for p in ['README.md','MIGRATION-NOTE.md','SKILL.md','references/selection-and-state.md',
                  'references/environment.md','references/superpowers-and-delegation.md',
                  'references/pr-and-review-loop.md','references/quality-and-qa.md',
                  'references/mobile.md','references/web-and-design.md',
                  'references/closure-and-recovery.md','templates/pr-description.md']:
            self.assertTrue((ROOT/p).is_file(), p)

    def test_one_card_and_batuta(self):
        s=self.read('SKILL.md')
        self.assertIn('um card', s.lower())
        self.assertIn('`batuta`',s)
        self.assertIn('Superpowers',s)

    def test_review_rules(self):
        s=self.read('references/pr-and-review-loop.md')
        for phrase in ['5 minutos','6 checagens','sem limite fixo','P0/P1','P2/P3','revisão humana','não fazer merge']:
            self.assertIn(phrase.lower(),s.lower())

    def test_qa_rules(self):
        s=self.read('references/environment.md')+self.read('references/mobile.md')+self.read('references/web-and-design.md')
        for phrase in ['Docker','PostgreSQL','API','adb','Orca','Pen CLI']:
            self.assertIn(phrase.lower(),s.lower())

    def test_no_fixed_role_models(self):
        for path in ROOT.rglob('*.md'):
            text=path.read_text(encoding='utf-8')
            self.assertNotRegex(text,re.compile(r'(?im)^\s*(?:model|model_reasoning_effort|reasoning_effort)\s*:\s*(?:gpt-|claude-|opus|sonnet|haiku|sol|luna)'))

    def test_not_updater(self):
        self.assertFalse((ROOT/'apply.py').exists())
        self.assertFalse((ROOT/'muvit-integration').exists())

    def test_reference_targets_exist(self):
        for path in ROOT.rglob('*.md'):
            text = path.read_text(encoding='utf-8')
            for target in re.findall(r'`((?:references|templates)/[^`]+)`', text):
                self.assertTrue((ROOT / target).exists(), f'{path.name}: {target}')

    def test_literal_utf8(self):
        for path in ROOT.rglob('*'):
            if path.is_file() and path.suffix in {'.md', '.py'}:
                text = path.read_text(encoding='utf-8')
                self.assertNotIn(chr(0xFFFD), text, str(path))

if __name__=='__main__': unittest.main()
