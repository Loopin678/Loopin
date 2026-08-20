#pragma once

#include <QObject>
#include <QString>
#include <QStringList>
#include <QVariantList>
#include <QVariantMap>
#include <QQmlEngine>

#include <git2.h>

#include "DiffModel.h"

// Wraps a single local git repository via libgit2 and exposes it to QML:
// opening a repo, computing the working-directory diff, and staging +
// committing + pushing a chosen set of files.
class GitRepo : public QObject {
    Q_OBJECT
    QML_ELEMENT

    Q_PROPERTY(bool isOpen READ isOpen NOTIFY repoChanged)
    Q_PROPERTY(QString repoPath READ repoPath NOTIFY repoChanged)
    Q_PROPERTY(QString currentBranchName READ currentBranchName NOTIFY repoChanged)
    Q_PROPERTY(QStringList branches READ branches NOTIFY repoChanged)
    Q_PROPERTY(QStringList remotes READ remotes NOTIFY remotesChanged)
    Q_PROPERTY(DiffModel* diffModel READ diffModel CONSTANT)

public:
    explicit GitRepo(QObject* parent = nullptr);
    ~GitRepo() override;

    bool isOpen() const { return m_repo != nullptr; }
    QString repoPath() const { return m_repoPath; }
    QString currentBranchName() const;
    QStringList branches() const;
    DiffModel* diffModel() const { return m_diffModel; }
    QStringList remotes() const;

    // Opens (does not clone) an existing local repository at `path`.
    Q_INVOKABLE bool openRepository(const QString& path);

    // Recomputes the working-directory-vs-HEAD diff and refreshes diffModel().
    Q_INVOKABLE void refreshDiff();

    // Stages the listed files and creates a commit with the given message.
    // Returns the commit SHA on success, or an empty string on failure.
    Q_INVOKABLE QString stageAndCommit(const QStringList& files, const QString& message);

    // Pushes the current branch to `remoteName` using `token` as an OAuth
    // credential. Falls back to system git on failure (handles SSH remotes).
    Q_INVOKABLE bool pushCurrentBranch(const QString& token, const QString& remoteName = "origin");

    // Pushes specifically up to the given commit SHA.
    Q_INVOKABLE bool pushCommit(const QString& sha, const QString& remoteName = "origin");

    // Fetches from `remoteName` using system git (handles SSH + HTTPS).
    Q_INVOKABLE bool fetchRemote(const QString& remoteName = "origin");

    // Pulls (fetch + merge) from `remoteName` using system git.
    Q_INVOKABLE bool pullRemote(const QString& remoteName = "origin");

    // Checks out the specified branch.
    Q_INVOKABLE bool checkoutBranch(const QString& branchName);

    // Creates a new branch from HEAD and optionally checks it out.
    Q_INVOKABLE bool createBranch(const QString& branchName, bool checkout = true);

    // Deletes the specified branch.
    Q_INVOKABLE bool deleteBranch(const QString& branchName);

    // Aborts an in-progress merge.
    Q_INVOKABLE bool abortMerge();

    // Resolves a conflicted file with new content.
    Q_INVOKABLE bool resolveConflictFile(const QString& filePath, const QString& content);

    // Commits a merge after all conflicts are resolved.
    Q_INVOKABLE bool commitResolvedMerge();

    // Returns unpushed commit SHAs that are ahead of remote (not yet pushed).
    Q_INVOKABLE QStringList unpushedCommitShas(const QString& remoteName = "origin") const;

    // Writes content to a file relative to the repo root. Returns true on success.
    Q_INVOKABLE bool writeFile(const QString& filePath, const QString& content);

    // Reads content from a file relative to the repo root.
    Q_INVOKABLE QString readFile(const QString& filePath);

    // Returns the last `limit` commits as a list of maps with keys:
    // sha (short), message, author, date
    Q_INVOKABLE QVariantList commitHistory(int limit = 50) const;

    // Returns patch text for a specific commit
    Q_INVOKABLE QString getCommitDiff(const QString& sha);

    // Reverts a commit (without auto-committing)
    Q_INVOKABLE bool revertCommit(const QString& sha);

    // Resets HEAD to a commit (soft or hard)
    Q_INVOKABLE bool resetToCommit(const QString& sha, bool hard);

    // Merges a branch into the current branch
    Q_INVOKABLE bool mergeBranch(const QString& branchName);

    // Discards working-directory changes for a single file (git checkout -- file)
    Q_INVOKABLE bool discardFileChanges(const QString& filePath);

    // Stashes changes for a specific file
    Q_INVOKABLE bool stashFile(const QString& filePath);

    // Stashes all working-directory changes
    Q_INVOKABLE bool stashChanges(const QString& message = "");

    // Pops the top stash entry
    Q_INVOKABLE bool stashPop();

    // Returns list of stash entries as [{"index": "stash@{0}", "message": "..."}]
    Q_INVOKABLE QVariantList stashList() const;

    // Lists ALL files in the repository (tracked + untracked) for gitignore generation
    Q_INVOKABLE QStringList listAllFiles() const;

signals:
    void repoChanged();
    void remotesChanged();
    void diffChanged();
    void errorOccurred(const QString& errorMessage);
    void checkoutFinished(bool ok, const QString& errorMessage);
    void fetchFinished(bool ok, const QString& errorMessage);
    void pullFinished(bool ok, const QString& errorMessage);
    void pushFinished(bool ok, const QString& errorMessage);
    
    // Emitted when a merge fails due to conflicts. The list contains the paths of conflicted files.
    void mergeConflictDetected(const QStringList& conflictedFiles);

private:
    git_repository* m_repo = nullptr;
    QString m_repoPath;
    QString m_lastHeadSha;
    DiffModel* m_diffModel;

    // Returns the tree HEAD points at, or nullptr for an unborn branch
    // (brand new repo with no commits yet) -- libgit2 treats a null tree
    // as "compare against empty tree", so callers can pass this straight
    // into git_diff_tree_to_workdir_with_index.
    git_tree* headTree() const;

    QString lastErrorMessage() const;
};
