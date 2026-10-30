import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import App

Item {
    id: root
    property var groups: []
    property var repo
    property var api
    property string taskId
    property string githubToken
    signal done()

    property bool hasCommitted: false
    property string statusMessage: ""
    property string lastError: ""
    // taskId -> true; see the Link Commit to Task dialog for why this isn't read from the view
    property var selectedTasks: ({})
    readonly property int selectedTaskCount: Object.keys(selectedTasks).length

    Connections {
        target: root.repo
        function onErrorOccurred(errorMessage) { root.lastError = errorMessage }
    }
    Connections {
        target: root.api
        function onBackendError(errorString) { root.lastError = errorString }
    }

    // Keeps the remote list in sync as the repo changes
    property var availableRemotes: root.repo ? root.repo.remotes : []

    Rectangle {
        anchors.fill: parent
        color: Theme.bg
    }

    Column {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        Text {
            text: "Proposed commits"
            font.pixelSize: 20
            font.bold: true
            color: Theme.textPrimary
        }

        Text {
            visible: root.groups.length === 0
            text: "No groups were returned. Nothing to commit."
            color: Theme.textMuted
        }

        // Commit groups list
        Rectangle {
            width: parent.width
            height: 400
            color: Theme.surface
            radius: 6
            border.color: Theme.border
            border.width: 1
            clip: true

            ListView {
                anchors.fill: parent
                anchors.margins: 4
                clip: true
                model: root.groups
                spacing: 6

                delegate: Rectangle {
                    width: ListView.view.width - 8
                    x: 4
                    height: commitMsgText.implicitHeight + filesText.implicitHeight + 28
                    radius: 6
                    color: Theme.surface2
                    border.color: Theme.border
                    border.width: 1

                    Column {
                        anchors { fill: parent; margins: 12 }
                        spacing: 4

                        Text {
                            id: commitMsgText
                            text: modelData.message
                            font.bold: true
                            font.pixelSize: 13
                            color: Theme.textPrimary
                            width: parent.width
                            wrapMode: Text.WordWrap
                        }
                        Text {
                            id: filesText
                            text: (modelData.files || []).join(", ")
                            wrapMode: Text.WordWrap
                            width: parent.width
                            color: Theme.textSecondary
                            font.pixelSize: 12
                        }
                    }
                }
            }
        }

        // Status message
        Text {
            text: root.statusMessage
            color: root.statusMessage.indexOf("failed") >= 0 ? Theme.danger : Theme.success
            visible: root.statusMessage.length > 0
            font.bold: true
        }
        Text {
            text: root.lastError
            color: Theme.danger
            visible: root.lastError.length > 0
            width: parent.width
            wrapMode: Text.WordWrap
            font.pixelSize: 12
        }

        // Timers for async UI updates
        Timer {
            id: commitTimer
            interval: 50
            onTriggered: {
                root.lastError = ""
                var selectedIds = Object.keys(root.selectedTasks)
                var made = 0
                var failed = []
                for (var i = 0; i < root.groups.length; i++) {
                    var g = root.groups[i]
                    var commitSha = root.repo.stageAndCommit(g.files || [], g.message)
                    if (commitSha !== "") {
                        made++
                        root.api.reportCommit(commitSha, g.message, selectedIds)
                    } else {
                        failed.push(g.message)
                    }
                }
                // Allow pushing whatever did get committed
                root.hasCommitted = made > 0
                if (failed.length === 0) {
                    root.statusMessage = "Committed successfully. Ready to push."
                } else {
                    root.statusMessage = made + " of " + root.groups.length + " commits made; failed: " + failed.join("; ")
                }
            }
        }

        Timer {
            id: pushTimer
            interval: 50
            onTriggered: {
                var pushed = root.repo.pushCurrentBranch(root.githubToken, remotePicker.currentText)
                if (pushed) {
                    root.statusMessage = "Pushed to '" + remotePicker.currentText + "' successfully!"
                } else {
                    root.statusMessage = "Push to '" + remotePicker.currentText + "' failed. See the details below."
                }
            }
        }

        // Action row
        RowLayout {
            spacing: 12

            Button {
                text: root.hasCommitted ? "Close" : "Back"
                onClicked: root.done()
            }

            Item { Layout.fillWidth: true }

            RowLayout {
                spacing: 8
                Text { text: "Tasks:"; color: Theme.textPrimary; font.bold: true }
                Button {
                    id: linkTasksBtn
                    text: root.selectedTaskCount > 0 ? root.selectedTaskCount + " Selected..." : "Select..."
                    enabled: !root.hasCommitted
                    onClicked: newCommitTaskDialog.open()
                }
            }

            Button {
                text: root.statusMessage === "Committing..." ? "Committing..." : "Commit Local Changes"
                enabled: root.groups.length > 0 && !root.hasCommitted && root.statusMessage !== "Committing..."
                onClicked: {
                    root.statusMessage = "Committing..."
                    commitTimer.start()
                }
            }

            ComboBox {
                id: remotePicker
                model: root.availableRemotes
                enabled: root.hasCommitted && root.availableRemotes.length > 0
                implicitWidth: 140
                displayText: root.availableRemotes.length > 0 ? currentText : "No remotes"
            }

            Button {
                text: root.statusMessage.indexOf("Pushing") === 0 ? "Pushing..." : "Push to Remote"
                enabled: root.hasCommitted && root.availableRemotes.length > 0 && root.statusMessage.indexOf("Pushing") !== 0
                onClicked: {
                    root.statusMessage = "Pushing to '" + remotePicker.currentText + "'..."
                    pushTimer.start()
                }
            }
        }
    }

    // ── Multi-select Task Dialog ───────────────────────────────────────────────
    Dialog {
        id: newCommitTaskDialog
        title: "Link Commits to Tasks"
        standardButtons: Dialog.Ok
        modal: true
        anchors.centerIn: parent
        width: 400
        height: 380

        background: Rectangle {
            color: Theme.bg
            border.color: Theme.border
            radius: 8
        }

        property var filteredTasks: []

        function updateModel() {
            var term = newCommitTaskSearch.text.toLowerCase()
            var all = window.availableTasks || []
            var res = []
            for (var i = 0; i < all.length; i++) {
                if (term === "" || (all[i].title || "").toLowerCase().indexOf(term) >= 0) res.push(all[i])
            }
            filteredTasks = res
        }

        function toggle(taskId, on) {
            var copy = {}
            for (var k in root.selectedTasks) copy[k] = true
            if (on) copy[taskId] = true
            else delete copy[taskId]
            root.selectedTasks = copy
        }

        onAboutToShow: {
            newCommitTaskSearch.text = ""
            updateModel()
        }

        ColumnLayout {
            spacing: 8
            anchors.fill: parent
            Text {
                text: "Search and select tasks:"
                color: Theme.textPrimary
                font.bold: true
            }
            TextField {
                id: newCommitTaskSearch
                Layout.fillWidth: true
                placeholderText: "Type to search..."
                color: Theme.textPrimary
                background: Rectangle { 
                    color: Theme.dark ? Theme.surface : "#eef1f5" 
                    border.color: Theme.dark ? Theme.border : "#c0c7ce"
                    border.width: 1
                    radius: 4 
                    implicitHeight: 30
                }
                onTextChanged: newCommitTaskDialog.updateModel()
            }
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: Theme.surface2; border.color: Theme.border; border.width: 1; radius: 4
                clip: true

                ListView {
                    id: newCommitTaskPicker
                    anchors.fill: parent; anchors.margins: 4
                    model: newCommitTaskDialog.filteredTasks
                    boundsBehavior: Flickable.StopAtBounds
                    clip: true
                    delegate: CheckBox {
                        id: newTaskCheck
                        width: ListView.view.width
                        text: modelData.title
                        checked: root.selectedTasks[modelData.id] === true
                        onToggled: newCommitTaskDialog.toggle(modelData.id, checked)
                        contentItem: Text {
                            text: newTaskCheck.text
                            font.pixelSize: 13
                            color: Theme.textPrimary
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                            leftPadding: newTaskCheck.indicator.width + newTaskCheck.spacing
                        }
                    }
                }

                Text {
                    anchors.centerIn: parent
                    width: parent.width - 24
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    visible: newCommitTaskPicker.count === 0
                    color: Theme.textMuted
                    text: root.api.authToken === "" || root.api.projectId === ""
                        ? "Sign in to Loopin and pick a project in the Settings tab to link tasks."
                        : ((window.availableTasks || []).length === 0
                            ? "No tasks loaded for this project. Check your sign-in and project in Settings."
                            : "No tasks match your search.")
                }
            }
        }
    }
}
