#!/usr/bin/env bash
# Builds the Windows installer (LoopinSetup.exe) and a portable zip.
# File names carry no version, so .../releases/latest/download/<name> links never change.
# Run from an MSYS2 UCRT64 shell (MINGW64 works too) with these packages installed:
#   pacman -S --needed mingw-w64-ucrt-x86_64-{gcc,cmake,ninja,pkgconf,qt6-base,qt6-declarative,qt6-tools,libgit2,qtkeychain-qt6,nsis} zip
#
#   desktop/packaging/build-windows.sh [output-dir]
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$(mkdir -p "${1:-$DESKTOP_DIR/dist}" && cd "${1:-$DESKTOP_DIR/dist}" && pwd)"
WORK_DIR="${WORK_DIR:-$DESKTOP_DIR/build-windows}"
STAGE="$WORK_DIR/Loopin"

VERSION="$(sed -n 's/^project(loopin_desktop VERSION \([0-9.]*\).*/\1/p' "$DESKTOP_DIR/CMakeLists.txt")"
echo "==> Loopin Desktop $VERSION"

cmake -S "$DESKTOP_DIR" -B "$WORK_DIR/build" -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build "$WORK_DIR/build"

rm -rf "$STAGE"
mkdir -p "$STAGE"
cp "$WORK_DIR/build/loopin_desktop.exe" "$WORK_DIR/build/loopin_cli.exe" "$STAGE/"

# Qt libraries, plugins and every QML module the app imports
# MSYS2 sets MINGW_PREFIX to /ucrt64 or /mingw64 depending on the shell
PREFIX="${MINGW_PREFIX:-/ucrt64}"
WINDEPLOYQT="$(command -v windeployqt6 || command -v windeployqt || echo "$PREFIX/share/qt6/bin/windeployqt.exe")"
"$WINDEPLOYQT" --release --no-translations --compiler-runtime \
    --qmldir "$DESKTOP_DIR/qml" "$STAGE/loopin_desktop.exe"
# Fusion style and Qt.labs.settings are picked at runtime, so make sure they're there
QML_DIR="$(cygpath -u "$(qmake6 -query QT_INSTALL_QML 2>/dev/null || qmake -query QT_INSTALL_QML)")"
for mod in QtQuick/Controls/Fusion Qt/labs/settings; do
    if [ -d "$QML_DIR/$mod" ] && [ ! -d "$STAGE/qml/$mod" ]; then
        mkdir -p "$STAGE/qml/$(dirname "$mod")"
        cp -r "$QML_DIR/$mod" "$STAGE/qml/$mod"
    fi
done

# Non-Qt DLLs from the MSYS2 environment (libgit2, OpenSSL, zlib, ICU, ...) that windeployqt skips.
# Repeat until nothing new appears, since copied DLLs have dependencies too.
while :; do
    added=0
    while read -r dll; do
        name="$(basename "$dll")"
        if [ ! -f "$STAGE/$name" ]; then cp "$dll" "$STAGE/"; added=1; fi
    done < <(find "$STAGE" -name '*.exe' -o -name '*.dll' | xargs -d '\n' ldd 2>/dev/null \
             | awk -v p="$PREFIX/" 'index($3, p) == 1 {print $3}' | sort -u)
    [ "$added" = 0 ] && break
done

cp "$DESKTOP_DIR/packaging/loopin.ico" "$STAGE/"

# Installer
makensis -V2 -DVERSION="$VERSION" -DSOURCE_DIR="$(cygpath -w "$STAGE")" \
    -DOUT_FILE="$(cygpath -w "$OUT_DIR/LoopinSetup.exe")" \
    "$(cygpath -w "$DESKTOP_DIR/packaging/installer.nsi")"

# Portable zip for people who can't run installers
(cd "$WORK_DIR" && rm -f "$OUT_DIR/Loopin-windows-portable.zip" \
    && zip -qr "$OUT_DIR/Loopin-windows-portable.zip" Loopin)

echo "==> Built $OUT_DIR/LoopinSetup.exe"
