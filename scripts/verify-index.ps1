param()
$ErrorActionPreference = 'Stop'
$taskRepositoryRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskIndex = Get-Content -LiteralPath (Join-Path $taskRepositoryRoot 'index.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($taskIndex.schemaVersion -ne 1 -or @($taskIndex.plugins).Count -eq 0) { throw '索引版本不支持或插件列表为空' }
$taskSeenIds = @{}
foreach ($taskEntry in $taskIndex.plugins) {
    if ([string]::IsNullOrWhiteSpace($taskEntry.group) -or [string]::IsNullOrWhiteSpace($taskEntry.category)) { throw "插件需明确填写 group 和 category：$($taskEntry.id)" }
    if ($taskSeenIds.ContainsKey($taskEntry.id)) { throw "重复插件 ID: $($taskEntry.id)" }
    $taskSeenIds[$taskEntry.id] = $true
    if ($taskEntry.packageUrl -notmatch '^[^/\\:]+\.hhub$') { throw "当前索引需使用根目录 .hhub 文件名: $($taskEntry.packageUrl)" }
    $taskPackagePath = Join-Path $taskRepositoryRoot $taskEntry.packageUrl
    $taskPackage = Get-Content -LiteralPath $taskPackagePath -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($taskField in @('id', 'name', 'author', 'version')) {
        if ([string]::IsNullOrWhiteSpace([string]$taskEntry.$taskField) -or $taskEntry.$taskField -cne $taskPackage.$taskField) { throw "身份字段不匹配: $($taskEntry.packageUrl) / $taskField" }
    }
    if ($taskEntry.version -notmatch '^\d+(\.\d+)+$') { throw "版本格式无效: $($taskEntry.version)" }
    $taskActualHash = (Get-FileHash -LiteralPath $taskPackagePath -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($taskEntry.sha256 -notmatch '^[a-fA-F0-9]{64}$' -or $taskActualHash -ne $taskEntry.sha256) { throw "SHA-256 不匹配: $($taskEntry.packageUrl)" }
    Write-Output "PASS $($taskEntry.id) $($taskEntry.version) $taskActualHash"
}
Write-Output "校验通过：$(@($taskIndex.plugins).Count) 个插件。未进行设备测试。"
$taskCompiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
$taskExecutable = Join-Path ([IO.Path]::GetTempPath()) ('Hhub.Contract-' + [Guid]::NewGuid().ToString('N') + '.exe')
try {
    & $taskCompiler /nologo /target:exe ("/out:" + $taskExecutable) /reference:System.Web.Extensions.dll (Join-Path $PSScriptRoot 'PluginContract.cs')
    if ($LASTEXITCODE -ne 0) { throw '契约检查器编译失败' }
    & $taskExecutable (Join-Path $taskRepositoryRoot 'index.json')
    if ($LASTEXITCODE -ne 0) { throw '设备匹配或验证编码检查失败' }
} finally { if (Test-Path -LiteralPath $taskExecutable) { Remove-Item -LiteralPath $taskExecutable } }
