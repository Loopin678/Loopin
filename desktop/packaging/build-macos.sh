#!/usr/bin/env bash
# Builds Loopin-<version>-macos-<arch>.dmg.
# Needs: brew install qt libgit2 cmake ninja
#
#   desktop/packaging/build-macos.sh [output-dir]
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$(mkdir -p "${1:-$DESKTOP_DIR/dist}" && cd "${1:-$DESKTOP_DIR/dist}" && pwd)"
WORK_DIR="${WORK_DIR:-$DESKTOP_DIR/build-macos}"

VERSION="$(sed -n 's/^project(loopin_desktop VERSION \([0-9.]*\).*/\1/p' "$DESKTOP_DIR/CMakeLists.txt")"
ARCH="$(uname -m)"
QT_PREFIX="$(brew --prefix qt)"
echo "==> Loopin Desktop $VERSION ($ARCH)"

cmake -S "$DESKTOP_DIR" -B "$WORK_DIR/build" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_PREFIX_PATH="$QT_PREFIX"
cmake --build "$WORK_DIR/build"

APP="$WORK_DIR/build/loopin_desktop.app"
# Bundles Qt, QML modules and Homebrew dylibs (libgit2, OpenSSL, ...) into the
# app; -codesign=- re-signs ad hoc, which Apple Silicon requires to launch at all
"$QT_PREFIX/bin/macdeployqt" "$APP" -qmldir="$DESKTOP_DIR/qml" -codesign=- -always-overwrite

rm -rf "$WORK_DIR/dmg" && mkdir -p "$WORK_DIR/dmg"
cp -R "$APP" "$WORK_DIR/dmg/Loopin.app"
ln -s /Applications "$WORK_DIR/dmg/Applications"
DMG="$OUT_DIR/Loopin-$VERSION-macos-$ARCH.dmg"
rm -f "$DMG"
hdiutil create -volname "Loopin $VERSION" -srcfolder "$WORK_DIR/dmg" -ov -format UDZO "$DMG"

echo "==> Built $DMG"
