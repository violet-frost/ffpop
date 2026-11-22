"""Validate the reorganized deliverable against its actual inputs."""
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('bloom_build', ROOT / 'build.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)

class BuildChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / 'index.html').read_text(encoding='utf-8-sig')

    def test_delivered_html_matches_sources(self):
        self.assertEqual(self.html, builder.build())

    def test_level_data_is_embedded_from_json(self):
        data = json.loads(re.search(r'globalThis.BloomData=(.*?);</script>', self.html).group(1))
        levels = [json.loads(p.read_text(encoding='utf-8')) for p in sorted((ROOT/'data/levels').glob('level_*.json'))]
        self.assertEqual(data['LEVELS'], levels)
        self.assertEqual(len(levels), 50)
        self.assertEqual(data['MOTION'], json.loads((ROOT/'data/config/motion.json').read_text()))

    def test_no_unresolved_templates_or_remote_loads(self):
        self.assertNotRegex(self.html, r'/\* (VIEW|SCRIPT):')
        self.assertNotRegex(self.html, r'<(?:script|link|img)[^>]+(?:src|href)=[\"\']https?://')
        self.assertNotIn('<script src=', self.html)
        self.assertNotIn('fetch(', self.html)
        self.assertFalse((ROOT/'project.godot').exists())
        self.assertEqual(list(ROOT.rglob('*.gd')), [])

    def test_editor_matches_shared_sources(self):
        import sys
        sys.path.insert(0,str(ROOT))
        from tools.build_editor import build_editor
        self.assertEqual((ROOT/'level-editor.html').read_text(encoding='utf-8-sig'),build_editor())

    def test_embedded_scripts_parse(self):
        for index, script in enumerate(re.findall(r'<script>(.*?)</script>', self.html, re.S)):
            result = subprocess.run(['node', '--check'], input=script, text=True, encoding='utf-8', capture_output=True)
            self.assertEqual(result.returncode, 0, f'script {index}: {result.stderr}')

if __name__ == '__main__':
    unittest.main(verbosity=2)
