import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import App

// "This commit looks like it finishes a task — move it to Done?"
//
// Fed by main.qml after a new commit is detected and the backend has scored the
// board's open tasks. NOTHING moves until the user ticks tasks and presses
// "Move to Done"; "Not now" (or Esc) drops the suggestion and leaves the board alone.
// Several commits in a row queue up and are shown one at a time.
Dialog {
    id: dlg
    property var api

    // [{ sha, shortSha, message, engine, engineNote, doneListName, suggestions: [...] }]
    property var queue: []
    readonly property var current: queue.length > 0 ? queue[0] : null
    // taskId -> true for the ticked rows of the current commit
    property var selected: ({})
    readonly property int selectedCount: Object.keys(selected).length
    property bool busy: false
    property string errorText: ""

    title: "Did this commit finish a task?"
    modal: true
    width: Math.min(560, (parent ? parent.width : 560) - 40)
    // Can't be dismissed while the move request is in flight
    closePolicy: busy ? Popup.NoAutoClose : Popup.CloseOnEscape
    padding: 16

    background: Rectangle {
        color: Theme.bg
        border.color: Theme.border
        radius: 8
    }

    function enqueue(entry) {
        // The same commit can't be suggested twice (e.g. detected again after a refresh)
        for (var i = 0; i < queue.length; i++) if (queue[i].sha === entry.sha) return
        var q = queue.slice()
        q.push(entry)
        queue = q
        if (!visible) showCurrent()
    }

    function showCurrent() {
        if (!current) { close(); return }
        // Pre-tick only a strong top match; the user still has to press the button
        var initial = {}
        var s = current.suggestions
        if (s.length > 0 && s[0].confidence >= 0.75) initial[s[0].taskId] = true
        selected = initial
        busy = false
        errorText = ""
        open()
    }

    function next() {
        queue = queue.slice(1)
        if (current) showCurrent()
        else close()
    }

    function toggle(taskId, on) {
        var copy = {}
        for (var k in selected) copy[k] = true
        if (on) copy[taskId] = true
        else delete copy[taskId]
        selected = copy
    }

    // Esc / closing without a decision = "Not now" for this commit
    onRejected: if (!busy) next()

    Connections {
        target: dlg.api
        function onTasksCompleted(sha, moved, doneListName) {
            if (!dlg.current || sha !== dlg.current.sha) return
            dlg.busy = false
            dlg.next()
        }
        function onBackendError(errorString) {
            if (!dlg.busy) return
            dlg.busy = false
            dlg.errorText = errorString
        }
    }

    contentItem: ColumnLayout {
        spacing: 10

        Text {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            color: Theme.textSecondary
            textFormat: Text.PlainText
            text: dlg.current
                ? "Commit " + dlg.current.shortSha + ": " + dlg.current.message.split("\n")[0]
                : ""
        }

        Text {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            color: Theme.textPrimary
            text: "Loopin thinks this commit completes the task" +
                  (dlg.current && dlg.current.suggestions.length > 1 ? "s" : "") +
                  " below. Tick the ones that are really done and they'll move to \"" +
                  (dlg.current ? dlg.current.doneListName : "Done") + "\". Nothing changes unless you confirm."
        }

        Repeater {
            model: dlg.current ? dlg.current.suggestions : []
            delegate: Rectangle {
                id: row
                required property var modelData
                Layout.fillWidth: true
                implicitHeight: rowLayout.implicitHeight + 16
                radius: 6
                color: dlg.selected[modelData.taskId] === true ? Theme.surface2 : Theme.surface
                border.color: dlg.selected[modelData.taskId] === true ? Theme.accent : Theme.border

                RowLayout {
                    id: rowLayout
                    anchors.fill: parent
                    anchors.margins: 8
                    spacing: 8

                    CheckBox {
                        Layout.alignment: Qt.AlignTop
                        checked: dlg.selected[row.modelData.taskId] === true
                        enabled: !dlg.busy
                        onToggled: dlg.toggle(row.modelData.taskId, checked)
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3
                        RowLayout {
                            Layout.fillWidth: true
                            Text {
                                Layout.fillWidth: true
                                text: row.modelData.title
                                color: Theme.textPrimary
                                font.bold: true
                                elide: Text.ElideRight
                                textFormat: Text.PlainText
                            }
                            Rectangle {
                                readonly property real c: row.modelData.confidence
                                color: c >= 0.8 ? Theme.success : (c >= 0.65 ? Theme.accent : Theme.warning)
                                radius: 9
                                implicitHeight: 18
                                implicitWidth: confText.implicitWidth + 12
                                Text {
                                    id: confText
                                    anchors.centerIn: parent
                                    text: Math.round(row.modelData.confidence * 100) + "% sure"
                                    color: "white"
                                    font.pixelSize: 11
                                    font.bold: true
                                }
                            }
                        }
                        Text {
                            text: row.modelData.listName + "  →  " + (dlg.current ? dlg.current.doneListName : "Done")
                            color: Theme.textSecondary
                            font.pixelSize: 12
                            textFormat: Text.PlainText
                        }
                        Text {
                            Layout.fillWidth: true
                            text: row.modelData.reason
                            color: Theme.textSecondary
                            wrapMode: Text.WordWrap
                            font.pixelSize: 12
                            textFormat: Text.PlainText
                        }
                    }
                }
            }
        }

        Text {
            Layout.fillWidth: true
            visible: !!dlg.current
            wrapMode: Text.WordWrap
            color: Theme.textMuted
            font.pixelSize: 11
            text: !dlg.current ? "" :
                  (dlg.current.engine === "claude"
                      ? "Suggested by Claude after reading the commit's diff."
                      : "Suggested by keyword matching" +
                        (dlg.current.engineNote ? " (" + dlg.current.engineNote + ")." : ". Set ANTHROPIC_API_KEY on the backend for smarter suggestions.")) +
                  (dlg.queue.length > 1 ? "  " + (dlg.queue.length - 1) + " more commit(s) waiting." : "")
        }

        Text {
            Layout.fillWidth: true
            visible: dlg.errorText !== ""
            text: dlg.errorText
            color: Theme.danger
            wrapMode: Text.WordWrap
            textFormat: Text.PlainText
        }

        RowLayout {
            Layout.fillWidth: true
            Layout.topMargin: 4
            Item { Layout.fillWidth: true }
            Button {
                text: "Not now"
                enabled: !dlg.busy
                onClicked: dlg.next()
            }
            Button {
                text: dlg.busy ? "Moving..."
                     : (dlg.selectedCount > 1 ? "Move " + dlg.selectedCount + " tasks to Done" : "Move to Done")
                enabled: !dlg.busy && dlg.selectedCount > 0
                highlighted: true
                onClicked: {
                    dlg.busy = true
                    dlg.errorText = ""
                    dlg.api.completeTasks(dlg.current.sha, dlg.current.message, Object.keys(dlg.selected))
                }
            }
        }
    }
}
