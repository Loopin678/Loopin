$env:PATH = 'C:\msys64\mingw64\bin;C:\Windows\System32;C:\Windows'
$dist = 'C:\a_Coding\Loopin\desktop\dist'
Remove-Item -Recurse -Force $dist -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $dist
Copy-Item 'C:\a_Coding\Loopin\desktop\build_release\loopin_desktop.exe' $dist\
windeployqt --no-translations --compiler-runtime $dist\loopin_desktop.exe

$dlls = @()
$filesToScan = Get-ChildItem -Path $dist -Recurse -Include *.exe,*.dll
foreach ($file in $filesToScan) {
    $ldd_out = C:\msys64\usr\bin\ldd.exe $file.FullName
    foreach ($line in $ldd_out) {
        if ($line -match "=> (/[^ ]+) \(") {
            $path = $matches[1]
            if ($path -match "^/([a-z])/(.*)") {
                $winPath = $matches[1] + ":\" + $matches[2].Replace('/', '\')
                if ($winPath -match "mingw64" -or $winPath -match "winlibs") {
                    $dlls += $winPath
                }
            }
        }
    }
}
$dlls = $dlls | Select-Object -Unique
foreach ($dll in $dlls) {
    Copy-Item $dll $dist\ -ErrorAction SilentlyContinue
}
Copy-Item "C:\msys64\mingw64\bin\libgit2-1.9.dll" $dist\ -ErrorAction SilentlyContinue
Copy-Item "C:\msys64\mingw64\bin\libqt6keychain.dll" $dist\ -ErrorAction SilentlyContinue
