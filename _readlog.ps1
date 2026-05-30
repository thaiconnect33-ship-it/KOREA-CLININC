param([string]$Path, [int]$Tail = 6)
if (-not (Test-Path $Path)) { Write-Output "no log"; return }
$fs = [System.IO.File]::Open($Path, 'Open', 'Read', 'ReadWrite')
$reader = New-Object System.IO.StreamReader($fs, [System.Text.Encoding]::UTF8)
$txt = $reader.ReadToEnd()
$reader.Close()
$fs.Close()
$lines = $txt -split "`n"
$lines | Select-Object -Last $Tail
