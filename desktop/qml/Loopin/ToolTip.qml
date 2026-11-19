import QtQuick
import QtQuick.Templates as T
import App

T.ToolTip {
    id: control

    x: parent ? (parent.width - implicitWidth) / 2 : 0
    y: -implicitHeight - 6
    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    margins: 8
    padding: 8
    leftPadding: 10; rightPadding: 10
    delay: 450
    closePolicy: T.Popup.CloseOnEscape | T.Popup.CloseOnPressOutsideParent | T.Popup.CloseOnReleaseOutsideParent

    contentItem: Text {
        text: control.text
        font.family: Theme.fontFamily
        font.pixelSize: 12
        color: Theme.textPrimary
        wrapMode: Text.Wrap
    }

    background: Rectangle {
        radius: 8
        color: Theme.surface3
        border.width: 1
        border.color: Theme.borderStrong
    }
}
