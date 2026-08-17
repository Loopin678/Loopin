import QtQuick
import QtQuick.Controls
import Qt.labs.settings
import App

ApplicationWindow {
    id: window
    width: 900
    height: 650
    visible: true
    title: "Loopin"
    color: Theme.bg

    Settings {
        id: settings
        property string lastRepoPath: ""
    }

    // C++ objects, instantiated once for the app's lifetime.
    GitHubAuth { id: gitHubAuth }
    GitRepo { 
        id: gitRepo 
        onRepoPathChanged: {
            if (repoPath !== "") settings.lastRepoPath = repoPath
        }
    }
    ApiClient {
        id: apiClient
    }
    ChangeWatcher { id: changeWatcher }

    property string githubToken: ""
    property string currentTaskId: "TASK-DEMO-1"

    StackView {
        id: stack
        anchors.fill: parent
        initialItem: loginViewComponent
    }

    Component {
        id: loginViewComponent
        LoginView {
            auth: gitHubAuth
            onLoggedIn: function(token) {
                window.githubToken = token
                stack.push(inboxViewComponent)
            }
        }
    }

    Component {
        id: inboxViewComponent
        ChangeInboxView {
            repo: gitRepo
            api: apiClient
            watcher: changeWatcher
            taskId: window.currentTaskId
            githubToken: window.githubToken
            
            Component.onCompleted: {
                if (settings.lastRepoPath !== "") {
                    // Try to auto-open
                    if (repo.openRepository(settings.lastRepoPath)) {
                        repo.refreshDiff()
                        watcher.start(2000)
                    }
                }
            }

            onGroupsReady: function(groups) {
                stack.push(reviewComponent, {
                    groups: groups,
                    repo: gitRepo,
                    api: apiClient,
                    taskId: window.currentTaskId,
                    githubToken: window.githubToken
                })
            }
        }
    }

    Component {
        id: reviewComponent
        CommitReviewView {
            onDone: stack.pop()
        }
    }
}
