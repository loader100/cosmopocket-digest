# start-oauth.ps1
$ErrorActionPreference = "Stop"
$proxySourcePort = 5318
$listenerPort   = 5317

# 读取 .env 为当前进程变量
$dotenvPath = Join-Path $PSScriptRoot ".env"
if (Test-Path $dotenvPath) {
  Get-Content $dotenvPath | ForEach-Object {
    if ($_ -match "^\s*#") { return }
    if ($_ -match "^\s*$") { return }
    $kv = $_ -split "=",2
    if ($kv.Count -eq 2) {
      $key = $kv[0].Trim(); $val = $kv[1].Trim()
      $val = $val -replace '^\s*"(.*)"\s*$', '$1'
      $val = $val -replace "^\s*'(.*)'\s*$", '$1'
      [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
    }
  }
}

# 必备参数
$clientId  = $env:SLACK_CLIENT_ID
$scopes    = $env:SLACK_SCOPES
if ([string]::IsNullOrWhiteSpace($scopes)) { $scopes = "chat:write,channels:history,channels:read,users:read" }
$redirectUri = "https://localhost:$proxySourcePort/slack/oauth"
[System.Environment]::SetEnvironmentVariable("SLACK_REDIRECT_URI", $redirectUri, "Process")

# Node 环境 & 文件检查
$nodeVer = & node -v 2>$null
if ($LASTEXITCODE -ne 0) { throw "未检测到 Node.js" }
if (-not (Test-Path (Join-Path $PSScriptRoot "dev-oauth-listener.js"))) {
  throw "未找到 dev-oauth-listener.js"
}

# 启动监听
$listenerJob = Start-Job -ScriptBlock { Set-Location $using:PSScriptRoot; node dev-oauth-listener.js }
Start-Sleep -Seconds 1

# 启动 HTTPS 代理
$proxyJob = Start-Job -ScriptBlock {
  Set-Location $using:PSScriptRoot
  npx --yes local-ssl-proxy --source $using:proxySourcePort --target $using:listenerPort
}
Start-Sleep -Seconds 2

# 打开授权（V2）
$authorizeUrl = "https://slack.com/oauth/v2/authorize?client_id=$clientId&scope=$scopes&redirect_uri=$([System.Uri]::EscapeDataString($redirectUri))"
Write-Host "打开授权：`n$authorizeUrl"
Start-Process $authorizeUrl

Write-Host @"
按 Ctrl+C 停止，或在另一个 PowerShell 用以下命令结束后台作业：
Stop-Job $($listenerJob.Id); Remove-Job $($listenerJob.Id)
Stop-Job $($proxyJob.Id);    Remove-Job $($proxyJob.Id)
"@

