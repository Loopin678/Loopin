import QtQuick
import QtQuick.Controls
import App

ApplicationWindow {
    id: window
    width: 900
    height: 650
    visible: true
    title: "Loopin"
    color: Theme.bg

    // C++ objects, instantiated once for the app's lifetime.
    GitHubAuth { id: gitHubAuth }
    GitRepo { id: gitRepo }
    ApiClient {
        id: apiClient
        // Leave empty to use the built-in mock grouping while your
        // backend doesn't exist yet, e.g.:
        // backendUrl: "http://localhost:8080"
    }
    ChangeWatcher { id: changeWatcher }

    property string githubToken: ""
    // In the real app this would come from whatever task the user is
    // currently assigned on your website.
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
