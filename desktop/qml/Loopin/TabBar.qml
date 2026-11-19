import QtQuick
import QtQuick.Templates as T
import App

// Website nav look: a quiet strip; the active tab is a lime-tinted pill.
T.TabBar {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding)
    leftPadding: 12; rightPadding: 12; topPadding: 8; bottomPadding: 8
    spacing: 4

    // A plain Row keeps each pill at its natural width (a ListView stretches them)
    contentItem: Row {
        spacing: control.spacing
        Repeater {
            model: control.contentModel
        }
    }

    background: Rectangle {
        color: Theme.bg
        Rectangle {
            anchors { left: parent.left; right: parent.right; bottom: parent.bottom }
            height: 1
            color: Theme.border
        }
    }
}
