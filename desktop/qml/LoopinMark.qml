import QtQuick
import QtQuick.Layouts
import App

// The website's logo (LoopinMark in Landing.tsx): a lime rounded square holding
// a ring, followed by the wordmark.
RowLayout {
    id: root
    property int size: 24
    property bool showWordmark: true
    property color wordColor: Theme.textPrimary
    spacing: 8

    Rectangle {
        implicitWidth: root.size
        implicitHeight: root.size
        radius: root.size / 3
        color: Theme.accent
        Rectangle {
            anchors.centerIn: parent
            width: root.size * 0.42
            height: width
            radius: width / 2
            color: "transparent"
            border.width: Math.max(2, root.size / 12)
            border.color: Theme.accentText
        }
    }

    Text {
        visible: root.showWordmark
        text: "Loopin"
        color: root.wordColor
        font.family: Theme.fontFamily
        font.pixelSize: Math.round(root.size * 0.75)
        font.weight: Font.DemiBold
        font.letterSpacing: -0.3
    }
}
