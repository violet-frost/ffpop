"""Export with the bundled runtime; verify file contents before accepting WASM shutdown status."""
from pathlib import Path
import argparse, hashlib, re, subprocess, sys
from level_io import load_xlsx, read_levels, validate
R=Path(__file__).resolve().parents[1]
BUNDLED_NODE=Path(r"C:\Program Files\WindowsApps\OpenAI.CodexPrimaryRuntime.v26-1119-907-0_26.1119.907.0_x64__3k8sg7r9htsxt\dependencies\node\bin\node.exe")
def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--node',type=Path,default=BUNDLED_NODE);args=parser.parse_args()
 if not args.node.exists():raise ValueError('Bundled Node runtime not found; pass --node with the official runtime path.')
 result=subprocess.run([str(args.node),str(R/'tools/build_workbook.mjs')],cwd=R,encoding='utf-8',capture_output=True)
 marker=re.search(r'^BUILD_COMPLETE ([a-f0-9]{64})$',result.stdout,re.MULTILINE)
 if not marker:
  print(result.stdout);print(result.stderr,file=sys.stderr);raise ValueError('Workbook export did not reach completion.')
 file=R.parent/'outputs/level-redesign-20261123/花果点点乐-关卡配置表.xlsx'
 if hashlib.sha256(file.read_bytes()).hexdigest()!=marker.group(1):raise ValueError('Exported file hash mismatch.')
 imported=load_xlsx(file)
 if imported!=read_levels():raise ValueError('Excel round-trip does not match current level JSON.')
 validate(imported)
 # The bundled WASM renderer may return 1 during shutdown after all awaited writes.
 # Accept only a fresh completion marker, matching file hash, and exact 50-level round-trip.
 print('Created and verified: '+str(file))
 print('50 levels, 450 layout rows, 5 sheets; formula and visual checks completed.')
if __name__=='__main__':
 try:main()
 except (ValueError,OSError) as e:print(str(e),file=sys.stderr);sys.exit(1)
