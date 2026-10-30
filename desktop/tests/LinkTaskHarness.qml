import QtQuick
import QtQuick.Controls
import App

// Mirrors main.qml's ApiClient wiring, without the GitHub sign-in screen
ApplicationWindow {
    id: window
    width: 950; height: 700; visible: true
    property var availableTasks: []
    property var linkedCommits: ({})
    property alias inbox: inboxView
    property alias api: apiClient
    property alias repo: gitRepo

    GitRepo { id: gitRepo }
    ChangeWatcher { id: changeWatcher }
    ApiClient {
        id: apiClient
        onTasksReady: function(t) { window.availableTasks = t }
        onProjectCommitsReady: function(commitsList) {
            var map = {}
            for (var i = 0; i < commitsList.length; i++) {
                var c = commitsList[i]; var ids = []
                for (var j = 0; j < (c.tasks || []).length; j++) ids.push(c.tasks[j].id)
                map[c.id] = ids
            }
            window.linkedCommits = map
        }
        onCommitReported: function(sha) { apiClient.fetchProjectCommits() }
    }
    ChangeInboxView { id: inboxView; anchors.fill: parent; repo: gitRepo; api: apiClient; watcher: changeWatcher; taskId: "" }
}
