import QtQuick
import QtQuick.Templates as T
import App

T.TabButton {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    leftPadding: 14; rightPadding: 14; topPadding: 6; bottomPadding: 6
    // An explicit width stops TabBar stretching the pills to fill the bar
    width: implicitWidth
    hoverEnabled: true
    font.family: Theme.fontFamily
    font.pixelSize: 13
    font.weight: control.checked ? Font.DemiBold : Font.Medium

    contentItem: Text {
        text: control.text
        font: control.font
        elide: Text.ElideRight
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        color: control.checked ? Theme.accent : (control.hovered ? Theme.textPrimary : Theme.textSecondary)
    }

    background: Rectangle {
        implicitHeight: 30
        radius: height / 2
        color: control.checked ? Theme.accentSoft : (control.hovered ? Theme.surface2 : "transparent")
        border.width: control.checked ? 1 : 0
        border.color: Theme.accentLine
    }
}
