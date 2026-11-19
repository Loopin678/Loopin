import QtQuick
import QtQuick.Templates as T
import QtQuick.Controls.impl
import App

T.TextArea {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    leftPadding: 12; rightPadding: 12; topPadding: 10; bottomPadding: 10

    color: Theme.textPrimary
    placeholderTextColor: Theme.textMuted
    selectionColor: Theme.accent
    selectedTextColor: Theme.accentText
    font.family: Theme.fontFamily
    font.pixelSize: 13
    selectByMouse: true
    wrapMode: TextEdit.Wrap

    PlaceholderText {
        x: control.leftPadding
        y: control.topPadding
        width: control.width - (control.leftPadding + control.rightPadding)
        height: control.height - (control.topPadding + control.bottomPadding)
        text: control.placeholderText
        font: control.font
        color: control.placeholderTextColor
        visible: !control.length && !control.preeditText && (!control.activeFocus || control.horizontalAlignment !== Qt.AlignHCenter)
        elide: Text.ElideRight
        renderType: control.renderType
    }

    background: Rectangle {
        implicitWidth: 200
        implicitHeight: 60
        radius: Theme.radius
        color: Theme.surface
        border.width: 1
        border.color: control.activeFocus ? Theme.accent : Theme.border
    }
}
