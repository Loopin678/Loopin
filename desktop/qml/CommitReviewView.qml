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

        // Timers for async UI updates
        Timer {
            id: commitTimer
            interval: 50
            onTriggered: {
                var allOk = true
                for (var i = 0; i < root.groups.length; i++) {
                    var g = root.groups[i]
                    var commitSha = root.repo.stageAndCommit(g.files, g.message)
                    if (commitSha !== "") {
                        var selectedTaskId = taskPicker.currentIndex > 0 ? taskPicker.model[taskPicker.currentIndex].id : ""
                        root.api.reportCommit(commitSha, g.message, selectedTaskId)
                    } else {
                        allOk = false
                        console.log("Commit failed for:", g.message)
                    }
                }
                if (allOk) {
                    root.hasCommitted = true
                    root.statusMessage = "Committed successfully. Ready to push."
                } else {
                    root.statusMessage = "Some commits failed."
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
                    root.statusMessage = "Push to '" + remotePicker.currentText + "' failed. Check the application logs."
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
                Text { text: "Task:"; color: Theme.textPrimary; font.bold: true }
                ComboBox {
                    id: taskPicker
                    textRole: "title"
                    model: {
                        var defaultTask = [{ id: "", title: "None" }]
                        return defaultTask.concat(window.availableTasks || [])
                    }
                    enabled: !root.hasCommitted
                    implicitWidth: 150
                    displayText: currentText
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
}
