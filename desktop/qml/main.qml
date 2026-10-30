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
        // "Sign in with Loopin" token (plain settings file, like the AI keys)
        property string authToken: ""
        // Find the backend address from loopinDiscoveryUrl instead of backendUrl
        property bool backendAutomatic: true
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
        authToken: settings.authToken

        onBackendUrlChanged: settings.backendUrl = backendUrl
        onAiProviderChanged: settings.aiProvider = aiProvider
        onGeminiApiKeyChanged: settings.geminiApiKey = geminiApiKey
        onOpenRouterApiKeyChanged: settings.openRouterApiKey = openRouterApiKey
        onProjectIdChanged: settings.projectId = projectId
        onUserIdChanged: settings.userId = userId
        onAuthTokenChanged: settings.authToken = authToken

        onBackendUrlDiscovered: function(url) { window.loadLoopinData() }
        onSignedIn: function(user) {
            window.account = user
            apiClient.fetchProjects()
        }
        onAccountReady: function(user) { window.account = user }
        onProjectsReady: function(list) {
            window.projects = list
            // Forget a project I no longer belong to
            var stillThere = false
            for (var i = 0; i < list.length; i++) if (list[i].id === apiClient.projectId) stillThere = true
            if (!stillThere && list.length > 0) window.chooseProject(list[0].id)
            else if (!stillThere) window.chooseProject("")
        }
        onSignedOut: function(reason) {
            window.account = null
            window.projects = []
            window.availableTasks = []
            window.linkedCommits = ({})
        }

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
    property var account: null      // signed-in Loopin user, or null
    property var projects: []        // my Loopin projects [{id, name}]

    // Find the backend (Automatic mode), then load everything for the signed-in user
    function connectToLoopin() {
        if (settings.backendAutomatic && loopinDiscoveryUrl !== "") apiClient.discoverBackendUrl(loopinDiscoveryUrl)
        else loadLoopinData()
    }
    function loadLoopinData() {
        if (apiClient.authToken === "") return
        apiClient.fetchAccount()
        apiClient.fetchProjects()
        if (apiClient.projectId !== "") {
            apiClient.fetchTasks()
            apiClient.fetchProjectCommits()
        }
    }
    function chooseProject(id) {
        apiClient.projectId = id
        window.availableTasks = []
        window.linkedCommits = ({})
        if (id !== "") {
            apiClient.fetchTasks()
            apiClient.fetchProjectCommits()
        }
    }

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
                window.connectToLoopin()
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
