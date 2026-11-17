import QtQuick
import QtQuick.Controls
import QtCore
import App

ApplicationWindow {
    id: window
    width: 950
    height: 700
    visible: true
    title: "Loopin " + Qt.application.version
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
        // After each commit, suggest moving the task it finishes to Done
        property bool suggestDoneTasks: true
    }
    property alias suggestDoneTasks: settings.suggestDoneTasks

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

        // Step 2 of commit → Done: the backend answered which tasks this commit
        // likely completes. Only bother the user when there is something to approve.
        onTaskSuggestionsReady: function(sha, result) {
            var details = window.pendingSuggestionCommits[sha]
            var copy = {}
            for (var k in window.pendingSuggestionCommits) if (k !== sha) copy[k] = window.pendingSuggestionCommits[k]
            window.pendingSuggestionCommits = copy
            if (!details || !result.suggestions || result.suggestions.length === 0 || !result.doneList) return

            taskSuggestionDialog.enqueue({
                sha: sha,
                shortSha: details.shortSha,
                message: details.message,
                engine: result.engine,
                engineNote: result.engineNote || "",
                doneListName: result.doneList.name,
                suggestions: result.suggestions
            })
        }

        // Step 3: the user approved and the backend moved the tasks. Refresh what
        // the desktop shows (task list, commit→task links); the web board already
        // updated itself over the socket.
        onTasksCompleted: function(sha, moved, doneListName) {
            apiClient.fetchTasks()
            apiClient.fetchProjectCommits()
        }
    }
    ChangeWatcher { id: changeWatcher }

    // Step 1 of commit → Done: GitRepo noticed new commits of yours on the current
    // branch (made here, in a terminal or in an IDE). Read each commit's message +
    // diff locally and ask the backend which open tasks it finishes.
    Connections {
        target: gitRepo
        function onNewCommitsDetected(shas) {
            if (!settings.suggestDoneTasks) return
            var pending = {}
            for (var k in window.pendingSuggestionCommits) pending[k] = window.pendingSuggestionCommits[k]
            for (var i = 0; i < shas.length; i++) {
                var details = gitRepo.commitDetails(shas[i])
                if (!details.sha) continue
                // Returns false when no Project ID / User ID is set: no board to check against
                if (apiClient.requestTaskSuggestions(details))
                    pending[details.sha] = { shortSha: details.shortSha, message: details.message }
            }
            window.pendingSuggestionCommits = pending
        }
    }

    TaskSuggestionDialog {
        id: taskSuggestionDialog
        api: apiClient
        parent: Overlay.overlay
        anchors.centerIn: parent
    }

    property string githubToken: ""
    property string currentTaskId: "TASK-DEMO-1"
    property var availableTasks: []
    property var linkedCommits: ({})
    // sha -> { shortSha, message } for commits whose task suggestions are still loading
    property var pendingSuggestionCommits: ({})

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
