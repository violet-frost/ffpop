"""Round-trip JSON packs / configuration XLSX to the unique level JSON source."""
from pathlib import Path
import argparse, copy, json, os, subprocess, sys, tempfile, zipfile
import xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
HEADERS=['id','chapter','title','moves','colors','seed','difficulty','beat','focus','intent']+[f'goal{i}_{key}' for i in range(1,5) for key in ['kind','color','target']]+['tutorial_json','opening_json','demonstration_json','refill_json']+['booster_hammer','booster_glove','booster_watering','booster_dice','booster_maxUses','booster_tutorial','gravity']
def read_levels():return [json.loads(p.read_text(encoding='utf-8-sig')) for p in sorted((R/'data/levels').glob('level_*.json'))]
def read_sheets(file):
 with zipfile.ZipFile(file) as z:
  shared=[]
  if 'xl/sharedStrings.xml' in z.namelist():
   for si in ET.fromstring(z.read('xl/sharedStrings.xml')).findall('m:si',NS):shared.append(''.join(si.itertext()))
  rels=ET.fromstring(z.read('xl/_rels/workbook.xml.rels'));targets={r.attrib['Id']:r.attrib['Target'] for r in rels}
  sheets={}
  for s in ET.fromstring(z.read('xl/workbook.xml')).findall('m:sheets/m:sheet',NS):
   rid=s.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'];target=targets[rid];name=target.lstrip('/') if target.startswith('/') else 'xl/'+target
   rows=[]
   for row in ET.fromstring(z.read(name)).findall('m:sheetData/m:row',NS):
    cells={}
    for c in row.findall('m:c',NS):
     ref=c.attrib['r'];col=''.join(ch for ch in ref if ch.isalpha());v=c.find('m:v',NS);typ=c.attrib.get('t');value=v.text if v is not None else ''
     if typ=='s':value=shared[int(value)]
     elif typ=='inlineStr':value=''.join(c.find('m:is',NS).itertext())
     elif typ not in ('str','e','b') and value!='':
      try:value=float(value);value=int(value) if value.is_integer() else value
      except ValueError:pass
     cells[col]=value
    rows.append((int(row.attrib['r']),cells))
   sheets[s.attrib['name']]=rows
  return sheets

def column(i):
 s=''
 while i:i,r=divmod(i-1,26);s=chr(65+r)+s
 return s

def load_xlsx(file):
 sheets=read_sheets(file)
 if not {'关卡配置','棋盘布局'}.issubset(sheets):raise ValueError('缺少“关卡配置”或“棋盘布局”工作表')
 def records(name,expected):
  rows=sheets[name];header=next(((n,r) for n,r in rows if r.get('A')==expected[0]),None)
  if not header:raise ValueError(name+'找不到字段名行')
  n,cells=header
  if [cells.get(column(i+1),'') for i in range(len(expected))]!=expected:raise ValueError(name+'字段名或顺序不匹配，请保留原字段行')
  return [{key:r.get(column(i+1),'') for i,key in enumerate(expected)} for rn,r in rows if rn>n and r.get('A','')!='']
 config=records('关卡配置',HEADERS);layouts=records('棋盘布局',['id','row']+[f'c{i}' for i in range(1,9)])
 if len(config)!=50 or len(layouts)!=450:raise ValueError('完整表必须包含50关参数及450行布局')
 boards={}
 for row in layouts:
  lid,r=row['id'],row['row']
  if not isinstance(lid,int) or not 1<=lid<=50 or not isinstance(r,int) or not 1<=r<=9:raise ValueError('布局id或row无效')
  boards.setdefault(lid,{})
  if r in boards[lid]:raise ValueError('布局行重复')
  boards[lid][r]=[str(row[f'c{i}']) for i in range(1,9)]
 out=[]
 for row in config:
  lid=row['id']
  if lid not in boards or len(boards[lid])!=9:raise ValueError('关卡缺少完整棋盘')
  l={key:row[key] for key in ['id','chapter','moves','colors','seed']};l.update(rows=9,cols=8,shape=0,layout=[boards[lid][i] for i in range(1,10)])
  l['boxes']=sum(t=='#' for r in l['layout'] for t in r);l['ice']=sum(t.startswith('i') for r in l['layout'] for t in r)
  l['design']={key:row[key] for key in ['title','difficulty','beat','focus','intent']};l['goals']=[]
  for i in range(1,5):
   kind=row[f'goal{i}_kind'];target=row[f'goal{i}_target'];color=row[f'goal{i}_color']
   if kind=='':
    if target!='' or color!='':raise ValueError(f'第{lid}关目标{i}缺少kind')
    continue
   g={'kind':kind,'target':target}
   if kind=='color':g['color']=color
   l['goals'].append(g)
  for key in ['tutorial','opening','demonstration','refill']:
   v=row[key+'_json']
   if v!='':l[key]=json.loads(v)
  l['boosters']={k:row['booster_'+k] for k in ['hammer','glove','watering','dice','maxUses']}
  if row['booster_tutorial']!='':l['boosterTutorial']=row['booster_tutorial']
  l['gravity']=row['gravity']
  out.append(l)
 return sorted(out,key=lambda l:l['id'])

