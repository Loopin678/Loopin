param (
    [string]$BuildDir = "build_release",
    [string]$OutputDir = "LoopinDesktop-Release"
)

$ErrorActionPreference = "Stop"

Write-Host "Setting up paths..."
$env:PATH = "C:\msys64\mingw64\bin;C:\msys64\usr\bin;" + $env:PATH

Write-Host "Building in Release mode..."
cmake -DCMAKE_BUILD_TYPE=Release -B $BuildDir
cmake --build $BuildDir

if (Test-Path $OutputDir) {
    Remove-Item -Recurse -Force $OutputDir
}
New-Item -ItemType Directory -Path $OutputDir | Out-Null

Write-Host "Copying executable..."
$exePath = Join-Path $BuildDir "loopin_desktop.exe"
Copy-Item $exePath -Destination $OutputDir

Write-Host "Running windeployqt..."
windeployqt --qmldir qml (Join-Path $OutputDir "loopin_desktop.exe")

Write-Host "Resolving MSYS2/MinGW DLL dependencies..."
# Get ntldd output
$ntlddOut = ntldd $exePath
foreach ($line in $ntlddOut) {
    # Match lines like "libgit2-1.9.dll => /mingw64/bin/libgit2-1.9.dll (0x7ffd62590000)"
    if ($line -match '=>\s+(/mingw64/bin/[^\s]+)') {
        $dllMsysPath = $matches[1]
        # Convert MSYS path to Windows path
        $dllWinPath = "C:\msys64" + $dllMsysPath.Replace('/', '\')
        if (Test-Path $dllWinPath) {
            $dllName = Split-Path $dllWinPath -Leaf
            $destPath = Join-Path $OutputDir $dllName
            if (-not (Test-Path $destPath)) {
                Write-Host "Copying $dllName..."
                Copy-Item $dllWinPath -Destination $OutputDir
            }
        }
    }
}

Write-Host "Creating ZIP archive..."
$zipPath = "LoopinDesktop-Release.zip"
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}
Compress-Archive -Path "$OutputDir\*" -DestinationPath $zipPath

Write-Host "Done! Packaged into $zipPath"
