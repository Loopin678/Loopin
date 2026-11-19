import QtQuick
import QtQuick.Templates as T
import App

T.CheckBox {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    padding: 4
    spacing: 8
    hoverEnabled: true
    font.family: Theme.fontFamily
    font.pixelSize: 13

    indicator: Rectangle {
        implicitWidth: 18
        implicitHeight: 18
        x: control.text ? (control.mirrored ? control.width - width - control.rightPadding : control.leftPadding)
                        : control.leftPadding + (control.availableWidth - width) / 2
        y: control.topPadding + (control.availableHeight - height) / 2
        radius: 5
        opacity: control.enabled ? 1 : 0.4
        color: control.checkState !== Qt.Unchecked ? Theme.accent : (control.hovered ? Theme.surface3 : Theme.surface2)
        border.width: 1
        border.color: control.checkState !== Qt.Unchecked ? Theme.accent
                      : (control.visualFocus ? Theme.accent : (control.hovered ? Theme.borderStrong : Theme.border))

        // Check mark
        Canvas {
            anchors.fill: parent
            visible: control.checkState === Qt.Checked
            onVisibleChanged: requestPaint()
            onPaint: {
                var ctx = getContext("2d")
                ctx.reset()
                ctx.strokeStyle = "#0B0C0A"
                ctx.lineWidth = 2
                ctx.lineCap = "round"
                ctx.lineJoin = "round"
                ctx.beginPath()
                ctx.moveTo(width * 0.27, height * 0.52)
                ctx.lineTo(width * 0.44, height * 0.68)
                ctx.lineTo(width * 0.74, height * 0.34)
                ctx.stroke()
            }
        }
        // Partially checked dash
        Rectangle {
            anchors.centerIn: parent
            width: 8; height: 2; radius: 1
            color: Theme.accentText
            visible: control.checkState === Qt.PartiallyChecked
        }
    }

    contentItem: Text {
        leftPadding: control.indicator && !control.mirrored ? control.indicator.width + control.spacing : 0
        rightPadding: control.indicator && control.mirrored ? control.indicator.width + control.spacing : 0
        text: control.text
        font: control.font
        color: Theme.textPrimary
        opacity: control.enabled ? 1 : 0.5
        elide: Text.ElideRight
        verticalAlignment: Text.AlignVCenter
    }
}
