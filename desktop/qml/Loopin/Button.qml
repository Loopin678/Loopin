import QtQuick
import QtQuick.Templates as T
import App

// Website button: 10px radius. Default = raised olive surface, `highlighted` =
// the lime primary action, `flat` = quiet text button.
T.Button {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    leftPadding: 14; rightPadding: 14; topPadding: 7; bottomPadding: 7
    spacing: 6
    hoverEnabled: true
    font.family: Theme.fontFamily
    font.pixelSize: 13
    font.weight: Font.Medium

    // Lime primary look. `highlighted` is the usual switch; `emphasized` does the same but,
    // unlike `highlighted`, Qt does not reset it on DialogButtonBox buttons.
    property bool emphasized: false
    readonly property bool primary: control.highlighted || control.emphasized

    contentItem: Text {
        text: control.text
        font: control.font
        elide: Text.ElideRight
        horizontalAlignment: Text.AlignHCenter
        verticalAlignment: Text.AlignVCenter
        color: control.primary ? Theme.accentText
             : (control.flat ? (control.hovered ? Theme.textPrimary : Theme.textSecondary)
                             : Theme.textPrimary)
        opacity: control.enabled ? 1 : 0.4
    }

    background: Rectangle {
        implicitWidth: 64
        implicitHeight: 32
        radius: Theme.radius
        opacity: control.enabled ? 1 : 0.4
        color: control.primary
               ? (control.down ? Theme.accentPress : (control.hovered ? Theme.accentHover : Theme.accent))
               : (control.flat
                  ? (control.down ? Theme.surface3 : (control.hovered ? Theme.surface2 : "transparent"))
                  : (control.down ? Theme.surface3 : (control.hovered ? Theme.surface3 : Theme.surface2)))
        border.width: control.primary || control.flat ? 0 : 1
        border.color: control.visualFocus ? Theme.accent : (control.hovered ? Theme.borderStrong : Theme.border)

        // Keyboard focus ring for every variant
        Rectangle {
            anchors.fill: parent; anchors.margins: -2
            radius: parent.radius + 2
            color: "transparent"
            border.width: 2
            border.color: Theme.accentLine
            visible: control.visualFocus
        }
    }
}
