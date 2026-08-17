#pragma once

#include <QObject>
#include <QString>
#include <QStringList>
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
    Q_PROPERTY(DiffModel* diffModel READ diffModel CONSTANT)

public:
    explicit GitRepo(QObject* parent = nullptr);
    ~GitRepo() override;

    bool isOpen() const { return m_repo != nullptr; }
    QString repoPath() const { return m_repoPath; }
    DiffModel* diffModel() const { return m_diffModel; }

    // Opens (does not clone) an existing local repository at `path`.
    Q_INVOKABLE bool openRepository(const QString& path);

    // Recomputes the working-directory-vs-HEAD diff and refreshes diffModel().
    Q_INVOKABLE void refreshDiff();

    // Stages exactly `files` (relative paths within the repo) and creates
    // a single commit with `message`. Returns true on success.
    Q_INVOKABLE bool stageAndCommit(const QStringList& files, const QString& message);

    // Pushes the current branch to `remoteName` (default "origin") using
    // `token` as a GitHub OAuth token (sent as an HTTPS credential).
    Q_INVOKABLE bool pushCurrentBranch(const QString& token, const QString& remoteName = "origin");

    Q_INVOKABLE QString currentBranchName() const;

signals:
    void repoChanged();
    void diffChanged();
    void errorOccurred(const QString& message);

private:
    git_repository* m_repo = nullptr;
    QString m_repoPath;
    DiffModel* m_diffModel;

    // Returns the tree HEAD points at, or nullptr for an unborn branch
    // (brand new repo with no commits yet) -- libgit2 treats a null tree
    // as "compare against empty tree", so callers can pass this straight
    // into git_diff_tree_to_workdir_with_index.
    git_tree* headTree() const;

    QString lastErrorMessage() const;
};
