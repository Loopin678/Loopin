#!/usr/bin/env bash
# Builds Loopin-x86_64.AppImage: a single file that runs on most
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
# Run through X11 (XWayland on Wayland desktops). Native Wayland would also need
# Qt's wayland-graphics-integration plugins, without which the app crashes.
mkdir -p "$WORK_DIR/AppDir/apprun-hooks"
cat > "$WORK_DIR/AppDir/apprun-hooks/loopin-platform.sh" <<'HOOK'
export QT_QPA_PLATFORM=xcb
HOOK
# No version in the name, so .../releases/latest/download/<name> links never change
export LDAI_OUTPUT="$OUT_DIR/Loopin-x86_64.AppImage"
# QMake of the Qt we built against
if [ -z "${QMAKE:-}" ]; then
    QMAKE="$(command -v qmake6 || command -v qmake)"
    export QMAKE
fi

# Qt loads OpenSSL with dlopen(), so linuxdeploy never sees libssl. libgit2
# drags in this machine's libcrypto, and pairing it with the user's (newer)
# system libssl fails: "Failed to load libssl/libcrypto", i.e. no HTTPS at all
# (GitHub sign-in, AI providers). Bundle the matching libssl explicitly.
LIBSSL="$(ldconfig -p | awk '/libssl\.so\.3 .*x86-64/ {print $NF; exit}')"
if [ -z "$LIBSSL" ]; then
    echo "error: libssl.so.3 not found on the build machine" >&2
    exit 1
fi
LIBCRYPTO="$(dirname "$LIBSSL")/libcrypto.so.3"

cd "$WORK_DIR"
"$TOOLS_DIR/linuxdeploy-x86_64.AppImage" \
    --appdir "$WORK_DIR/AppDir" \
    --library "$LIBSSL" \
    --library "$LIBCRYPTO" \
    --executable "$WORK_DIR/AppDir/usr/bin/loopin_desktop" \
    --desktop-file "$WORK_DIR/AppDir/usr/share/applications/loopin.desktop" \
    --icon-file "$DESKTOP_DIR/packaging/loopin.png" \
    --plugin qt \
    --output appimage

echo "==> Built $LDAI_OUTPUT"
