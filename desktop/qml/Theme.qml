pragma Singleton
import QtQuick
import QtQuick.Controls

// Central theme object — reads the system palette so the app follows
// the OS light/dark mode setting automatically.
QtObject {
    id: theme

    readonly property bool dark: Application.styleHints.colorScheme === Qt.ColorScheme.Dark

    // Backgrounds
    readonly property color bg:        dark ? "#0d1117" : "#ffffff"
    readonly property color surface:   dark ? "#161b22" : "#f6f8fa"
    readonly property color surface2:  dark ? "#21262d" : "#eef1f5"

    // Borders
    readonly property color border:    dark ? "#30363d" : "#d0d7de"
    readonly property color divider:   dark ? "#21262d" : "#d0d7de"

    // Text
    readonly property color textPrimary:   dark ? "#e6edf3" : "#1F2328"
    readonly property color textSecondary: dark ? "#7d8590" : "#656d76"
    readonly property color textMuted:     dark ? "#484f58" : "#8c959f"

    // Accents
    readonly property color accent:      dark ? "#2f81f7" : "#0969da"
    readonly property color accentHover: dark ? "#388bfd" : "#0a5ae2"
    readonly property color success:     dark ? "#238636" : "#1a7f37"
    readonly property color danger:      dark ? "#da3633" : "#cf222e"
    readonly property color warning:     dark ? "#d29922" : "#9a6700"

    // Commit badge (SHA pill)
    readonly property color shaBg:   dark ? "#21262d" : "#d0d7de"
    readonly property color shaText: theme.textPrimary

    // Lists
    readonly property color rowAlt:    dark ? "#12161d" : "#fdfdfe"
    readonly property color rowBase:   theme.surface
    readonly property color rowHover:  dark ? "#1f242c" : "#eaeef2"
}
