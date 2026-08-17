import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import App

Item {
    id: root
    property var repo
    property var api
    property var watcher
    property string taskId
    signal groupsReady(var groups)

    Column {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        RowLayout {
            width: parent.width
            spacing: 8

            TextField {
                id: pathField
                Layout.fillWidth: true
                placeholderText: "Path to local git repository, e.g. /home/you/my-project"
            }
            Button {
                text: "Open"
                onClicked: {
                    if (root.repo.openRepository(pathField.text)) {
                        root.repo.refreshDiff()
                        root.watcher.start(2000)
                    }
                }
            }
        }

        Text {
            text: root.repo.isOpen
                ? ("Repo: " + root.repo.repoPath + "  (branch: " + root.repo.currentBranchName() + ")")
                : "No repository open"
            font.italic: true
        }

        Text {
            text: "Task: " + root.taskId
            color: "#555"
        }

        Text {
            text: "Changed files (" + root.repo.diffModel.count + ")"
            font.bold: true
        }

        ListView {
            width: parent.width
            height: 320
            clip: true
            model: root.repo.diffModel
            delegate: RowLayout {
                width: ListView.view.width
                spacing: 8

                CheckBox {
                    checked: model.selected
                    onToggled: root.repo.diffModel.setSelected(index, checked)
                }
                Text {
                    text: model.changeType
                    color: "#888"
                    Layout.preferredWidth: 80
                }
                Text {
                    text: model.filePath
                    Layout.fillWidth: true
                    elide: Text.ElideMiddle
                }
            }
        }

        RowLayout {
            spacing: 12
            Button {
                text: "Refresh now"
                onClicked: root.repo.refreshDiff()
            }
            Button {
                text: "Organize Changes"
                enabled: root.repo.isOpen && root.repo.diffModel.count > 0
                onClicked: root.api.requestCommitGroups(root.repo.diffModel.toJson(), root.taskId)
            }
        }
    }

    Connections {
        target: root.watcher
        function onTick() {
            if (root.repo.isOpen) root.repo.refreshDiff()
        }
    }

    Connections {
        target: root.api
        function onCommitGroupsReady(groups) {
            root.groupsReady(groups)
        }
        function onRequestFailed(error) {
            console.log("API error:", error)
        }
    }
}
