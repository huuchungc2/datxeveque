param(
    [Parameter(Mandatory = $true)]
    [string]$SourceSql,
    [Parameter(Mandatory = $true)]
    [string]$OutSql
)

$lines = Get-Content -LiteralPath $SourceSql -Encoding UTF8 | Select-Object -Skip 3
$all = @('SET NAMES utf8mb4;', 'SET CHARACTER SET utf8mb4;') + $lines
$utf8 = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllLines($OutSql, $all, $utf8)
