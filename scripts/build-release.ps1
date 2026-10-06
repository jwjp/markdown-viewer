param(
    [string]$SigningKeyPath = (Join-Path (Join-Path $env:USERPROFILE '.tauri') 'markdown-viewer.key'),
    [switch]$UseEnvironmentKey
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$config = Get-Content -LiteralPath (Join-Path $repoRoot 'src-tauri\tauri.conf.json') -Raw | ConvertFrom-Json
$package = Get-Content -LiteralPath (Join-Path $repoRoot 'package.json') -Raw | ConvertFrom-Json
$cargoManifest = Get-Content -LiteralPath (Join-Path $repoRoot 'src-tauri\Cargo.toml') -Raw
$version = $config.version
$expectedKeyHash = '38d132d18af16cd1b9cd663a81b902c267abecdfce386b20f05b94e8603b11f1'

if ($package.version -ne $version -or $cargoManifest -notmatch "(?m)^version = `"$([regex]::Escape($version))`"\r?$") {
    throw 'The Tauri, npm, and Cargo versions must match.'
}
if ($env:GITHUB_REF_TYPE -eq 'tag' -and $env:GITHUB_REF_NAME -ne "v$version") {
    throw 'The Git tag must match the app version.'
}

$previousKey = $env:TAURI_SIGNING_PRIVATE_KEY
$previousPassword = $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD
try {
    if ($UseEnvironmentKey) {
        if ([string]::IsNullOrWhiteSpace($previousKey)) {
            throw 'TAURI_SIGNING_PRIVATE_KEY is empty.'
        }
        $keyContent = $previousKey.Trim()
        $env:TAURI_SIGNING_PRIVATE_KEY = $keyContent
    } else {
        if (-not (Test-Path -LiteralPath $SigningKeyPath -PathType Leaf)) {
            throw "Signing key was not found at $SigningKeyPath"
        }
        $publicKeyPath = "$SigningKeyPath.pub"
        if (-not (Test-Path -LiteralPath $publicKeyPath -PathType Leaf)) {
            throw "Public key was not found at $publicKeyPath"
        }
        $publicKey = (Get-Content -LiteralPath $publicKeyPath -Raw).Trim()
        if ($config.plugins.updater.pubkey -ne $publicKey) {
            throw 'The signing key does not match the updater public key.'
        }
        $keyContent = (Get-Content -LiteralPath $SigningKeyPath -Raw).Trim()
        $env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path -LiteralPath $SigningKeyPath).Path
    }

    $keyHash = [Convert]::ToHexString(
        [System.Security.Cryptography.SHA256]::HashData([System.Text.Encoding]::UTF8.GetBytes($keyContent))
    ).ToLowerInvariant()
    if ($keyHash -ne $expectedKeyHash) {
        throw 'The signing key does not match the key used for this app.'
    }
    if ($null -eq $previousPassword) {
        $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
    }

    Push-Location $repoRoot
    try {
        & npm run desktop:build:release
        if ($LASTEXITCODE -ne 0) {
            throw 'Tauri release build failed.'
        }
    } finally {
        Pop-Location
    }
} finally {
    $env:TAURI_SIGNING_PRIVATE_KEY = $previousKey
    $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = $previousPassword
}

$bundleDirectory = Join-Path $repoRoot 'src-tauri\target\release\bundle\nsis'
$installers = @(Get-ChildItem -LiteralPath $bundleDirectory -Filter "*_${version}_x64-setup.exe" -File)
if ($installers.Count -ne 1) {
    throw "Expected one x64 NSIS installer for version $version; found $($installers.Count)."
}
$installer = $installers[0]
$signaturePath = "$($installer.FullName).sig"
if (-not (Test-Path -LiteralPath $signaturePath -PathType Leaf)) {
    throw "Tauri did not create the update signature at $signaturePath"
}

$stageDirectory = Join-Path $repoRoot ".release\v$version"
New-Item -ItemType Directory -Path $stageDirectory -Force | Out-Null
$assetName = "Markdown.Viewer_${version}_x64-setup.exe"
$assetPath = Join-Path $stageDirectory $assetName
Copy-Item -LiteralPath $installer.FullName -Destination $assetPath -Force
Copy-Item -LiteralPath $signaturePath -Destination "$assetPath.sig" -Force
$signature = (Get-Content -LiteralPath $signaturePath -Raw).Trim()

$release = [ordered]@{
    version = $version
    notes = 'See the release notes on GitHub.'
    platforms = [ordered]@{
        'windows-x86_64' = [ordered]@{
            url = "https://github.com/jwjp/markdown-viewer/releases/download/v$version/$assetName"
            signature = $signature
        }
    }
}
$utf8 = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText(
    (Join-Path $stageDirectory 'latest.json'),
    "$(($release | ConvertTo-Json -Depth 5))`n",
    $utf8
)
$hash = (Get-FileHash -LiteralPath $assetPath -Algorithm SHA256).Hash.ToLowerInvariant()
[System.IO.File]::WriteAllText(
    (Join-Path $stageDirectory 'SHA256SUMS.txt'),
    "$hash  $assetName`n",
    $utf8
)

Write-Host "Release assets are ready in $stageDirectory"
