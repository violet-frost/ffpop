"""Build offline HTML from page fragments, JS, JSON and SVG. Standard library only."""
from pathlib import Path
import json
import base64
import re
ROOT = Path(__file__).resolve().parent

def read(path):
    return (ROOT / path).read_text(encoding='utf-8-sig')

def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')

def expand(text, stack=()):
    def include(match):
        kind, name = match.groups()
        path = ('scenes' if kind == 'VIEW' else 'scripts') + '/' + name
        if path in stack:
            raise ValueError('Circular include: ' + path)
        value = expand(read(path), stack + (path,))
        return '`' + value + '`' if kind == 'VIEW' else value
    return re.sub(r'/\* (VIEW|SCRIPT):([^*]+?) \*/', include, text)

def build():
    files = sorted((ROOT / 'data/levels').glob('level_*.json'))
    assert len(files) == 50, 'Exactly 50 level JSON files required'
    levels = [json.loads(f.read_text(encoding='utf-8-sig')) for f in files]
    assert [level['id'] for level in levels] == list(range(1, 51))
    data = {'LEVELS':levels, 'CHAPTERS':json.loads(read('data/config/chapters.json')), 'MOTION':json.loads(read('data/config/motion.json')), 'CONFIG':json.loads(read('data/config/game.json'))}
    assets = {f.stem:f.read_text(encoding='utf-8-sig') for f in sorted((ROOT / 'assets/textures').glob('*.svg'))}
    assets.update({f.stem:('data:'+'image/jpeg;'+'base64,')+base64.b64encode(f.read_bytes()).decode('ascii') for f in sorted((ROOT / 'assets/illustrations').glob('*.jpg'))})
    assets.update({f.stem:('data:'+'image/png;'+'base64,')+base64.b64encode(f.read_bytes()).decode('ascii') for f in sorted((ROOT / 'assets/textures').glob('*.png'))})
    sources = {'STYLES':read('scripts/ui/styles.css'), 'DATA':'globalThis.BloomData='+compact(data)+';', 'ASSETS':'globalThis.BloomAssets='+compact(assets)+';', 'ENGINE':read('scripts/board/LevelSchema.js')+'\n'+read('scripts/board/BoardModel.js'), 'ART':read('scripts/entities/Art.js'), 'MOTION':read('scripts/systems/MotionSystem.js'), 'APP':expand(read('scripts/managers/GameManager.js'))}
    html = read('scenes/main/Main.html')
    for marker, content in sources.items():
        html = html.replace('/* ' + marker + ' */', content)
    assert not re.search(r'/\* (VIEW|SCRIPT):', html), 'Unresolved include'
    return html

if __name__ == '__main__':
    html = build()
    (ROOT / 'index.html').write_text(html, encoding='utf-8')
    from tools.build_editor import build_editor
    (ROOT / 'level-editor.html').write_text(build_editor(), encoding='utf-8')
    print('Built index.html: %d bytes; 50 levels; offline; no dependencies.' % len(html.encode('utf-8')))
