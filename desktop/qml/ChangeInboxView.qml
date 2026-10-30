import QtQuick
import QtQuick.Controls
import QtQuick.Layouts
import QtQuick.Dialogs
import QtQml
import App

Item {
    id: root
    property var repo
    property var api
    property var watcher
    property string taskId
    property string githubToken: ""
    signal groupsReady(var groups)

    // Loading states
    property bool fetchBusy: false
    property bool pullBusy: false
    property bool pushBusy: false
    property bool checkoutBusy: false
    property bool commitBusy: false
    property bool gitignoreBusy: false
    property bool aiOrganizeBusy: false
    property bool mergeResolveBusy: false
    property string opsStatus: ""
    property bool opsIsError: false
    property var unpushedShas: []
    
    // AI Merge Resolution State
    property var pendingConflicts: []
    property string currentMergePreference: ""

    function resolveNextConflict() {
        if (root.pendingConflicts.length === 0) {
            root.mergeResolveBusy = false
            var ok = root.repo.commitResolvedMerge()
            root.opsStatus = ok ? "Merge resolved and committed!" : "Merge resolved but commit failed"
            root.opsIsError = !ok
            return
        }
        var filePath = root.pendingConflicts.shift()
        var content = root.repo.readFile(filePath)
        if (content === "") {
            root.opsStatus = "Failed to read conflicted file: " + filePath
            root.opsIsError = true
            root.repo.abortMerge()
            return
        }
        root.opsStatus = "Resolving " + filePath + " using AI..."
        root.api.requestMergeResolution(filePath, content, root.currentMergePreference)
    }

    // "Keep mine/theirs" is mechanical, so use git directly instead of asking the AI
    function resolveAllWithSide(files, keepOurs) {
        for (var i = 0; i < files.length; i++) {
            if (!root.repo.resolveConflictWithSide(files[i], keepOurs)) {
                root.repo.abortMerge()
                return
            }
        }
        var ok = root.repo.commitResolvedMerge()
        if (ok) showStatus("Merge resolved (" + (keepOurs ? "kept my changes" : "kept their changes") + ") and committed", false)
    }

    // Task ids linked to a commit. Older desktop builds stored 7-char SHAs.
    function linkedTaskIds(fullSha) {
        var map = window.linkedCommits || {}
        return map[fullSha] || map[fullSha.substring(0, 7)] || []
    }

    function showStatus(message, isError) {
        root.opsStatus = message
        root.opsIsError = isError
    }

    function refreshUnpushed() {
        if (root.repo.isOpen && root.repo.remotes.length > 0)
            root.unpushedShas = root.repo.unpushedCommitShas(remotePicker.currentText)
        else
            root.unpushedShas = []
    }

    function refreshAll() {
        if (root.repo.isOpen) {
            root.repo.refreshDiff()
            historyList.model = root.repo.commitHistory(50)
            stashListView.model = root.repo.stashList()
            refreshUnpushed()
        }
    }

    Connections {
        target: root.repo
        // Only updates the file list (DiffModel). Does not spawn QProcesses or history lookups!
        function onDiffChanged()  { }
        // Triggers on full repo updates (commits, fetch, pull, push, stash)
        function onRepoChanged()  { 
            historyList.model = root.repo.commitHistory(50); 
            stashListView.model = root.repo.stashList(); 
            refreshUnpushed() 
        }
        
        // Async completion handlers
        function onCheckoutFinished(ok, errorMsg) {
            root.checkoutBusy = false
            root.opsStatus = ok ? "Switched to branch" : "Checkout failed"
            root.opsIsError = !ok
            if (ok) refreshAll()
        }
        function onFetchFinished(ok, errorMsg) {
            root.fetchBusy = false
            root.opsStatus = ok ? "Fetch complete" : "Fetch failed"
            root.opsIsError = !ok
        }
        function onPullFinished(ok, errorMsg) {
            root.pullBusy = false
            root.opsStatus = ok ? "Pull complete" : "Pull failed"
            root.opsIsError = !ok
        }
        function onPushFinished(ok, errorMsg) {
            root.pushBusy = false
            root.opsStatus = ok ? "Push complete" : "Push failed"
            root.opsIsError = !ok
        }
        function onMergeConflictDetected(files) {
            mergeConflictDialog.conflictedFiles = files
            mergeConflictDialog.open()
        }
        // Every git failure reports its details here; nothing listened before,
        // so failed pushes/checkouts showed no reason at all
        function onErrorOccurred(errorMessage) {
            showStatus(errorMessage, true)
        }
    }

    Connections {
        target: root.api
        function onCommitGroupsReady(groups) { 
            root.aiOrganizeBusy = false
            root.groupsReady(groups) 
        }
        function onGitignoreReady(content) {
            root.gitignoreBusy = false
            gitignorePreview.text = content
            gitignoreDialog.open()
        }
        function onMergeResolutionReady(filePath, resolvedContent) {
            var ok = root.repo.resolveConflictFile(filePath, resolvedContent)
            if (ok) {
                resolveNextConflict()
            } else {
                root.mergeResolveBusy = false
                root.opsStatus = "Failed to save resolved file: " + filePath
                root.opsIsError = true
                root.repo.abortMerge()
            }
        }
        function onRequestFailed(errorString) {
            root.aiOrganizeBusy = false
            root.gitignoreBusy = false
            if (root.mergeResolveBusy) {
                root.mergeResolveBusy = false
                root.repo.abortMerge()
                errorString += "\nThe merge was aborted; your branch is unchanged."
            }
            showStatus("AI request failed: " + errorString, true)
        }
        function onBackendError(errorString) {
            showStatus(errorString, true)
            // Drop optimistic task links that the server did not accept
            if (root.api.projectId !== "") root.api.fetchProjectCommits()
        }
        function onCommitReported(sha) {
            showStatus("Task links saved for " + sha.substring(0, 7), false)
        }
    }

    Rectangle { anchors.fill: parent; color: Theme.bg }

    ColumnLayout {
        anchors.fill: parent
        spacing: 0

        // ── Repo header bar ────────────────────────────────────────────
        Rectangle {
            Layout.fillWidth: true; height: 48
            color: Theme.surface
            Rectangle { height: 1; width: parent.width; anchors.bottom: parent.bottom; color: Theme.border }

            RowLayout {
                anchors { fill: parent; leftMargin: 12; rightMargin: 12 }
                spacing: 8
                TextField {
                    id: pathField; Layout.fillWidth: true
                    placeholderText: "Path to git repository..."
                    font.pixelSize: 12
                }
                Button { text: "Browse"; onClicked: folderDialog.open() }
                Button {
                    text: "Open"
                    onClicked: {
                        if (root.repo.openRepository(pathField.text)) {
                            root.repo.refreshDiff()
                            root.watcher.start(2000)
                            refreshAll()
                        }
                    }
                }
            }
        }

        // ── Branch + Git operations bar ────────────────────────────────
        Rectangle {
            Layout.fillWidth: true; height: 44
            color: Theme.surface2
            Rectangle { height: 1; width: parent.width; anchors.bottom: parent.bottom; color: Theme.border }

            RowLayout {
                anchors { fill: parent; leftMargin: 12; rightMargin: 12 }
                spacing: 6

                // Branch picker
                Button {
                    text: "+"
                    enabled: root.repo.isOpen
                    implicitWidth: 32
                    font.bold: true
                    ToolTip.visible: hovered; ToolTip.text: "Create new branch"
                    onClicked: newBranchDialog.open()
                }

                Dialog {
                    id: newBranchDialog
                    title: "Create New Branch"
                    standardButtons: Dialog.Ok | Dialog.Cancel
                    x: Math.round((root.width - width) / 2)
                    y: Math.round((root.height - height) / 2)
                    width: 300
                    
                    ColumnLayout {
                        anchors.fill: parent
                        TextField {
                            id: newBranchNameField
                            placeholderText: "Branch name"
                            Layout.fillWidth: true
                            onAccepted: newBranchDialog.accept()
                        }
                    }
                    
                    onOpened: newBranchNameField.forceActiveFocus()
                    onAccepted: {
                        var bName = newBranchNameField.text.trim()
                        if (bName !== "") {
                            var ok = root.repo.createBranch(bName, true) // create and checkout
                            if (ok) {
                                root.opsStatus = "Created branch " + bName
                                root.opsIsError = false
                                refreshAll()
                            } else {
                                root.opsStatus = "Failed to create branch."
                                root.opsIsError = true
                            }
                        }
                        newBranchNameField.text = ""
                    }
                }

                Dialog {
                    id: mergeConflictDialog
                    title: "Merge Conflict Detected"
                    x: Math.round((root.width - width) / 2)
                    y: Math.round((root.height - height) / 2)
                    width: 650
                    modal: true
                    
                    property var conflictedFiles: []
                    
                    ColumnLayout {
                        anchors.fill: parent
                        spacing: 12
                        
                        Label {
                            text: "Git encountered conflicts while merging. How would you like to resolve them?"
                            wrapMode: Text.WordWrap
                            Layout.fillWidth: true
                            font.pixelSize: 14
                        }
                        
                        Rectangle {
                            Layout.fillWidth: true
                            Layout.preferredHeight: 100
                            color: Theme.bg
                            border.color: Theme.border
                            
                            ScrollView {
                                anchors.fill: parent
                                anchors.margins: 4
                                ListView {
                                    model: mergeConflictDialog.conflictedFiles
                                    delegate: Label { text: modelData; font.family: "monospace" }
                                }
                            }
                        }
                        
                        RowLayout {
                            Layout.alignment: Qt.AlignRight
                            spacing: 8
                            
                            Button {
                                text: "Keep My Changes"
                                onClicked: {
                                    mergeConflictDialog.close()
                                    root.resolveAllWithSide(mergeConflictDialog.conflictedFiles, true)
                                }
                            }
                            Button {
                                text: "Keep Their Changes"
                                onClicked: {
                                    mergeConflictDialog.close()
                                    root.resolveAllWithSide(mergeConflictDialog.conflictedFiles, false)
                                }
                            }
                            Button {
                                text: "Use AI (Intelligent)"
                                highlighted: true
                                font.bold: true
                                onClicked: {
                                    root.currentMergePreference = "Intelligently merge both sets of changes. If they add different features, keep both. If they conflict logically, keep the one that makes more sense in the context of the file."
                                    root.pendingConflicts = mergeConflictDialog.conflictedFiles.slice()
                                    root.mergeResolveBusy = true
                                    mergeConflictDialog.close()
                                    root.resolveNextConflict()
                                }
                            }
                            Button {
                                text: "Abort Merge"
                                onClicked: {
                                    root.repo.abortMerge()
                                    root.opsStatus = "Merge aborted"
                                    root.opsIsError = true
                                    mergeConflictDialog.close()
                                }
                            }
                        }
                    }
                }

                ComboBox {
                    id: branchPicker
                    model: root.repo.isOpen ? root.repo.branches : []
                    enabled: root.repo.isOpen
                    implicitWidth: 140; font.pixelSize: 12
                    font.bold: true
                    displayText: root.repo.isOpen && root.repo.currentBranchName !== "" ? root.repo.currentBranchName : "No branch"
                    
                    property string pendingBranch: ""
                    onActivated: function(index) {
                        var selectedBranch = model[index]
                        if (selectedBranch !== root.repo.currentBranchName) {
                            root.checkoutBusy = true
                            root.opsStatus = "Switching to " + selectedBranch + "..."
                            root.opsIsError = false
                            branchPicker.pendingBranch = selectedBranch
                            checkoutTimer.start()
                        }
                    }
                }
                Timer {
                    id: checkoutTimer; interval: 50; repeat: false
                    onTriggered: {
                        var ok = root.repo.checkoutBranch(branchPicker.pendingBranch)
                        root.checkoutBusy = false
                        if (ok) {
                            root.opsStatus = "Switched to branch"
                            root.opsIsError = false
                            refreshAll()
                        } else {
                            root.opsStatus = "Checkout failed. Stash or commit your changes first."
                            root.opsIsError = true
                        }
                    }
                }

                Button {
                    text: "Merge..."
                    enabled: root.repo.isOpen && root.repo.branches.length > 1
                    onClicked: mergeMenu.open()
                    
                    Menu {
                        id: mergeMenu
                        y: parent.height
                        Instantiator {
                            model: root.repo.isOpen ? root.repo.branches : []
                            MenuItem {
                                text: modelData
                                visible: modelData !== root.repo.currentBranchName
                                onClicked: {
                                    var ok = root.repo.mergeBranch(modelData)
                                    root.opsStatus = ok ? "Merged " + modelData : "Merge failed"
                                    root.opsIsError = !ok
                                    if (ok) refreshAll()
                                }
                            }
                            onObjectAdded: function(index, object) { mergeMenu.insertItem(index, object) }
                            onObjectRemoved: function(index, object) { mergeMenu.removeItem(object) }
                        }
                    }
                }

                Button {
                    text: "Delete..."
                    enabled: root.repo.isOpen && root.repo.localBranches.length > 1
                    onClicked: deleteMenu.open()
                    
                    Menu {
                        id: deleteMenu
                        y: parent.height
                        Instantiator {
                            // Remote branches (origin/x) can't be deleted with `git branch -d`
                            model: root.repo.isOpen ? root.repo.localBranches : []
                            MenuItem {
                                text: modelData
                                visible: modelData !== root.repo.currentBranchName
                                onClicked: {
                                    deleteBranchConfirm.branchName = modelData
                                    deleteBranchConfirm.open()
                                }
                            }
                            onObjectAdded: function(index, object) { deleteMenu.insertItem(index, object) }
                            onObjectRemoved: function(index, object) { deleteMenu.removeItem(object) }
                        }
                    }
                }

                // Unpushed count badge
                Rectangle {
                    radius: 4; color: Theme.warning
                    width: unpushedLabel.implicitWidth + 14; height: 24
                    visible: root.unpushedShas.length > 0
                    Text {
                        id: unpushedLabel; anchors.centerIn: parent
                        text: root.unpushedShas.length + " unpushed"
                        color: "white"; font.pixelSize: 11; font.bold: true
                    }
                }

                Item { Layout.fillWidth: true }

                // Remote picker
                ComboBox {
                    id: remotePicker
                    model: root.repo.isOpen ? root.repo.remotes : []
                    enabled: root.repo.isOpen && !root.fetchBusy && !root.pullBusy && !root.pushBusy
                    implicitWidth: 120; font.pixelSize: 12
                    displayText: (root.repo.isOpen && root.repo.remotes.length > 0) ? currentText : "No remotes"
                    onCurrentTextChanged: refreshUnpushed()
                }

                // Status (first line; hover or click for the full message)
                Text {
                    text: root.opsStatus.split("\n")[0]
                    color: root.opsIsError ? Theme.danger : Theme.success
                    font.pixelSize: 11; font.bold: true
                    visible: root.opsStatus.length > 0
                    elide: Text.ElideRight
                    Layout.maximumWidth: 280
                    MouseArea {
                        id: statusMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        cursorShape: Qt.PointingHandCursor
                        onClicked: statusDetailsDialog.open()
                    }
                    ToolTip.visible: statusMouse.containsMouse
                    ToolTip.text: root.opsStatus
                }

                Button {
                    text: root.fetchBusy ? "Fetching..." : "Fetch"
                    enabled: root.repo.isOpen && root.repo.remotes.length > 0 && !root.fetchBusy
                    onClicked: { root.fetchBusy = true; root.opsStatus = ""; fetchTimer.start() }
                }
                Timer {
                    id: fetchTimer; interval: 50; repeat: false
                    onTriggered: {
                        var ok = root.repo.fetchRemote(remotePicker.currentText)
                        if (ok) { root.opsStatus = "Fetched."; root.opsIsError = false }
                        root.fetchBusy = false; refreshAll()
                    }
                }

                Button {
                    text: root.pullBusy ? "Pulling..." : "Pull"
                    enabled: root.repo.isOpen && root.repo.remotes.length > 0 && !root.pullBusy
                    onClicked: { root.pullBusy = true; root.opsStatus = ""; pullTimer.start() }
                }
                Timer {
                    id: pullTimer; interval: 50; repeat: false
                    onTriggered: {
                        var ok = root.repo.pullRemote(remotePicker.currentText)
                        if (ok) { root.opsStatus = "Pulled."; root.opsIsError = false }
                        root.pullBusy = false; refreshAll()
                    }
                }

                Button {
                    text: root.pushBusy ? "Pushing..." : "Push"
                    enabled: root.repo.isOpen && root.repo.remotes.length > 0 && !root.pushBusy
                    onClicked: { root.pushBusy = true; root.opsStatus = ""; pushTimer.start() }
                }
                Timer {
                    id: pushTimer; interval: 50; repeat: false
                    onTriggered: {
                        var ok = root.repo.pushCurrentBranch(root.githubToken, remotePicker.currentText)
                        if (ok) { root.opsStatus = "Pushed."; root.opsIsError = false }
                        root.pushBusy = false; refreshAll()
                    }
                }
            }
        }

        // ── Tabs ────────────────────────────────────────────────────────
        TabBar {
            id: tabBar; Layout.fillWidth: true
            TabButton { text: "Changes (" + root.repo.diffModel.count + ")" }
            TabButton { text: "History" }
            TabButton { text: "Stash (" + stashListView.count + ")" }
            TabButton { text: "Tools" }
            TabButton { text: "Settings" }
        }

        StackLayout {
            Layout.fillWidth: true; Layout.fillHeight: true
            currentIndex: tabBar.currentIndex

            // ═══════ TAB 0: Changes ═══════════════════════════════════════
            Item {
                ColumnLayout {
                    anchors.fill: parent; anchors.margins: 16; spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Changed files"
                            font.bold: true; color: Theme.textPrimary; Layout.fillWidth: true
                        }
                        Button {
                            text: "Select All"; flat: true
                            onClicked: { for (var i = 0; i < root.repo.diffModel.count; i++) root.repo.diffModel.setSelected(i, true) }
                        }
                        Button {
                            text: "Deselect All"; flat: true
                            onClicked: { for (var i = 0; i < root.repo.diffModel.count; i++) root.repo.diffModel.setSelected(i, false) }
                        }
                        Button {
                            text: "Discard Selected"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0
                            onClicked: discardConfirm.open()
                            ToolTip.visible: hovered
                            ToolTip.text: "Revert selected files to their last committed state"
                        }
                        Button { text: "Refresh"; onClicked: root.repo.refreshDiff() }
                    }

                    // File list
                    Rectangle {
                        Layout.fillWidth: true; Layout.fillHeight: true
                        color: Theme.surface; radius: 6
                        border.color: Theme.border; border.width: 1; clip: true

                        ListView {
                            anchors.fill: parent; anchors.margins: 4; clip: true
                            model: root.repo.diffModel

                            delegate: Rectangle {
                                width: ListView.view.width; height: 38
                                color: index % 2 === 0 ? Theme.rowBase : Theme.rowAlt
                                Rectangle { height: 1; width: parent.width; anchors.bottom: parent.bottom; color: Theme.divider }

                                MouseArea {
                                    anchors.fill: parent
                                    hoverEnabled: true
                                    onEntered: parent.color = Theme.rowHover
                                    onExited: parent.color = index % 2 === 0 ? Theme.rowBase : Theme.rowAlt
                                    onClicked: root.repo.diffModel.setSelected(index, !model.selected)
                                }

                                RowLayout {
                                    anchors { fill: parent; leftMargin: 12; rightMargin: 12 }
                                    spacing: 8
                                    
                                    CheckBox {
                                        checked: model.selected
                                        onToggled: root.repo.diffModel.setSelected(index, checked)
                                    }
                                    Rectangle {
                                        width: 64; height: 20; radius: 4
                                        color: model.changeType === "added" ? Theme.success
                                             : model.changeType === "deleted" ? Theme.danger : Theme.warning
                                        Text {
                                            anchors.centerIn: parent
                                            text: model.changeType; color: "white"
                                            font.pixelSize: 11; font.bold: true
                                        }
                                    }
                                    Text {
                                        text: model.filePath; color: Theme.textPrimary
                                        Layout.fillWidth: true; elide: Text.ElideMiddle; font.pixelSize: 12
                                    }
                                    // Per-file stash button
                                    Button {
                                        text: "Stash"
                                        font.pixelSize: 11
                                        topPadding: 4; bottomPadding: 4; leftPadding: 8; rightPadding: 8
                                        onClicked: {
                                            root.repo.stashFile(model.filePath)
                                        }
                                        ToolTip.visible: hovered
                                        ToolTip.text: "Stash changes for this file"
                                    }
                                    // Per-file discard button
                                    Button {
                                        text: "Discard"
                                        font.pixelSize: 11
                                        topPadding: 4; bottomPadding: 4; leftPadding: 8; rightPadding: 8
                                        onClicked: {
                                            singleDiscardConfirm.targetFile = model.filePath
                                            singleDiscardConfirm.open()
                                        }
                                        ToolTip.visible: hovered
                                        ToolTip.text: "Revert this file"
                                    }
                                }
                            }

                            Text {
                                anchors.centerIn: parent
                                visible: root.repo.diffModel.count === 0
                                text: root.repo.isOpen ? "Working tree clean." : "Open a repository to see changes."
                                color: Theme.textMuted
                            }
                        }
                    }

                    // Commit message
                    TextField {
                        id: manualMsgField; Layout.fillWidth: true
                        placeholderText: "Commit message (leave blank to let AI write it)"
                        font.pixelSize: 12
                    }

                    // Commit status
                    Text {
                        id: commitStatus; text: ""
                        color: commitStatus.text.indexOf("failed") >= 0 || commitStatus.text.indexOf("No ") >= 0 || commitStatus.text.indexOf("Enter") >= 0 ? Theme.danger : Theme.success
                        font.pixelSize: 12; font.bold: true; visible: text.length > 0
                    }

                    RowLayout {
                        spacing: 8
                        Button {
                            text: root.aiOrganizeBusy ? "Organising..." : "AI Organise & Review"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0 && !root.aiOrganizeBusy
                            onClicked: {
                                root.aiOrganizeBusy = true
                                root.opsStatus = ""
                                root.api.requestCommitGroups(root.repo.diffModel.toJson(), root.taskId)
                            }
                            ToolTip.visible: hovered
                            ToolTip.text: "AI groups files into logical commits with professional messages"
                        }
                        Button {
                            text: root.commitBusy ? "Committing..." : "Commit Selected"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0 && !root.commitBusy
                            onClicked: {
                                var files = root.repo.diffModel.selectedFilePaths()
                                if (files.length === 0) { commitStatus.text = "No files selected."; return }
                                var msg = manualMsgField.text.trim()
                                if (msg === "") { commitStatus.text = "Enter a commit message."; return }
                                root.commitBusy = true; commitStatus.text = ""; commitTimer.start()
                            }
                            ToolTip.visible: hovered
                            ToolTip.text: "Commit selected files locally"
                        }
                        Timer {
                            id: commitTimer; interval: 50; repeat: false
                            onTriggered: {
                                var files = root.repo.diffModel.selectedFilePaths()
                                var msg = manualMsgField.text.trim()
                                var ok = root.repo.stageAndCommit(files, msg)
                                commitStatus.text = ok ? "Committed!" : "Commit failed."
                                root.commitBusy = false
                                if (ok) { manualMsgField.text = ""; refreshAll() }
                            }
                        }
                        Button {
                            text: "Commit & Push"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0 && !root.commitBusy && !root.pushBusy
                            onClicked: {
                                var files = root.repo.diffModel.selectedFilePaths()
                                if (files.length === 0) { commitStatus.text = "No files selected."; return }
                                var msg = manualMsgField.text.trim()
                                if (msg === "") { commitStatus.text = "Enter a commit message."; return }
                                root.commitBusy = true; commitStatus.text = ""; commitPushTimer.start()
                            }
                            ToolTip.visible: hovered
                            ToolTip.text: "Commit and immediately push to remote"
                        }
                        Timer {
                            id: commitPushTimer; interval: 50; repeat: false
                            onTriggered: {
                                var files = root.repo.diffModel.selectedFilePaths()
                                var msg = manualMsgField.text.trim()
                                var ok = root.repo.stageAndCommit(files, msg)
                                if (!ok) { commitStatus.text = "Commit failed."; root.commitBusy = false; return }
                                var pushed = root.repo.pushCurrentBranch(root.githubToken, remotePicker.currentText)
                                if (pushed) {
                                    commitStatus.text = "Committed & pushed!"
                                } else {
                                    commitStatus.text = "Committed locally, but push failed. See top right for details."
                                }
                                root.commitBusy = false
                                if (ok) { manualMsgField.text = ""; refreshAll() }
                            }
                        }
                        Button {
                            text: "Stash All"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0
                            onClicked: {
                                var ok = root.repo.stashChanges("Quick stash")
                                commitStatus.text = ok ? "Changes stashed." : "Stash failed."
                                if (ok) refreshAll()
                            }
                            ToolTip.visible: hovered
                            ToolTip.text: "Stash all working-directory changes"
                        }
                    }
                }
            }

            // ═══════ TAB 1: History ═══════════════════════════════════════
            Item {
                ColumnLayout {
                    anchors.fill: parent; anchors.margins: 16; spacing: 12

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Commit History"
                            font.bold: true; font.pixelSize: 15; color: Theme.textPrimary
                            Layout.fillWidth: true
                        }
                        RowLayout {
                            spacing: 12
                            RowLayout {
                                spacing: 4
                                Rectangle { Layout.preferredWidth: 10; Layout.preferredHeight: 10; radius: 2; color: Theme.danger; Layout.alignment: Qt.AlignVCenter }
                                Text { text: "Unpushed"; font.pixelSize: 11; color: Theme.textSecondary; Layout.alignment: Qt.AlignVCenter }
                            }
                            RowLayout {
                                spacing: 4
                                Rectangle { Layout.preferredWidth: 10; Layout.preferredHeight: 10; radius: 2; color: Theme.success; Layout.alignment: Qt.AlignVCenter }
                                Text { text: "Pushed"; font.pixelSize: 11; color: Theme.textSecondary; Layout.alignment: Qt.AlignVCenter }
                            }
                        }
                        Button { 
                            id: historyRefreshBtn
                            text: "Refresh"
                            onClicked: {
                                text = "Refreshing..."
                                historyRefreshTimer.start()
                            }
                            Timer {
                                id: historyRefreshTimer
                                interval: 50
                                onTriggered: {
                                    refreshAll()
                                    historyRefreshBtn.text = "Refresh"
                                }
                            }
                        }
                    }

                    ListView {
                        id: historyList
                        Layout.fillWidth: true; Layout.fillHeight: true
                        clip: true
                        model: root.repo.isOpen ? root.repo.commitHistory(50) : []
                        boundsBehavior: Flickable.StopAtBounds
                        spacing: 8

                        delegate: Rectangle {
                            id: historyRow
                            width: ListView.view.width - 4; x: 2
                            height: 60
                            radius: 6
                            border.color: Theme.border
                            border.width: 1

                            property bool isUnpushed: root.unpushedShas.indexOf(modelData.fullSha) >= 0

                            color: isUnpushed
                                ? (Theme.dark ? "#2d1618" : "#ffebe9")
                                : Theme.surface2

                            Rectangle { 
                                width: 4; height: parent.height - 2; y: 1; x: 1
                                color: parent.isUnpushed ? Theme.danger : "transparent"
                                radius: 4
                            }

                            MouseArea {
                                anchors.fill: parent
                                acceptedButtons: Qt.LeftButton | Qt.RightButton
                                hoverEnabled: true
                                onEntered: parent.color = parent.isUnpushed ? (Theme.dark ? "#3a1c1f" : "#ffd4d8") : Theme.rowHover
                                onExited: parent.color = parent.isUnpushed ? (Theme.dark ? "#2d1618" : "#ffebe9") : Theme.surface2
                                
                                onClicked: function(mouse) {
                                    if (mouse.button === Qt.LeftButton) {
                                        commitDetailsDialog.showCommit(modelData.sha, modelData.message)
                                    } else if (mouse.button === Qt.RightButton) {
                                        commitContextMenu.sha = modelData.fullSha
                                        commitContextMenu.message = modelData.message
                                        commitContextMenu.isUnpushed = parent.isUnpushed
                                        commitContextMenu.popup()
                                    }
                                }
                            }

                                RowLayout {
                                    anchors { fill: parent; leftMargin: 14; rightMargin: 12; topMargin: 6; bottomMargin: 6 }
                                    spacing: 10
                                    // Pass through clicks to the MouseArea behind it
                                    enabled: false

                                    Rectangle {
                                        width: 58; height: 22; radius: 4; color: Theme.shaBg
                                        Text { anchors.centerIn: parent; text: modelData.sha; color: Theme.shaText; font.family: "Courier New"; font.pixelSize: 11 }
                                    }

                                    Rectangle {
                                        width: statusLabel.implicitWidth + 12; height: 18; radius: 3
                                        color: historyRow.isUnpushed ? Theme.danger : Theme.success
                                        Text { id: statusLabel; anchors.centerIn: parent; text: historyRow.isUnpushed ? "local" : "pushed"; color: "white"; font.pixelSize: 9; font.bold: true }
                                    }

                                    ColumnLayout {
                                        Layout.fillWidth: true
                                        Text { text: modelData.message; color: Theme.textPrimary; elide: Text.ElideRight; font.pixelSize: 13; Layout.fillWidth: true }
                                        Text { 
                                            text: {
                                                var tIds = root.linkedTaskIds(modelData.fullSha)
                                                if (!tIds || tIds.length === 0) return ""
                                                var titles = []
                                                for (var k = 0; k < tIds.length; k++) {
                                                    var found = false
                                                    for (var i = 0; i < window.availableTasks.length; i++) {
                                                        if (window.availableTasks[i].id === tIds[k]) {
                                                            titles.push(window.availableTasks[i].title)
                                                            found = true; break;
                                                        }
                                                    }
                                                    if (!found) titles.push(tIds[k].substring(0,8))
                                                }
                                                return "Tasks: " + titles.join(", ")
                                            }
                                            color: Theme.accent; font.pixelSize: 11; visible: text !== ""
                                        }
                                    }

                                    Column {
                                        spacing: 4
                                        Layout.minimumWidth: 140
                                        Layout.alignment: Qt.AlignRight | Qt.AlignVCenter
                                        Text { text: modelData.author; font.pixelSize: 12; color: Theme.textSecondary; horizontalAlignment: Text.AlignRight; width: 140; elide: Text.ElideRight }
                                        Text { text: modelData.date; font.pixelSize: 11; color: Theme.textMuted; horizontalAlignment: Text.AlignRight; width: 140 }
                                    }
                                }
                            }

                            Text { anchors.centerIn: parent; visible: historyList.count === 0; text: root.repo.isOpen ? "No commits yet." : "Open a repository to see history."; color: Theme.textMuted }
                        }
                }
            }

            // ═══════ TAB 2: Stash ═════════════════════════════════════════
            Item {
                ColumnLayout {
                    anchors.fill: parent; anchors.margins: 12; spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        Text {
                            text: "Stash List"
                            font.bold: true; font.pixelSize: 15; color: Theme.textPrimary
                            Layout.fillWidth: true
                        }
                        Button {
                            text: "Pop Latest"
                            enabled: root.repo.isOpen && stashListView.count > 0
                            onClicked: {
                                var ok = root.repo.stashPop()
                                if (ok) {
                                    stashStatus.text = "Stash popped successfully."
                                    stashStatus.color = Theme.textMuted
                                    refreshAll()
                                } else {
                                    stashStatus.text = "Failed to pop stash (likely due to merge conflicts)."
                                    stashStatus.color = Theme.danger
                                }
                            }
                            ToolTip.visible: hovered
                            ToolTip.text: "Apply and remove the most recent stash"
                        }
                        Button { text: "Refresh"; onClicked: { stashListView.model = root.repo.stashList() } }
                    }

                    // Stash with message
                    RowLayout {
                        Layout.fillWidth: true; spacing: 8
                        TextField {
                            id: stashMsgField; Layout.fillWidth: true
                            placeholderText: "Stash message (optional)"
                            font.pixelSize: 12
                        }
                        Button {
                            text: "Stash Changes"
                            enabled: root.repo.isOpen && root.repo.diffModel.count > 0
                            onClicked: {
                                var msg = stashMsgField.text.trim()
                                var ok = root.repo.stashChanges(msg)
                                if (ok) {
                                    stashMsgField.text = ""
                                    stashStatus.text = "Changes stashed."
                                    stashStatus.color = Theme.textMuted
                                    refreshAll()
                                } else {
                                    stashStatus.text = "Failed to stash changes."
                                    stashStatus.color = Theme.danger
                                }
                            }
                        }
                    }

                    Text {
                        id: stashStatus
                        Layout.fillWidth: true
                        text: ""
                        color: Theme.textMuted
                        font.pixelSize: 12
                        visible: text !== ""
                    }

                    Rectangle {
                        Layout.fillWidth: true; Layout.fillHeight: true
                        color: Theme.surface; radius: 6
                        border.color: Theme.border; border.width: 1; clip: true

                        ListView {
                            id: stashListView; anchors.fill: parent; clip: true
                            model: root.repo.isOpen ? root.repo.stashList() : []

                            delegate: Rectangle {
                                width: ListView.view.width; height: 44
                                color: index % 2 === 0 ? Theme.rowBase : Theme.rowAlt
                                Rectangle { height: 1; width: parent.width; anchors.bottom: parent.bottom; color: Theme.divider }

                                RowLayout {
                                    anchors { fill: parent; leftMargin: 12; rightMargin: 12 }
                                    spacing: 10

                                    Rectangle {
                                        width: stashIdxText.implicitWidth + 14; height: 22; radius: 4; color: Theme.accent
                                        Text { id: stashIdxText; anchors.centerIn: parent; text: modelData.index; color: "white"; font.family: "Courier New"; font.pixelSize: 11 }
                                    }

                                    Text { text: modelData.message; color: Theme.textPrimary; Layout.fillWidth: true; elide: Text.ElideRight; font.pixelSize: 13 }
                                }
                            }

                            Text { anchors.centerIn: parent; visible: stashListView.count === 0; text: "No stashes."; color: Theme.textMuted }
                        }
                    }
                }
            }

            // ═══════ TAB 3: Tools ═════════════════════════════════════════
            Item {
                ColumnLayout {
                    anchors.fill: parent; anchors.margins: 20; spacing: 16

                    Text {
                        text: "Repository Tools"
                        font.bold: true; font.pixelSize: 18; color: Theme.textPrimary
                    }

                    // .gitignore generator
                    Rectangle {
                        Layout.fillWidth: true; height: gitignoreCol.implicitHeight + 32
                        color: Theme.surface; radius: 8
                        border.color: Theme.border; border.width: 1

                        ColumnLayout {
                            id: gitignoreCol
                            anchors { fill: parent; margins: 16 }
                            spacing: 8

                            Text {
                                text: "AI .gitignore Generator"
                                font.bold: true; font.pixelSize: 14; color: Theme.textPrimary
                            }
                            Text {
                                text: "Scans your repository files and uses Gemini AI to generate a comprehensive .gitignore tailored to your project's languages and frameworks."
                                wrapMode: Text.WordWrap; Layout.fillWidth: true
                                color: Theme.textSecondary; font.pixelSize: 12
                            }
                            Button {
                                text: root.gitignoreBusy ? "Generating..." : "Generate .gitignore"
                                enabled: root.repo.isOpen && !root.gitignoreBusy
                                onClicked: {
                                    root.gitignoreBusy = true
                                    var files = root.repo.listAllFiles()
                                    root.api.generateGitignore(files)
                                }
                            }
                        }
                    }

                    // Repo info
                    Rectangle {
                        Layout.fillWidth: true
                        implicitHeight: infoCol.implicitHeight + 32
                        color: Theme.surface; radius: 8
                        border.color: Theme.border; border.width: 1

                        ColumnLayout {
                            id: infoCol
                            anchors { left: parent.left; right: parent.right; top: parent.top; margins: 16 }
                            spacing: 8

                            Text {
                                text: "Repository Info"
                                font.bold: true; font.pixelSize: 14; color: Theme.textPrimary
                            }
                            Text {
                                id: repoInfoText
                                text: "No repository open."
                                wrapMode: Text.WordWrap; Layout.fillWidth: true
                                color: Theme.textSecondary; font.pixelSize: 12
                                lineHeight: 1.4

                                function updateInfo() {
                                    if (!root.repo.isOpen) {
                                        text = "No repository open."
                                    } else {
                                        var rems = root.repo.remotes
                                        text = "Path: " + root.repo.repoPath
                                             + "\nBranch: " + root.repo.currentBranchName
                                             + "\nRemotes: " + (rems && rems.length > 0 ? rems.join(", ") : "none")
                                             + "\nChanged files: " + root.repo.diffModel.count
                                             + "\nUnpushed commits: " + root.unpushedShas.length
                                    }
                                }

                                Connections {
                                    target: root
                                    function onUnpushedShasChanged() { repoInfoText.updateInfo() }
                                }
                                Connections {
                                    target: root.repo
                                    function onRepoChanged() { repoInfoText.updateInfo() }
                                    function onDiffChanged() { repoInfoText.updateInfo() }
                                }
                                Component.onCompleted: updateInfo()
                            }
                        }
                    }

                    Item { Layout.fillHeight: true }
                }
            }

            // ═══════ TAB 4: Settings ═══════════════════════════════════════
            Item {
                ScrollView {
                    anchors.fill: parent
                    contentWidth: parent.width
                    clip: true
                    
                    ColumnLayout {
                        width: parent.width
                        anchors.margins: 16
                        spacing: 16

                        Rectangle {
                            Layout.fillWidth: true; Layout.margins: 16
                            implicitHeight: aiSettingsCol.implicitHeight + 32
                            color: Theme.surface; radius: 8
                            border.color: Theme.border; border.width: 1

                            ColumnLayout {
                                id: aiSettingsCol
                                anchors { left: parent.left; right: parent.right; top: parent.top; margins: 16 }
                                spacing: 12

                                Text {
                                    text: "AI Preferences"
                                    font.bold: true; font.pixelSize: 16; color: Theme.textPrimary
                                }
                                Text {
                                    text: "Select your preferred AI provider for generating commit messages and .gitignore files."
                                    wrapMode: Text.WordWrap; Layout.fillWidth: true
                                    color: Theme.textSecondary; font.pixelSize: 13
                                }

                                RowLayout {
                                    spacing: 8
                                    Text { text: "Provider:"; color: Theme.textPrimary; font.bold: true }
                                    ComboBox {
                                        id: providerCombo
                                        Layout.fillWidth: true
                                        model: ["Ollama (Local)", "Google Gemini", "OpenRouter"]
                                        currentIndex: {
                                            if (root.api.aiProvider === "gemini") return 1
                                            if (root.api.aiProvider === "openrouter") return 2
                                            return 0
                                        }
                                        onActivated: {
                                            if (currentIndex === 0) root.api.aiProvider = "ollama"
                                            else if (currentIndex === 1) root.api.aiProvider = "gemini"
                                            else if (currentIndex === 2) root.api.aiProvider = "openrouter"
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    visible: root.api.aiProvider === "gemini"
                                    Text { text: "Gemini API Key:"; color: Theme.textPrimary; font.bold: true }
                                    TextField {
                                        Layout.fillWidth: true
                                        echoMode: TextInput.Password
                                        text: root.api.geminiApiKey
                                        placeholderText: "AIzaSy..."
                                        onEditingFinished: root.api.geminiApiKey = text
                                    }
                                    Text {
                                        text: "Stored unencrypted in this app's local settings."
                                        color: Theme.textSecondary; font.pixelSize: 11
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    visible: root.api.aiProvider === "openrouter"
                                    Text { text: "OpenRouter API Key:"; color: Theme.textPrimary; font.bold: true }
                                    TextField {
                                        Layout.fillWidth: true
                                        echoMode: TextInput.Password
                                        text: root.api.openRouterApiKey
                                        placeholderText: "sk-or-v1-..."
                                        onEditingFinished: root.api.openRouterApiKey = text
                                    }
                                    Text {
                                        text: "Stored unencrypted in this app's local settings."
                                        color: Theme.textSecondary; font.pixelSize: 11
                                    }
                                }
                                
                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    visible: root.api.aiProvider === "ollama"
                                    Text {
                                        text: "Ollama automatically runs locally on your PC. Ensure it is running and the 'qwen2.5-coder:1.5b' model is installed."
                                        color: Theme.textSecondary; font.pixelSize: 12
                                        wrapMode: Text.WordWrap; Layout.fillWidth: true
                                    }
                                }
                            }
                        }

                        Rectangle {
                            Layout.fillWidth: true; Layout.margins: 16
                            implicitHeight: loopinSettingsCol.implicitHeight + 32
                            color: Theme.surface; radius: 8
                            border.color: Theme.border; border.width: 1

                            ColumnLayout {
                                id: loopinSettingsCol
                                anchors { left: parent.left; right: parent.right; top: parent.top; margins: 16 }
                                spacing: 12

                                Text {
                                    text: "Loopin Platform Configuration"
                                    font.bold: true; font.pixelSize: 16; color: Theme.textPrimary
                                }
                                Text {
                                    text: "Link your local commits to tasks on the Loopin collaborative platform."
                                    wrapMode: Text.WordWrap; Layout.fillWidth: true
                                    color: Theme.textSecondary; font.pixelSize: 13
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Text { text: "Backend URL:"; color: Theme.textPrimary; font.bold: true }
                                    TextField {
                                        Layout.fillWidth: true
                                        text: root.api.backendUrl
                                        placeholderText: "http://localhost:3000"
                                        onEditingFinished: {
                                            root.api.backendUrl = text
                                            if (root.api.projectId !== "") {
                                                root.api.fetchTasks()
                                                root.api.fetchProjectCommits()
                                            }
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Text { text: "Project ID:"; color: Theme.textPrimary; font.bold: true }
                                    TextField {
                                        Layout.fillWidth: true
                                        text: root.api.projectId
                                        placeholderText: "Enter your project UUID"
                                        onEditingFinished: {
                                            root.api.projectId = text.trim()
                                            // Refresh tasks and their commit links for the new project
                                            root.api.fetchTasks()
                                            root.api.fetchProjectCommits()
                                        }
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 4
                                    Text { text: "User ID:"; color: Theme.textPrimary; font.bold: true }
                                    TextField {
                                        Layout.fillWidth: true
                                        text: root.api.userId
                                        placeholderText: "Enter your user UUID"
                                        onEditingFinished: root.api.userId = text.trim()
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    // ── Discard confirmation dialog ───────────────────────────────────
    Dialog {
        id: discardConfirm
        title: "Discard Changes?"
        standardButtons: Dialog.Yes | Dialog.No
        modal: true
        anchors.centerIn: parent

        Text {
            text: "Are you sure you want to discard your changes to these files?\n\nDid you mean to stash them instead? Discarding will permanently delete your uncommitted work and cannot be undone."
            color: Theme.textPrimary
            wrapMode: Text.WordWrap
        }

        onAccepted: {
            var files = root.repo.diffModel.selectedFilePaths()
            for (var i = 0; i < files.length; i++) {
                root.repo.discardFileChanges(files[i])
            }
            refreshAll()
        }
    }

    Dialog {
        id: singleDiscardConfirm
        property string targetFile: ""
        title: "Discard Changes?"
        standardButtons: Dialog.Yes | Dialog.No
        modal: true
        anchors.centerIn: parent

        Text {
            text: "Are you sure you want to discard your changes to '" + singleDiscardConfirm.targetFile + "'?\n\nDid you mean to stash them instead? Discarding will permanently delete your uncommitted work and cannot be undone."
            color: Theme.textPrimary
            wrapMode: Text.WordWrap
        }

        onAccepted: {
            if (targetFile !== "") {
                root.repo.discardFileChanges(targetFile)
                refreshAll()
            }
        }
    }

    // ── Gitignore preview dialog ─────────────────────────────────────
    Dialog {
        id: gitignoreDialog
        title: "Generated .gitignore"
        standardButtons: Dialog.Save | Dialog.Cancel
        modal: true
        width: 600; height: 500
        anchors.centerIn: parent

        ScrollView {
            anchors.fill: parent
            TextArea {
                id: gitignorePreview
                font.family: "Courier New"
                font.pixelSize: 12
                color: Theme.textPrimary
                readOnly: false
            }
        }

        onAccepted: {
            var content = gitignorePreview.text
            var ok = root.repo.writeFile(".gitignore", content)
            if (ok) {
                root.repo.refreshDiff()
            } else {
                console.log("Failed to save .gitignore")
            }
        }
    }

    // ── Commit Context Menu ───────────────────────────────────────────
    Menu {
        id: commitContextMenu
        property string sha: ""      // full SHA
        property string message: ""
        property bool isUnpushed: false

        Instantiator {
            active: commitContextMenu.isUnpushed
            MenuItem {
                text: "Push up to Here"
                onClicked: {
                    var ok = root.repo.pushCommit(commitContextMenu.sha, remotePicker.currentText)
                    if (ok) showStatus("Pushed up to " + commitContextMenu.sha.substring(0, 7), false)
                    refreshAll()
                }
            }
            onObjectAdded: function(index, object) { commitContextMenu.insertItem(0, object) }
            onObjectRemoved: function(index, object) { commitContextMenu.removeItem(object) }
        }

        MenuItem {
            text: "Revert Commit..."
            onClicked: {
                var ok = root.repo.revertCommit(commitContextMenu.sha)
                if (ok) showStatus("Reverted " + commitContextMenu.sha.substring(0, 7) + " (changes left uncommitted)", false)
            }
        }
        MenuItem {
            text: "Link to Task..."
            onClicked: {
                editTaskDialog.targetSha = commitContextMenu.sha
                editTaskDialog.targetMessage = commitContextMenu.message
                editTaskDialog.open()
            }
        }
        MenuItem {
            text: "Reset to Here (Soft)"
            onClicked: {
                var ok = root.repo.resetToCommit(commitContextMenu.sha, false)
                if (ok) showStatus("Soft reset to " + commitContextMenu.sha.substring(0, 7), false)
            }
        }
        MenuItem {
            text: "Reset to Here (Hard)"
            onClicked: hardResetConfirm.open()
        }
    }

    Dialog {
        id: hardResetConfirm
        title: "Hard Reset?"
        standardButtons: Dialog.Yes | Dialog.No
        modal: true
        anchors.centerIn: parent
        Text {
            text: "Are you sure you want to hard reset to " + commitContextMenu.sha.substring(0, 7) + "?\nAll uncommitted changes in your working directory WILL BE DESTROYED."
            color: Theme.warning
            font.bold: true
            font.pixelSize: 13
        }
        onAccepted: {
            var ok = root.repo.resetToCommit(commitContextMenu.sha, true)
            if (ok) showStatus("Hard reset to " + commitContextMenu.sha.substring(0, 7), false)
        }
    }

    // ── Commit Details Dialog ──────────────────────────────────────────
    Dialog {
        id: commitDetailsDialog
        title: "Commit Details"
        standardButtons: Dialog.Close
        modal: true
        width: 700; height: 500
        anchors.centerIn: parent

        background: Rectangle {
            color: Theme.bg
            border.color: Theme.border
            radius: 8
        }

        property string currentSha: ""
        property string commitMsg: ""

        function formatDiff(patch) {
            if (!patch) return "No diff available."
            var lines = patch.split('\n')
            var html = "<pre style='font-family: Consolas, \"Courier New\", monospace; font-size: 12px;'>"
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i]
                // Escape HTML
                var escaped = line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                if (line.startsWith("+")) {
                    html += "<span style='color: " + Theme.success + ";'>" + escaped + "</span>\n"
                } else if (line.startsWith("-")) {
                    html += "<span style='color: " + Theme.danger + ";'>" + escaped + "</span>\n"
                } else if (line.startsWith("@@")) {
                    html += "<span style='color: " + Theme.accent + ";'>" + escaped + "</span>\n"
                } else {
                    html += "<span style='color: " + Theme.textPrimary + ";'>" + escaped + "</span>\n"
                }
            }
            html += "</pre>"
            return html
        }

        function showCommit(sha, msg) {
            currentSha = sha
            commitMsg = msg
            var patch = root.repo.getCommitDiff(sha)
            commitDiffText.text = formatDiff(patch)
            open()
        }

        ColumnLayout {
            anchors.fill: parent
            spacing: 12

            Text {
                text: "Commit: " + commitDetailsDialog.currentSha
                font.family: "Consolas, Courier New"
                font.pixelSize: 14; font.bold: true
                color: Theme.textPrimary
            }
            Text {
                text: commitDetailsDialog.commitMsg
                font.pixelSize: 14; color: Theme.textSecondary
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
            
            Rectangle {
                Layout.fillWidth: true; Layout.fillHeight: true
                color: Theme.surface2; radius: 6
                border.color: Theme.border; border.width: 1

                ScrollView {
                    anchors.fill: parent
                    anchors.margins: 8
                    clip: true
                    ScrollBar.horizontal.policy: ScrollBar.AlwaysOn
                    ScrollBar.vertical.policy: ScrollBar.AlwaysOn
                    
                    Text {
                        id: commitDiffText
                        textFormat: Text.RichText
                        color: Theme.textPrimary
                    }
                }
            }
        }
    }

    // ── Link Commit to Task dialog ─────────────────────────────────────
    Dialog {
        id: editTaskDialog
        title: "Link Commit to Task"
        standardButtons: Dialog.Save | Dialog.Cancel
        modal: true
        anchors.centerIn: parent
        width: 420
        height: 420

        background: Rectangle {
            color: Theme.bg
            border.color: Theme.border
            radius: 8
        }

        property string targetSha: ""       // full SHA
        property string targetMessage: ""
        property var filteredTasks: []
        // taskId -> true. Kept separately from the delegates: the ListView only
        // creates rows that are on screen, and search hides the rest, so reading
        // checkboxes back from the view silently dropped tasks.
        property var selected: ({})
        readonly property int selectedCount: Object.keys(selected).length

        function updateModel() {
            var term = historyTaskSearch.text.toLowerCase()
            var all = window.availableTasks || []
            var res = []
            for (var i = 0; i < all.length; i++) {
                if (term === "" || (all[i].title || "").toLowerCase().indexOf(term) >= 0) res.push(all[i])
            }
            filteredTasks = res
        }

        function toggle(taskId, on) {
            var copy = {}
            for (var k in selected) copy[k] = true
            if (on) copy[taskId] = true
            else delete copy[taskId]
            selected = copy
        }

        onAboutToShow: {
            var initial = {}
            var ids = root.linkedTaskIds(targetSha)
            for (var i = 0; i < ids.length; i++) initial[ids[i]] = true
            selected = initial
            historyTaskSearch.text = ""
            updateModel()
        }

        Connections {
            target: window
            function onAvailableTasksChanged() { editTaskDialog.updateModel() }
        }

        ColumnLayout {
            spacing: 8
            anchors.fill: parent
            Text {
                text: "Commit " + editTaskDialog.targetSha.substring(0, 7) + ": " + editTaskDialog.targetMessage
                color: Theme.textSecondary
                elide: Text.ElideRight
                Layout.fillWidth: true
            }
            TextField {
                id: historyTaskSearch
                Layout.fillWidth: true
                placeholderText: "Type to search tasks..."
                color: Theme.textPrimary
                background: Rectangle {
                    color: Theme.dark ? Theme.surface : "#eef1f5"
                    border.color: Theme.dark ? Theme.border : "#c0c7ce"
                    border.width: 1
                    radius: 4
                    implicitHeight: 30
                }
                onTextChanged: editTaskDialog.updateModel()
            }
            Rectangle {
                Layout.fillWidth: true
                Layout.fillHeight: true
                color: Theme.surface2; border.color: Theme.border; border.width: 1; radius: 4
                clip: true

                ListView {
                    id: historyTaskPicker
                    anchors.fill: parent; anchors.margins: 4
                    model: editTaskDialog.filteredTasks
                    boundsBehavior: Flickable.StopAtBounds
                    clip: true
                    delegate: CheckBox {
                        id: taskCheck
                        width: ListView.view.width
                        text: modelData.title
                        checked: editTaskDialog.selected[modelData.id] === true
                        onToggled: editTaskDialog.toggle(modelData.id, checked)
                        contentItem: Text {
                            text: taskCheck.text
                            font.pixelSize: 13
                            color: Theme.textPrimary
                            verticalAlignment: Text.AlignVCenter
                            elide: Text.ElideRight
                            leftPadding: taskCheck.indicator.width + taskCheck.spacing
                        }
                    }
                }

                Text {
                    anchors.centerIn: parent
                    width: parent.width - 24
                    horizontalAlignment: Text.AlignHCenter
                    wrapMode: Text.WordWrap
                    visible: historyTaskPicker.count === 0
                    color: Theme.textMuted
                    text: root.api.projectId === "" || root.api.userId === ""
                        ? "Set your Project ID and User ID in the Settings tab to link tasks."
                        : ((window.availableTasks || []).length === 0
                            ? "No tasks loaded for this project. Check the Backend URL and Project ID in Settings, then press Reload."
                            : "No tasks match your search.")
                }
            }
            RowLayout {
                Layout.fillWidth: true
                Text {
                    text: editTaskDialog.selectedCount + " selected"
                    color: Theme.textSecondary
                    Layout.fillWidth: true
                }
                Button {
                    text: "Reload tasks"
                    flat: true
                    onClicked: root.api.fetchTasks()
                }
            }
        }

        onAccepted: {
            var selectedIds = Object.keys(selected)

            // Optimistic update so the UI reacts instantly; a backend error refetches
            var newMap = {}
            var currentMap = window.linkedCommits || {}
            for (var key in currentMap) newMap[key] = currentMap[key]
            delete newMap[targetSha.substring(0, 7)]
            newMap[targetSha] = selectedIds
            window.linkedCommits = newMap

            root.api.reportCommit(targetSha, targetMessage, selectedIds)
        }
    }

    // ── Delete branch confirmation ─────────────────────────────────────
    Dialog {
        id: deleteBranchConfirm
        property string branchName: ""
        title: "Delete Branch?"
        standardButtons: Dialog.Yes | Dialog.No
        modal: true
        anchors.centerIn: parent
        width: 420

        onAboutToShow: forceDeleteBox.checked = false

        ColumnLayout {
            anchors.fill: parent
            spacing: 10
            Text {
                text: "Delete local branch '" + deleteBranchConfirm.branchName + "'?"
                color: Theme.textPrimary
                wrapMode: Text.WordWrap
                Layout.fillWidth: true
            }
            CheckBox {
                id: forceDeleteBox
                text: "Force delete, even if it has commits that aren't merged anywhere (they will be lost)"
                Layout.fillWidth: true
            }
        }

        onAccepted: {
            var ok = root.repo.deleteBranch(branchName, forceDeleteBox.checked)
            if (ok) {
                showStatus("Deleted branch " + branchName, false)
                refreshAll()
            }
        }
    }

    // ── Full status / error message ────────────────────────────────────
    Dialog {
        id: statusDetailsDialog
        title: root.opsIsError ? "Error details" : "Status"
        standardButtons: Dialog.Close
        modal: true
        anchors.centerIn: parent
        width: Math.min(640, root.width - 40)
        height: Math.min(400, root.height - 40)

        ScrollView {
            anchors.fill: parent
            TextArea {
                text: root.opsStatus
                readOnly: true
                wrapMode: TextEdit.Wrap
                selectByMouse: true
                font.family: "monospace"
                color: Theme.textPrimary
            }
        }
    }

    // ── Background connections ─────────────────────────────────────────
    Connections {
        target: root.watcher
        function onTick() { if (root.repo.isOpen) root.repo.refreshDiff() }
    }

    FolderDialog {
        id: folderDialog; title: "Choose a git repository folder"
        onAccepted: {
            var path = selectedFolder.toString()
            if (path.startsWith("file:///"))
                path = path.substring(Qt.platform.os === "windows" ? 8 : 7)
            else if (path.startsWith("file://"))
                path = path.substring(7)
            pathField.text = decodeURIComponent(path)
            if (root.repo.openRepository(pathField.text)) {
                root.repo.refreshDiff()
                root.watcher.start(2000)
                refreshAll()
            }
        }
    }
}
