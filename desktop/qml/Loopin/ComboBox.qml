import QtQuick
import QtQuick.Templates as T
import App

T.ComboBox {
    id: control

    implicitWidth: Math.max(implicitBackgroundWidth + leftInset + rightInset,
                            implicitContentWidth + leftPadding + rightPadding)
    implicitHeight: Math.max(implicitBackgroundHeight + topInset + bottomInset,
                             implicitContentHeight + topPadding + bottomPadding,
                             implicitIndicatorHeight + topPadding + bottomPadding)
    leftPadding: 12
    rightPadding: 12 + indicator.width + spacing
    topPadding: 6; bottomPadding: 6
    spacing: 6
    hoverEnabled: true
    font.family: Theme.fontFamily
    font.pixelSize: 13

    delegate: ItemDelegate {
        required property var model
        required property int index
        width: ListView.view ? ListView.view.width : implicitWidth
        text: model[control.textRole] !== undefined ? model[control.textRole] : (Array.isArray(control.model) ? modelData : "")
        highlighted: control.highlightedIndex === index
        font: control.font
    }

    indicator: Canvas {
        x: control.width - width - 12
        y: control.topPadding + (control.availableHeight - height) / 2
        width: 10; height: 6
        opacity: control.enabled ? 1 : 0.4
        onPaint: {
            var ctx = getContext("2d")
            ctx.reset()
            ctx.strokeStyle = Qt.rgba(1, 1, 1, 0.6)
            ctx.lineWidth = 1.5
            ctx.lineCap = "round"
            ctx.lineJoin = "round"
            ctx.beginPath()
            ctx.moveTo(1, 1)
            ctx.lineTo(width / 2, height - 1)
            ctx.lineTo(width - 1, 1)
            ctx.stroke()
        }
    }

    contentItem: T.TextField {
        leftPadding: 0
        rightPadding: 0
        text: control.editable ? control.editText : control.displayText
        enabled: control.editable
        autoScroll: control.editable
        readOnly: control.down
        inputMethodHints: control.inputMethodHints
        validator: control.validator
        selectByMouse: control.selectTextByMouse
        color: Theme.textPrimary
        selectionColor: Theme.accent
        selectedTextColor: Theme.accentText
        font: control.font
        verticalAlignment: Text.AlignVCenter
        opacity: control.enabled ? 1 : 0.5
        background: null
    }

    background: Rectangle {
        implicitWidth: 120
        implicitHeight: 34
        radius: Theme.radius
        color: control.down ? Theme.surface3 : (control.hovered ? Theme.surface3 : Theme.surface2)
        border.width: 1
        border.color: control.visualFocus || control.popup.visible ? Theme.accent
                      : (control.hovered ? Theme.borderStrong : Theme.border)
        opacity: control.enabled ? 1 : 0.5
    }

    popup: T.Popup {
        y: control.height + 4
        width: control.width
        height: Math.min(contentItem.implicitHeight + topPadding + bottomPadding, control.Window.height - topMargin - bottomMargin)
        topMargin: 8; bottomMargin: 8
        padding: 4

        contentItem: ListView {
            clip: true
            implicitHeight: contentHeight
            model: control.delegateModel
            currentIndex: control.highlightedIndex
            highlightMoveDuration: 0
            boundsBehavior: Flickable.StopAtBounds
        }

        background: Rectangle {
            radius: Theme.radius
            color: Theme.surface2
            border.width: 1
            border.color: Theme.borderStrong
        }
    }
}
