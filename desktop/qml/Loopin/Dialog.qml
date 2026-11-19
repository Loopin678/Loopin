import QtQuick
import QtQuick.Templates as T
import App

T.Dialog {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            contentWidth + leftPadding + rightPadding,
                            implicitHeaderWidth,
                            implicitFooterWidth)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             contentHeight + topPadding + bottomPadding
                             + (implicitHeaderHeight > 0 ? implicitHeaderHeight + spacing : 0)
                             + (implicitFooterHeight > 0 ? implicitFooterHeight + spacing : 0))

    padding: 20
    topPadding: 12
    font.family: Theme.fontFamily
    font.pixelSize: 13

    enter: Transition {
        NumberAnimation { property: "opacity"; from: 0; to: 1; duration: 140; easing.type: Easing.OutCubic }
    }
    exit: Transition {
        NumberAnimation { property: "opacity"; from: 1; to: 0; duration: 100 }
    }

    background: Rectangle {
        radius: Theme.radiusLarge
        color: Theme.surface
        border.width: 1
        border.color: Theme.borderStrong
    }

    header: Item {
        visible: control.title.length > 0
        implicitHeight: visible ? 52 : 0
        Text {
            anchors { left: parent.left; right: parent.right; verticalCenter: parent.verticalCenter }
            anchors.leftMargin: 20; anchors.rightMargin: 20
            anchors.verticalCenterOffset: 4
            text: control.title
            elide: Text.ElideRight
            font.family: Theme.fontFamily
            font.pixelSize: 17
            font.weight: Font.DemiBold
            color: Theme.textPrimary
        }
    }

    footer: DialogButtonBox {
        visible: count > 0
    }

    T.Overlay.modal: Rectangle {
        color: Qt.rgba(0.02, 0.025, 0.02, 0.72)
        Behavior on opacity { NumberAnimation { duration: 140 } }
    }
    T.Overlay.modeless: Rectangle {
        color: Qt.rgba(0.02, 0.025, 0.02, 0.4)
    }
}
