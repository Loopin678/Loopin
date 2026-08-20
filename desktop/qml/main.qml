import QtQuick
import QtQuick.Controls
import Qt.labs.settings
import App

ApplicationWindow {
    id: window
    width: 950
    height: 700
    visible: true
    title: "Loopin"
    color: Theme.bg

    // Global application typography
    font.family: "Segoe UI, Inter, Roboto, sans-serif"
    font.pixelSize: 13

    Settings {
        id: settings
        property string lastRepoPath: ""
        property string backendUrl: "http://localhost:3000"
        property string aiProvider: "ollama"
        property string geminiApiKey: ""
        property string openRouterApiKey: ""
        property string projectId: ""
        property string userId: ""
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
        backendUrl: settings.backendUrl
        aiProvider: settings.aiProvider
        geminiApiKey: settings.geminiApiKey
        openRouterApiKey: settings.openRouterApiKey
        projectId: settings.projectId
        userId: settings.userId

        onBackendUrlChanged: settings.backendUrl = backendUrl
        onAiProviderChanged: settings.aiProvider = aiProvider
        onGeminiApiKeyChanged: settings.geminiApiKey = geminiApiKey
        onOpenRouterApiKeyChanged: settings.openRouterApiKey = openRouterApiKey
        onProjectIdChanged: settings.projectId = projectId
        onUserIdChanged: settings.userId = userId

        onTasksReady: function(tasksList) {
            window.availableTasks = tasksList
        }
        onProjectCommitsReady: function(commitsList) {
            var map = {}
            for (var i = 0; i < commitsList.length; i++) {
                var c = commitsList[i]
                var tIds = []
                if (c.tasks) {
                    for (var j = 0; j < c.tasks.length; j++) {
                        tIds.push(c.tasks[j].id)
                    }
                }
                map[c.id] = tIds
            }
            window.linkedCommits = map
        }
        onCommitReported: function(sha) {
            if (projectId !== "") {
                apiClient.fetchProjectCommits()
            }
        }
    }
    ChangeWatcher { id: changeWatcher }

    property string githubToken: ""
    property string currentTaskId: "TASK-DEMO-1"
    property var availableTasks: []
    property var linkedCommits: ({})

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
                if (settings.projectId !== "") {
                    apiClient.fetchTasks()
                    apiClient.fetchProjectCommits()
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
            onDone: {
                stack.pop()
                gitRepo.refreshDiff()
            }
        }
    }
}
