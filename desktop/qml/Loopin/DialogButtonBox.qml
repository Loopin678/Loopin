import QtQuick
import QtQuick.Templates as T
import App

T.DialogButtonBox {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    spacing: 8
    padding: 16
    topPadding: 8
    alignment: Qt.AlignRight
    buttonLayout: T.DialogButtonBox.WinLayout

    // The affirmative button (Save / Ok / Yes / Apply) is the lime primary action
    delegate: Button {
        // Qt resets `highlighted` on these buttons, hence `emphasized`; the role is set after
        // creation, so the label is checked too
        readonly property bool affirmative:
            T.DialogButtonBox.buttonRole === T.DialogButtonBox.AcceptRole
            || T.DialogButtonBox.buttonRole === T.DialogButtonBox.YesRole
            || T.DialogButtonBox.buttonRole === T.DialogButtonBox.ApplyRole
            || ["OK", "Ok", "Save", "Yes", "Apply"].indexOf(text) >= 0
        emphasized: affirmative
    }

    contentItem: ListView {
        implicitWidth: contentWidth
        model: control.contentModel
        spacing: control.spacing
        orientation: ListView.Horizontal
        boundsBehavior: Flickable.StopAtBounds
        snapMode: ListView.SnapToItem
    }

    background: Item { implicitHeight: 40 }
}
