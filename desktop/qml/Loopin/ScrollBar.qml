import QtQuick
import QtQuick.Templates as T
import App

// Thin pill scrollbar, like the website's 6px scrollbars.
T.ScrollBar {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding)
    padding: 2
    visible: control.policy !== T.ScrollBar.AlwaysOff
    hoverEnabled: true

    contentItem: Rectangle {
        implicitWidth: control.interactive ? 8 : 4
        implicitHeight: control.interactive ? 8 : 4
        radius: width / 2
        color: control.pressed ? Qt.rgba(1, 1, 1, 0.35) : (control.hovered ? Qt.rgba(1, 1, 1, 0.25) : Qt.rgba(1, 1, 1, 0.14))
        opacity: 0
        states: State {
            name: "active"
            when: control.policy === T.ScrollBar.AlwaysOn || (control.active && control.size < 1.0)
            PropertyChanges { control.contentItem.opacity: 1 }
        }
        transitions: Transition {
            from: "active"
            SequentialAnimation {
                PauseAnimation { duration: 600 }
                NumberAnimation { target: control.contentItem; duration: 200; property: "opacity"; to: 0 }
            }
        }
    }
}
