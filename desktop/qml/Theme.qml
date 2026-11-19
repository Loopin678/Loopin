pragma Singleton
import QtQuick
import QtQuick.Controls

// Central theme object. Mirrors the Loopin website (frontend/src/index.css):
// a dark-only, near-black canvas with deep olive surfaces and one lime accent,
// Inter for text and JetBrains Mono for code/SHAs. The website is dark-only, so
// the desktop app is too: it no longer follows the OS light/dark setting.
QtObject {
    id: theme

    readonly property bool dark: true

    // ── Typography ───────────────────────────────────────────────────────
    readonly property string fontFamily: "Inter"
    readonly property string monoFamily: "JetBrains Mono"

    // ── Shape ────────────────────────────────────────────────────────────
    readonly property int radius: 10        // buttons, inputs, rows
    readonly property int radiusLarge: 16   // cards, dialogs (website uses 14-28)

    // ── Backgrounds (website: bg / surface-1 / surface-2 / surface-3) ───
    readonly property color bg:        "#0B0C0A"
    readonly property color surface:   "#151713"
    readonly property color surface2:  "#1B1E19"
    readonly property color surface3:  "#23271F"

    // ── Borders (website: white at 10% / 18%) ────────────────────────────
    readonly property color border:       Qt.rgba(1, 1, 1, 0.10)
    readonly property color borderStrong: Qt.rgba(1, 1, 1, 0.18)
    readonly property color divider:      Qt.rgba(1, 1, 1, 0.07)

    // ── Text ─────────────────────────────────────────────────────────────
    readonly property color textPrimary:   "#F4F5EF"
    readonly property color textSecondary: Qt.rgba(1, 1, 1, 0.60)
    readonly property color textMuted:     "#6E7268"

    // ── Accent: the website's lime ───────────────────────────────────────
    readonly property color accent:      "#D0E36A"
    readonly property color accentHover: "#DCEB86"
    readonly property color accentPress: "#B9CE4F"
    readonly property color accentSoft:  Qt.rgba(208 / 255, 227 / 255, 106 / 255, 0.12)
    readonly property color accentLine:  Qt.rgba(208 / 255, 227 / 255, 106 / 255, 0.28)
    readonly property color sage:        "#A9B97A"
    // Text/icons that sit ON a solid accent, success or warning fill
    readonly property color accentText:    "#0B0C0A"

    // ── Status ───────────────────────────────────────────────────────────
    readonly property color success: "#D0E36A"
    readonly property color danger:  "#EF4444"
    readonly property color warning: "#F59E0B"
    readonly property color info:    "#60A5FA"

    // Commit badge (SHA pill)
    readonly property color shaBg:   surface3
    readonly property color shaText: textPrimary

    // Lists
    readonly property color rowAlt:    surface
    readonly property color rowBase:   surface
    readonly property color rowHover:  surface2
}
