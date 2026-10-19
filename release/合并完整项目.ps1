$ErrorActionPreference = 'Stop'
$parts = @(Get-ChildItem -LiteralPath $PSScriptRoot -File -Filter 'PlayableStudio-complete-project.zip.*' | Sort-Object Name)
if ($parts.Count -eq 0) {
    throw '未找到完整项目 ZIP 分卷。请把脚本与全部 .zip.001、.002……文件放在同一目录。'
}
$output = Join-Path $PSScriptRoot 'PlayableStudio-complete-project.zip'
$target = [IO.File]::Create($output)
try {
    foreach ($part in $parts) {
        $source = [IO.File]::OpenRead($part.FullName)
        try { $source.CopyTo($target) } finally { $source.Dispose() }
    }
} finally {
    $target.Dispose()
}
$item = Get-Item -LiteralPath $output
$hash = (Get-FileHash -LiteralPath $output -Algorithm SHA256).Hash.ToLower()
Write-Host "已生成：$($item.FullName)"
Write-Host "大小：$($item.Length) 字节"
Write-Host "SHA-256：$hash"
