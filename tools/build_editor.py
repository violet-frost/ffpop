"""Build the offline editor from the same level JSON, rule engine and SVG assets."""
from pathlib import Path
import json
import base64
R=Path(__file__).resolve().parents[1]
def read(name):return (R/name).read_text(encoding='utf-8-sig')
def build_editor():
 levels=[json.loads(p.read_text(encoding='utf-8-sig')) for p in sorted((R/'data/levels').glob('level_*.json'))]
 assets={p.stem:p.read_text(encoding='utf-8-sig') for p in (R/'assets/textures').glob('*.svg')}
 assets.update({p.stem:'data:image/png;base64,'+base64.b64encode(p.read_bytes()).decode('ascii') for p in (R/'assets/textures').glob('*.png')})
 data='globalThis.BloomData='+json.dumps({'LEVELS':levels,'CHAPTERS':json.loads(read('data/config/chapters.json'))},ensure_ascii=False,separators=(',',':')).replace('</', '<'+chr(92)+'/')+';globalThis.BloomAssets='+json.dumps(assets,ensure_ascii=False,separators=(',',':')).replace('</', '<'+chr(92)+'/')+';'
 source=read('tools/editor/Editor.html')
 for key,value in {'STYLE':read('tools/editor/editor.css'),'DATA':data,'SCHEMA':read('scripts/board/LevelSchema.js'),'ENGINE':read('scripts/board/BoardModel.js'),'ART':read('scripts/entities/Art.js'),'APP':read('tools/editor/editor.js')}.items():source=source.replace('/* EDITOR_'+key+' */',value)
 return source
if __name__=='__main__':
 html=build_editor();(R/'level-editor.html').write_text(html,encoding='utf-8');print('Built level-editor.html: %d bytes; offline; shared engine.'%len(html.encode('utf-8')))