def load_input(file):
 if file.suffix.lower()=='.xlsx':return load_xlsx(file)
 obj=json.loads(file.read_text(encoding='utf-8-sig'))
 if not isinstance(obj,(dict,list)):raise ValueError('JSON必须为关卡对象或数组')
 return obj if isinstance(obj,list) else obj.get('levels',[obj])

def validate(levels):
 result=subprocess.run(['node',str(R/'tools/validate_pack.cjs')],input=json.dumps(levels,ensure_ascii=False),encoding='utf-8',capture_output=True)
 if result.returncode:raise ValueError(result.stderr.strip())

def candidate(file):
 incoming=load_input(file);validate(incoming);merged={l['id']:l for l in read_levels()};merged.update({l['id']:l for l in incoming});levels=[merged[i] for i in range(1,51)];validate(levels);return levels,len(incoming)

def main():
 parser=argparse.ArgumentParser(description=__doc__);sub=parser.add_subparsers(dest='command',required=True)
 imp=sub.add_parser('import');imp.add_argument('file',type=Path);imp.add_argument('--dry-run',action='store_true')
 exp=sub.add_parser('export');exp.add_argument('file',type=Path)
 args=parser.parse_args()
 if args.command=='export':args.file.write_text(json.dumps({'format':'bloom-level-pack-v2','levels':read_levels()},ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print('Exported 50 levels:',args.file);return
 levels,count=candidate(args.file)
 if args.dry_run:print(f'Validated {count} imported levels; all 50 resulting levels valid; no source files changed.');return
 # Stage every replacement and preserve a full rollback copy before replacing any source.
 backup=R/'tools/backups';backup.mkdir(exist_ok=True)
 from datetime import datetime
 dest=backup/('levels-'+datetime.now().strftime('%Y%m%d-%H%M%S-%f')+'.json');dest.write_text(json.dumps(read_levels(),ensure_ascii=False,indent=2),encoding='utf-8')
 staged=[]
 try:
  for l in levels:
   p=R/'data/levels'/f"level_{l['id']:03}.json";fd,tmp=tempfile.mkstemp(prefix=p.stem+'-',suffix='.tmp',dir=p.parent)
   with os.fdopen(fd,'w',encoding='utf-8') as f:json.dump(l,f,ensure_ascii=False,indent=2);f.write('\n')
   staged.append((Path(tmp),p))
  for tmp,p in staged:os.replace(tmp,p)
 except Exception:
  for l in json.loads(dest.read_text(encoding='utf-8')):(R/'data/levels'/f"level_{l['id']:03}.json").write_text(json.dumps(l,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
  raise
 finally:
  for tmp,_ in staged:
   if tmp.exists():tmp.unlink()
 subprocess.run([sys.executable,str(R/'build.py')],check=True)
 print(f'Imported {count} levels and rebuilt game/editor. Backup: {dest}')
 print('Run node tools/validate_levels.cjs then rebuild the Excel workbook to refresh validation results.')
if __name__=='__main__':
 try:main()
 except (ValueError,KeyError,TypeError,json.JSONDecodeError,zipfile.BadZipFile) as e:print('Import rejected:',e,file=sys.stderr);sys.exit(1)
