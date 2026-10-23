# Purpose: v0.1-5 - install the Codex attachment manager on Windows in one line, without opening GitHub:
#   irm https://github.com/chipfighter/context-attachment-manager/releases/latest/download/install.ps1 | iex
# Codex's own command line adds this repository as a plugin marketplace and installs the plugin; the installed plugin
# then points Codex at its local engine (cam setup) and starts it. Running it again upgrades. Restart Codex afterwards.
# Input: CAM_REF (a tag or branch; a release sets its own tag), CAM_SOURCE (a local checkout, for tests),
# CODEX_CLI_PATH, CODEX_HOME. Output: Codex's plugin cache, config.toml (backed up first) and, when needed, .env.
# ASCII only: Windows PowerShell 5.1 decodes a downloaded script as Latin-1. The body runs in its own scope, so the
# user's session keeps its own settings.

& {
  $ErrorActionPreference = 'Stop'
  $repo = 'chipfighter/context-attachment-manager'
  $name = 'codex-attachment-manager'
  $plugin = "$name@$name"

  function Find-Codex {
    if ($env:CODEX_CLI_PATH -and (Test-Path -LiteralPath $env:CODEX_CLI_PATH)) { return $env:CODEX_CLI_PATH }
    # The desktop app keeps one folder per build; the newest belongs to the app that runs now.
    $bin = Join-Path $env:LOCALAPPDATA 'OpenAI\Codex\bin'
    if (Test-Path -LiteralPath $bin) {
      $newest = Get-ChildItem -LiteralPath $bin -Directory | ForEach-Object { Join-Path $_.FullName 'codex.exe' } |
        Where-Object { Test-Path -LiteralPath $_ } | Sort-Object { (Get-Item -LiteralPath $_).LastWriteTime } -Descending | Select-Object -First 1
      if ($newest) { return $newest }
    }
    $onPath = Get-Command codex -All -ErrorAction SilentlyContinue | Where-Object { $_.Source -match '\.(exe|cmd)$' } | Select-Object -First 1
    if ($onPath) { return $onPath.Source }
    throw 'Codex command line not found. Install the Codex desktop app and open it once, or set CODEX_CLI_PATH to codex.exe.'
  }

  # Codex prints warnings on stderr; they are not failures.
  function Invoke-Codex([string[]]$CodexArgs, [switch]$AllowFailure, [switch]$PassThru) {
    $ErrorActionPreference = 'Continue'
    $stderrFile = [IO.Path]::GetTempFileName()
    $output = (& $codex @CodexArgs 2>$stderrFile | ForEach-Object { "$_" }) -join "`n"
    if ($LASTEXITCODE -ne 0 -and -not $AllowFailure) { throw "codex $($CodexArgs -join ' ') failed: $output $(Get-Content -LiteralPath $stderrFile -Raw)" }
    if ($PassThru) { return $output }
  }

  $codex = Find-Codex
  $codexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $HOME '.codex' }
  # A release replaces the placeholder with its own tag; a copy from the repository follows the default branch.
  $ref = if ($env:CAM_REF) { $env:CAM_REF } elseif ('__CAM_REF__' -notlike '__*') { '__CAM_REF__' } else { $null }
  $source = if ($env:CAM_SOURCE) { $env:CAM_SOURCE } else { $repo }

  Write-Host "Installing the plugin with $codex ..."
  $root = Join-Path $codexHome "plugins\cache\$name\$name"
  # Codex may clean old cache files even when Windows keeps a running plugin's directory locked.
  $cached = @(Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^\d+\.\d+\.\d+([-+][\w.-]+)?$' })
  $cacheBackup = Join-Path ([IO.Path]::GetTempPath()) ("cam-runtime-backup-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $cacheBackup | Out-Null
  foreach ($entry in $cached) { Copy-Item -LiteralPath $entry.FullName -Destination $cacheBackup -Recurse -Force }
  $installed = $null
  try {
    # Refresh marketplace metadata without deleting the working plugin first.
    Invoke-Codex @('plugin', 'marketplace', 'remove', $name) -AllowFailure
    $add = @('plugin', 'marketplace', 'add', $source)
    if ($ref -and -not $env:CAM_SOURCE) { $add += @('--ref', $ref) }
    Invoke-Codex $add
    $result = Invoke-Codex @('plugin', 'add', '--json', $plugin) -PassThru | ConvertFrom-Json
    if ($result.version -notmatch '^\d+\.\d+\.\d+([-+][\w.-]+)?$') { throw 'Invalid installed plugin version.' }
    $installed = Get-Item -LiteralPath (Join-Path $root $result.version)
    if (-not (Test-Path -LiteralPath (Join-Path $installed.FullName 'src\cam.ts'))) { $installed = $null; throw 'The new plugin runtime is incomplete.' }
  } finally {
    foreach ($entry in $cached) {
      if ($installed -and $entry.Name -eq $installed.Name) { continue }
      $target = Join-Path $root $entry.Name
      New-Item -ItemType Directory -Path $target -Force | Out-Null
      Get-ChildItem -LiteralPath (Join-Path $cacheBackup $entry.Name) -Force | ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $target -Recurse -Force }
    }
  }
  # The installed plugin writes the proxy settings itself (checking for conflicts first) and starts its engine.
  Write-Host 'Pointing Codex at the local engine ...'
  & cmd.exe /d /s /c call "$($installed.FullName)\scripts\launch.cmd" "$($installed.FullName)\src\cam.ts" setup
  if ($LASTEXITCODE -ne 0) { throw 'The proxy settings were not written (see above); Codex still connects directly.' }
  Write-Host ''
  Write-Host 'Done. Restart Codex, then open the panel from the side panel: New tab > Plugins and MCP.'
}
