"""Check Excel round-trip, editability, import validation, and exported workbook features."""
from pathlib import Path
import importlib.util, json, tempfile, unittest, zipfile
import xml.etree.ElementTree as ET
R=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('level_io',R/'tools/level_io.py');io=importlib.util.module_from_spec(spec);spec.loader.exec_module(io)
BOOK=R.parent/'outputs/level-redesign-20261123/花果点点乐-关卡配置表.xlsx'
NS={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
class LevelIOChecks(unittest.TestCase):
 def test_exact_semantic_round_trip(self):
  self.assertEqual(io.load_xlsx(BOOK),io.read_levels());io.validate(io.load_xlsx(BOOK))
 def test_excel_parameter_and_board_edits_are_read_back(self):
  with tempfile.TemporaryDirectory(prefix='bloom-xlsx-') as folder:
   changed=Path(folder)/'changed.xlsx'
   with zipfile.ZipFile(BOOK) as src,zipfile.ZipFile(changed,'w',zipfile.ZIP_DEFLATED) as dst:
    for name in src.namelist():
     data=src.read(name)
     if name in ['xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml']:
      root=ET.fromstring(data);ref='D7' if name.endswith('sheet2.xml') else 'C7';cell=root.find(f'.//m:c[@r="{ref}"]',NS);self.assertIsNotNone(cell)
      for child in list(cell):cell.remove(child)
      if ref=='D7':cell.attrib.pop('t',None);ET.SubElement(cell,'{'+NS['m']+'}v').text='11'
      else:cell.set('t','inlineStr');ET.SubElement(ET.SubElement(cell,'{'+NS['m']+'}is'),'{'+NS['m']+'}t').text='#'
      data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
     dst.writestr(name,data)
   levels=io.load_xlsx(changed);self.assertEqual(levels[0]['moves'],11);self.assertEqual(levels[0]['layout'][0][0],'#');self.assertEqual(levels[0]['boxes'],1);io.validate(levels)
 def test_booster_counts_import_and_reject_invalid_shared_cap(self):
  with tempfile.TemporaryDirectory(prefix='bloom-boosters-xlsx-') as folder:
   file=Path(folder)/'boosters.xlsx'
   with zipfile.ZipFile(BOOK) as src,zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as dst:
    for name in src.namelist():
     data=src.read(name)
     if name=='xl/worksheets/sheet2.xml':
      root=ET.fromstring(data)
      for ref in ['AA11','AE11']:
       cell=root.find(f'.//m:c[@r="{ref}"]',NS);self.assertIsNotNone(cell)
       for child in list(cell):cell.remove(child)
       cell.attrib.pop('t',None);ET.SubElement(cell,'{'+NS['m']+'}v').text='2'
      data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
     dst.writestr(name,data)
   levels=io.load_xlsx(file);self.assertEqual(levels[4]['boosters']['hammer'],2);self.assertEqual(levels[4]['boosters']['maxUses'],2);self.assertEqual(levels[4]['boosterTutorial'],'hammer');io.validate(levels)
   levels[4]['boosters']['maxUses']=8
   with self.assertRaises(ValueError):io.validate(levels)
 def test_gravity_mode_round_trip_and_validation(self):
  self.assertTrue(all(l['gravity']=='flow' for l in io.load_xlsx(BOOK)))
  with tempfile.TemporaryDirectory(prefix='bloom-gravity-xlsx-') as folder:
   file=Path(folder)/'gravity.xlsx'
   with zipfile.ZipFile(BOOK) as src,zipfile.ZipFile(file,'w',zipfile.ZIP_DEFLATED) as dst:
    for name in src.namelist():
     data=src.read(name)
     if name=='xl/worksheets/sheet2.xml':
      root=ET.fromstring(data);cell=root.find('.//m:c[@r="AG7"]',NS);self.assertIsNotNone(cell)
      for child in list(cell):cell.remove(child)
      cell.set('t','inlineStr');ET.SubElement(ET.SubElement(cell,'{'+NS['m']+'}is'),'{'+NS['m']+'}t').text='segment'
      data=ET.tostring(root,encoding='utf-8',xml_declaration=True)
     dst.writestr(name,data)
   levels=io.load_xlsx(file);self.assertEqual(levels[0]['gravity'],'segment');io.validate(levels)
   levels[0]['gravity']='invalid'
   with self.assertRaises(ValueError):io.validate(levels)
 def test_invalid_import_keeps_every_source_file_unchanged(self):
  before={p:p.read_bytes() for p in (R/'data/levels').glob('*.json')}
  with tempfile.TemporaryDirectory(prefix='bloom-import-') as folder:
   file=Path(folder)/'bad.json';level=io.read_levels()[0];level['moves']=0;file.write_text(json.dumps(level),encoding='utf-8')
   with self.assertRaises(ValueError):io.candidate(file)
   file.write_text('null',encoding='utf-8')
   with self.assertRaises(ValueError):io.load_input(file)
  self.assertEqual(before,{p:p.read_bytes() for p in before})
 def test_workbook_formulas_native_chart_and_controls_exported(self):
  with zipfile.ZipFile(BOOK) as z:
   chart=ET.fromstring(z.read(next(n for n in z.namelist() if '/charts/' in n and n.endswith('.xml'))));cns={'c':'http://schemas.openxmlformats.org/drawingml/2006/chart','a':'http://schemas.openxmlformats.org/drawingml/2006/main'}
   self.assertEqual(len(chart.findall('.//c:ser',cns)),2);colors=[x.get('val') for x in chart.findall('.//a:srgbClr',cns)];self.assertIn('315E44',colors);self.assertIn('A66B87',colors)
   for name in ['xl/worksheets/sheet1.xml','xl/worksheets/sheet2.xml','xl/worksheets/sheet3.xml']:
    root=ET.fromstring(z.read(name));self.assertIsNotNone(root.find('m:sheetViews/m:sheetView/m:pane',NS))
    for cell in root.findall('.//m:c',NS):self.assertNotEqual(cell.attrib.get('t'),'e',cell.attrib['r'])
   config=ET.fromstring(z.read('xl/worksheets/sheet2.xml'));self.assertIsNotNone(config.find('m:dataValidations',NS));self.assertTrue(any(n.startswith('xl/tables/') for n in z.namelist()))
if __name__=='__main__':unittest.main(verbosity=2)
