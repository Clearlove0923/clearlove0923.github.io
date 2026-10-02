# Refresh the cache-busting stamp on the site pages.
# Replaces  css/style.css?v=...  and  js/site-edit.js?v=...  with  ?v=<current timestamp>.
# Idempotent: running it twice only updates the stamp, it never stacks up.
# This is the PowerShell twin of the sed block inside deploy.sh, so that
# push.bat can do the same job without needing bash.
#
# ASCII-only on purpose: Windows PowerShell 5.1 reads .ps1 files as ANSI when
# they have no BOM, so non-ASCII text here would show up garbled.

$ErrorActionPreference = 'Stop'

$root  = Split-Path -Parent $PSScriptRoot
$stamp = (Get-Date).ToString('yyyyMMddHHmmss')

$pages = @(
  'index.html',
  '404.html',
  'about.html',
  'docs.html',
  'features.html',
  'tutorial.html',
  'docs/learning-guide.html',
  'examples/md-maintain.html',
  'examples/md.html'
)

$utf8 = New-Object -TypeName System.Text.UTF8Encoding -ArgumentList $false
$hit  = 0

foreach ($rel in $pages) {
  $full = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $full)) { continue }

  $text = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
  $new  = [regex]::Replace($text, '(css/style\.css|js/site-edit\.js)\?v=[^"]*', ('$1?v=' + $stamp))

  if ($new -ne $text) {
    [System.IO.File]::WriteAllText($full, $new, $utf8)
    $hit++
  }
}

Write-Host ("cache stamp = {0}  ({1} page(s) updated)" -f $stamp, $hit)
