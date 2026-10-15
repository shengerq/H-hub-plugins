param()
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path $PSScriptRoot
$taskIndex = Get-Content (Join-Path $taskRoot 'index.json') -Raw -Encoding UTF8 | ConvertFrom-Json
function Pack-Fields($fields) {
    $result = ''
    foreach ($field in $fields) { $result += [Text.Encoding]::UTF8.GetByteCount([string]$field).ToString([Globalization.CultureInfo]::InvariantCulture) + ':' + [string]$field }
    return $result
}
function Hash-Text([string]$value) {
    $sha = [Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($value))).Replace('-', '').ToLowerInvariant() } finally { $sha.Dispose() }
}
$taskSums = @()
foreach ($entry in $taskIndex.plugins) {
    if ($entry.packageUrl -notmatch '^(?!.*(?:^|/)\.\.?/)(?:[^/\\:%?#]+/)*[^/\\:%?#]+\.hhub$') { throw '包路径必须是安全的相对 .hhub 路径' }
    $path = Join-Path $taskRoot $entry.packageUrl
    $package = Get-Content $path -Raw -Encoding UTF8 | ConvertFrom-Json
    foreach ($key in @('id','name','author','version','compatibility')) {
        $entry | Add-Member -NotePropertyName $key -NotePropertyValue $package.$key -Force
    }
    $entry.sha256 = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant()
    $c = $package.compatibility
    if (-not $c) { throw "插件缺少 compatibility：$($entry.id)" }
    $fields = @('hhub-contract/1', $c.scope, $c.deviceName, $c.hardwareId, $c.mobileUi.ToString().ToLowerInvariant())
    $firmwares = [string[]]@($c.firmwareVersions)
    [Array]::Sort($firmwares, [StringComparer]::Ordinal)
    $canonical = Pack-Fields ($fields + $firmwares)
    $code = 'HHUB1-' + (Hash-Text (Pack-Fields @($entry.id, $entry.author, $entry.version, $entry.sha256, $canonical)))
    $entry | Add-Member -NotePropertyName identityCode -NotePropertyValue $code -Force
    $taskSums += "$($entry.sha256)  $($entry.packageUrl)"
}
# Preserve records for audit; records tied to old hashes no longer confer verification.
[IO.File]::WriteAllText((Join-Path $taskRoot 'index.json'), ($taskIndex | ConvertTo-Json -Depth 32).Replace("`r`n", "`n") + "`n", [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $taskRoot 'SHA256SUMS.txt'), ($taskSums -join "`n") + "`n", [Text.UTF8Encoding]::new($false))
& (Join-Path $PSScriptRoot 'verify-index.ps1')
