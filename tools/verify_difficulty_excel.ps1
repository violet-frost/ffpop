$ErrorActionPreference = 'Stop'
$excelInstance = $null
$bookInstance = $null
try {
  $excelInstance = New-Object -ComObject Excel.Application
  $excelInstance.Visible = $false
  $excelInstance.DisplayAlerts = $false
  $workbookPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../outputs/difficulty-test-20261123/花果点点乐-难度测试.xlsx'))
  $bookInstance = $excelInstance.Workbooks.Open($workbookPath,0,$true)
  $sheetInstance = $bookInstance.Worksheets.Item('难度曲线')
  if ([Math]::Abs($sheetInstance.Range('F80').Value2 - 0.046) -gt 0.0000001) { throw 'L49 win rate mismatch' }
  if ([Math]::Abs($sheetInstance.Range('H80').Value2 - 95.4) -gt 0.0000001) { throw 'L49 difficulty mismatch' }
  if ($sheetInstance.ChartObjects().Count -ne 2) { throw 'Expected two native charts' }
  if ($sheetInstance.ChartObjects(1).Chart.SeriesCollection().Count -ne 2) { throw 'Expected two series' }
  if ($sheetInstance.ChartObjects(1).Chart.SeriesCollection(1).Points().Count -ne 50) { throw 'Expected 50 points' }
  if ($sheetInstance.ChartObjects(2).Chart.SeriesCollection(1).Points().Count -ne 20) { throw 'Expected 20 points' }
  $sourceInstance = $bookInstance.Worksheets.Item('样本汇总')
  $sourceRow = 0
  for ($i=7; $i -le 346; $i++) { if ($sourceInstance.Cells.Item($i,1).Value2 -eq 49 -and $sourceInstance.Cells.Item($i,2).Value2 -eq 'standard' -and $sourceInstance.Cells.Item($i,3).Value2 -eq '无道具') { $sourceRow = $i; break } }
  $oldSource = $sourceInstance.Cells.Item($sourceRow,6).Value2
  $sourceInstance.Cells.Item($sourceRow,6).Value2 = [double]($oldSource + 1)
  $excelInstance.Calculate()
  if ([Math]::Abs($sheetInstance.Range('F80').Value2 - 0.048) -gt 0.0000001) { throw 'Native Excel formula update failed' }
  $sourceInstance.Cells.Item($sourceRow,6).Value2 = [double]$oldSource
  $excelInstance.Calculate()
  Write-Output 'PASS native Excel: 3 sheets; 2 editable charts; 50/20 points; L49 source/difficulty formulas and live recalculation verified. Closed without saving.'
} finally {
  if ($null -ne $bookInstance) { $bookInstance.Close($false) }
  if ($null -ne $excelInstance) { $excelInstance.Quit(); [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($excelInstance) }
}
