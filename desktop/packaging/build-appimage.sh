#!/usr/bin/env bash
# Builds Loopin-<version>-x86_64.AppImage: a single file that runs on most
# Linux distributions without installing anything.
#
#   desktop/packaging/build-appimage.sh [output-dir]
#
# Needs Qt 6.5+, libgit2 and CMake/Ninja. The AppImage only runs on systems
# whose glibc is at least as new as the build machine's, so release builds
# are made on an older distro (see .github/workflows/desktop-release.yml).
set -euo pipefail

DESKTOP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$(mkdir -p "${1:-$DESKTOP_DIR/dist}" && cd "${1:-$DESKTOP_DIR/dist}" && pwd)"
WORK_DIR="${WORK_DIR:-$DESKTOP_DIR/build-appimage}"
TOOLS_DIR="${TOOLS_DIR:-$WORK_DIR/tools}"

VERSION="$(sed -n 's/^project(loopin_desktop VERSION \([0-9.]*\).*/\1/p' "$DESKTOP_DIR/CMakeLists.txt")"
echo "==> Loopin Desktop $VERSION"

# ── Tools ──────────────────────────────────────────────────────────────
mkdir -p "$TOOLS_DIR"
fetch() {
    [ -x "$TOOLS_DIR/$1" ] && return
    echo "==> Downloading $1"
    curl -fsSL -o "$TOOLS_DIR/$1" "$2"
    chmod +x "$TOOLS_DIR/$1"
}
fetch linuxdeploy-x86_64.AppImage \
    https://github.com/linuxdeploy/linuxdeploy/releases/download/continuous/linuxdeploy-x86_64.AppImage
fetch linuxdeploy-plugin-qt-x86_64.AppImage \
    https://github.com/linuxdeploy/linuxdeploy-plugin-qt/releases/download/continuous/linuxdeploy-plugin-qt-x86_64.AppImage
# CI runners have no FUSE; extracting works everywhere
export APPIMAGE_EXTRACT_AND_RUN=1

# ── Build and stage ────────────────────────────────────────────────────
rm -rf "$WORK_DIR/AppDir"
cmake -S "$DESKTOP_DIR" -B "$WORK_DIR/build" -G Ninja \
    -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr
cmake --build "$WORK_DIR/build"
DESTDIR="$WORK_DIR/AppDir" cmake --install "$WORK_DIR/build"

# ── Bundle Qt, QML modules and libraries ───────────────────────────────
# qmlimportscanner reads these to find every QML module the app imports
export QML_SOURCES_PATHS="$DESKTOP_DIR/qml"
# Qt.labs.settings and the Fusion style are chosen at runtime, so name them
export EXTRA_QT_MODULES="qml;quickcontrols2"
# Native Wayland if this Qt has it (Qt <6.7 names it libqwayland-generic.so);
# otherwise the xcb plugin still runs through XWayland
QT_PLUGINS="$("${QMAKE:-$(command -v qmake6 || command -v qmake)}" -query QT_INSTALL_PLUGINS)"
for wl in libqwayland.so libqwayland-generic.so; do
    if [ -f "$QT_PLUGINS/platforms/$wl" ]; then export EXTRA_PLATFORM_PLUGINS="$wl"; break; fi
done
export LDAI_OUTPUT="$OUT_DIR/Loopin-$VERSION-x86_64.AppImage"
# QMake of the Qt we built against
if [ -z "${QMAKE:-}" ]; then
    QMAKE="$(command -v qmake6 || command -v qmake)"
    export QMAKE
fi

cd "$WORK_DIR"
"$TOOLS_DIR/linuxdeploy-x86_64.AppImage" \
    --appdir "$WORK_DIR/AppDir" \
    --executable "$WORK_DIR/AppDir/usr/bin/loopin_desktop" \
    --desktop-file "$WORK_DIR/AppDir/usr/share/applications/loopin.desktop" \
    --icon-file "$DESKTOP_DIR/packaging/loopin.png" \
    --plugin qt \
    --output appimage

echo "==> Built $LDAI_OUTPUT"
