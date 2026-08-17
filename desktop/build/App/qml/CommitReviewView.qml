import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

Item {
    id: root
    property var groups: []
    property var repo
    property var api
    property string taskId
    property string githubToken
    signal done()

    Column {
        anchors.fill: parent
        anchors.margins: 16
        spacing: 12

        Text {
            text: "Proposed commits"
            font.pixelSize: 20
            font.bold: true
        }

        Text {
            visible: root.groups.length === 0
            text: "No groups were returned. Nothing to commit."
            color: "#888"
        }

        ListView {
            width: parent.width
            height: 420
            clip: true
            model: root.groups
            delegate: Rectangle {
                width: ListView.view.width
                height: 90
                border.color: "#ccc"
                radius: 6
                color: "transparent"

                Column {
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 4
                    Text { text: modelData.message; font.bold: true }
                    Text {
                        text: (modelData.files || []).join(", ")
                        wrapMode: Text.WordWrap
                        width: parent.width
                        color: "#555"
                    }
                }
            }
        }

        RowLayout {
            spacing: 12
            Button {
                text: "Back"
                onClicked: root.done()
            }
            Button {
                text: "Confirm and Push"
                enabled: root.groups.length > 0
                onClicked: {
                    for (var i = 0; i < root.groups.length; i++) {
                        var g = root.groups[i]
                        var ok = root.repo.stageAndCommit(g.files, g.message)
                        if (ok) {
                            root.api.reportCommit("", g.message, root.taskId)
                        } else {
                            console.log("Commit failed for:", g.message)
                        }
                    }
                    var pushed = root.repo.pushCurrentBranch(root.githubToken)
                    console.log(pushed ? "Pushed." : "Push failed.")
                    root.done()
                }
            }
        }
    }
}
