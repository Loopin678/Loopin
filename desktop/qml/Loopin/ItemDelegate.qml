import QtQuick
import QtQuick.Templates as T
import App

T.ItemDelegate {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    leftPadding: 12; rightPadding: 12; topPadding: 7; bottomPadding: 7
    spacing: 8
    hoverEnabled: true
    font.family: Theme.fontFamily
    font.pixelSize: 13

    contentItem: Text {
        text: control.text
        font: control.font
        color: control.highlighted ? Theme.accent : Theme.textPrimary
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }

    background: Rectangle {
        implicitHeight: 32
        radius: 7
        color: control.down ? Theme.surface3
             : (control.highlighted || control.hovered ? Theme.surface2 : "transparent")
    }
}
