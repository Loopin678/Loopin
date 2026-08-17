#include "GitRepo.h"
#include <QProcess>
#include <QDateTime>
#include <QVariantMap>
#include <QDir>
#include <QFile>
#include <QTextStream>
#include <QtConcurrent/QtConcurrent>

namespace {

// libgit2 credential-acquire callback for HTTPS pushes to GitHub. GitHub
// accepts an OAuth/PAT-style token as the password with (almost) any
// username -- "x-access-token" is the conventional choice.
struct PushPayload {
    std::string token;
};

int credentialsAcquire(git_credential** out,
                        const char* /*url*/,
                        const char* /*username_from_url*/,
                        unsigned int /*allowed_types*/,
                        void* payload) {
    auto* p = static_cast<PushPayload*>(payload);
    return git_credential_userpass_plaintext_new(out, "x-access-token", p->token.c_str());
}

}  // namespace

// ── Helper: run a git sub-command in the repo working dir ─────────────────
static bool runGit(const QString& workDir, const QStringList& args, QString* output = nullptr);

GitRepo::GitRepo(QObject* parent)
    : QObject(parent), m_diffModel(new DiffModel(this)) {}

QStringList GitRepo::remotes() const {
    if (!m_repo) return {};
    git_strarray array = {nullptr, 0};
    if (git_remote_list(&array, m_repo) != 0) return {};
    QStringList result;
    for (size_t i = 0; i < array.count; ++i) {
        result.append(QString::fromUtf8(array.strings[i]));
    }
    git_strarray_dispose(&array);
    return result;
}

GitRepo::~GitRepo() {
    if (m_repo) git_repository_free(m_repo);
}

QString GitRepo::lastErrorMessage() const {
    const git_error* err = git_error_last();
    return (err && err->message) ? QString::fromUtf8(err->message)
                                  : QStringLiteral("Unknown git error");
}

bool GitRepo::openRepository(const QString& path) {
    if (m_repo) {
        git_repository_free(m_repo);
        m_repo = nullptr;
    }

    const int rc = git_repository_open(&m_repo, path.toUtf8().constData());
    if (rc != 0) {
        emit errorOccurred(lastErrorMessage());
        m_repoPath.clear();
        emit repoChanged();
        emit remotesChanged();
        return false;
    }

    m_repoPath = path;
    emit repoChanged();
    emit remotesChanged();
    return true;
}

git_tree* GitRepo::headTree() const {
    git_reference* headRef = nullptr;
    if (git_repository_head(&headRef, m_repo) != 0)
        return nullptr;  // unborn branch: no commits yet

    git_object* obj = nullptr;
    const int rc = git_reference_peel(&obj, headRef, GIT_OBJECT_TREE);
    git_reference_free(headRef);
    if (rc != 0) return nullptr;

    return reinterpret_cast<git_tree*>(obj);
}

void GitRepo::refreshDiff() {
    if (!m_repo) return;

    // Detect if HEAD changed externally (e.g. CLI commit/pull/reset)
    git_reference* headRef = nullptr;
    QString currentHeadSha;
    if (git_repository_head(&headRef, m_repo) == 0) {
        const git_oid* target = git_reference_target(headRef);
        if (target) {
            char oid_str[GIT_OID_HEXSZ + 1];
            git_oid_tostr(oid_str, sizeof(oid_str), target);
            currentHeadSha = QString::fromUtf8(oid_str);
        }
        git_reference_free(headRef);
    }
    
    if (!currentHeadSha.isEmpty() && m_lastHeadSha != currentHeadSha) {
        m_lastHeadSha = currentHeadSha;
        // The repo has moved to a new commit!
        emit repoChanged();
    }

    git_tree* tree = headTree();
    git_diff_options opts = GIT_DIFF_OPTIONS_INIT;
    opts.flags |= GIT_DIFF_INCLUDE_UNTRACKED | GIT_DIFF_RECURSE_UNTRACKED_DIRS
                | GIT_DIFF_SHOW_UNTRACKED_CONTENT;
    git_diff* diff = nullptr;

    const int rc = git_diff_tree_to_workdir_with_index(&diff, m_repo, tree, &opts);
    if (tree) git_tree_free(tree);

    if (rc != 0) {
        emit errorOccurred(lastErrorMessage());
        return;
    }

    bool changed = m_diffModel->rebuild(diff);
    git_diff_free(diff);
    
    if (changed) {
        emit diffChanged();
    }
}

QString GitRepo::stageAndCommit(const QStringList& files, const QString& message) {
    if (!m_repo || files.isEmpty()) return QString();

    git_index* index = nullptr;
    if (git_repository_index(&index, m_repo) != 0) {
        emit errorOccurred(lastErrorMessage());
        return QString();
    }

    for (const QString& f : files) {
        if (QFile::exists(m_repoPath + "/" + f)) {
            git_index_add_bypath(index, f.toUtf8().constData());
        } else {
            git_index_remove_bypath(index, f.toUtf8().constData());
        }
    }
    git_index_write(index);

    git_oid treeId;
    if (git_index_write_tree(&treeId, index) != 0) {
        emit errorOccurred("Failed to write tree: " + lastErrorMessage());
        git_index_free(index);
        return QString();
    }
    git_index_free(index);

    git_tree* tree = nullptr;
    if (git_tree_lookup(&tree, m_repo, &treeId) != 0) {
        emit errorOccurred("Failed to lookup tree: " + lastErrorMessage());
        return QString();
    }

    git_signature* sig = nullptr;
    if (git_signature_default(&sig, m_repo) != 0) {
        // Falls back to a placeholder identity if user.name/user.email
        // aren't set in git config -- replace with real user info from
        // your GitHub auth in a production build.
        git_signature_now(&sig, "Collab Client", "collab-client@example.com");
    }

    git_reference* headRef = nullptr;
    git_commit* parent = nullptr;
    const bool hasParent = (git_repository_head(&headRef, m_repo) == 0);
    if (hasParent) {
        git_commit_lookup(&parent, m_repo, git_reference_target(headRef));
    }

    git_oid commitId;
    const git_commit* parents[1] = {parent};
    const int rc = git_commit_create(&commitId, m_repo, "HEAD", sig, sig, nullptr,
                                      message.toUtf8().constData(), tree,
                                      hasParent ? 1 : 0, hasParent ? parents : nullptr);

    git_tree_free(tree);
    git_signature_free(sig);
    if (parent) git_commit_free(parent);
    if (headRef) git_reference_free(headRef);

    if (rc != 0) {
        emit errorOccurred(lastErrorMessage());
        return QString();
    }

    refreshDiff();
    char oid_str[GIT_OID_HEXSZ + 1];
    git_oid_tostr(oid_str, sizeof(oid_str), &commitId);
    return QString::fromUtf8(oid_str);
}

bool GitRepo::pushCurrentBranch(const QString& token, const QString& remoteName) {
    if (!m_repo) return false;

    git_remote* remote = nullptr;
    if (git_remote_lookup(&remote, m_repo, remoteName.toUtf8().constData()) != 0) {
        emit errorOccurred("Remote lookup failed: " + lastErrorMessage());
        return false;
    }

    git_reference* headRef = nullptr;
    if (git_repository_head(&headRef, m_repo) != 0) {
        git_remote_free(remote);
        emit errorOccurred("HEAD lookup failed");
        return false;
    }
    const QString refName = QString::fromUtf8(git_reference_name(headRef));
    git_reference_free(headRef);

    const QString refspecStr = refName + ":" + refName;
    QByteArray refspecBytes = refspecStr.toUtf8();
    char* refspecs[1] = {refspecBytes.data()};
    git_strarray refspecArray{refspecs, 1};

    PushPayload payload{token.toStdString()};
    git_push_options opts = GIT_PUSH_OPTIONS_INIT;
    opts.callbacks.credentials = credentialsAcquire;
    opts.callbacks.payload = &payload;

    const int rc = git_remote_push(remote, &refspecArray, &opts);
    git_remote_free(remote);

    if (rc != 0) {
        // Fallback to system git (handles SSH remotes, credential helpers, etc.)
        QString branch = currentBranchName();
        QString out;
        if (runGit(m_repoPath, {"push", remoteName, branch}, &out)) {
            emit repoChanged();
            return true;
        }

        emit errorOccurred(QString("Push failed:\n") + out.trimmed());
        return false;
    }
    
    // Manually update the remote tracking branch since git_remote_push doesn't do it automatically
    QString branch = currentBranchName();
    if (!branch.isEmpty()) {
        QString trackingRef = "refs/remotes/" + remoteName + "/" + branch;
        git_reference* headRefForUpdate = nullptr;
        if (git_repository_head(&headRefForUpdate, m_repo) == 0) {
            git_reference* newRef = nullptr;
            git_reference_create(&newRef, m_repo, trackingRef.toUtf8().constData(), git_reference_target(headRefForUpdate), 1, "update by push");
            if (newRef) git_reference_free(newRef);
            git_reference_free(headRefForUpdate);
        }
    }
    
    emit repoChanged();
    return true;
}

bool GitRepo::pushCommit(const QString& sha, const QString& remoteName) {
    if (!m_repo) return false;
    QString out;
    // git push remote <sha>:<branch>
    if (runGit(m_repoPath, {"push", remoteName, sha + ":" + currentBranchName()}, &out)) {
        emit repoChanged();
        return true;
    }
    emit errorOccurred(QString("Push commit failed:\n") + out.trimmed());
    return false;
}

QString GitRepo::currentBranchName() const {
    if (!m_repo) return {};

    git_reference* headRef = nullptr;
    if (git_repository_head(&headRef, m_repo) != 0) return {};

    QString name;
    const char* branch = nullptr;
    if (git_branch_name(&branch, headRef) == 0)
        name = QString::fromUtf8(branch);

    git_reference_free(headRef);
    return name;
}

QStringList GitRepo::branches() const {
    if (!m_repo) return {};

    git_branch_iterator* it = nullptr;
    if (git_branch_iterator_new(&it, m_repo, GIT_BRANCH_ALL) != 0)
        return {};

    QStringList localBranches;
    QStringList remoteBranches;
    git_reference* ref = nullptr;
    git_branch_t type;
    while (git_branch_next(&ref, &type, it) == 0) {
        const char* name = nullptr;
        if (git_branch_name(&name, ref) == 0 && name) {
            QString branchName = QString::fromUtf8(name);
            if (type == GIT_BRANCH_LOCAL) {
                localBranches.append(branchName);
            } else if (type == GIT_BRANCH_REMOTE) {
                if (!branchName.endsWith("/HEAD")) {
                    remoteBranches.append(branchName);
                }
            }
        }
        git_reference_free(ref);
    }
    git_branch_iterator_free(it);
    
    QStringList list = localBranches;
    for (const QString& rb : remoteBranches) {
        QString localEquiv = rb.section('/', 1); // Extract 'arnav' from 'origin/arnav'
        if (!localBranches.contains(localEquiv)) {
            list.append(rb);
        }
    }
    list.sort();
    return list;
}

bool GitRepo::createBranch(const QString& branchName, bool checkout) {
    if (!m_repo) return false;
    
    QString out;
    QStringList args = {"branch", branchName};
    bool ok = runGit(m_repoPath, args, &out);
    if (!ok) {
        emit errorOccurred("Failed to create branch:\n" + out);
        return false;
    }
    
    emit repoChanged();
    
    if (checkout) {
        return checkoutBranch(branchName);
    }
    
    return true;
}

bool GitRepo::checkoutBranch(const QString& branchName) {
    if (!m_repo) {
        emit checkoutFinished(false, "Repository not open");
        return false;
    }
    QString out;
    bool ok;
    if (branchName.contains('/')) {
        // Automatically set up tracking for remote branches (e.g. origin/arnav)
        ok = runGit(m_repoPath, {"checkout", "--track", branchName}, &out);
    } else {
        ok = runGit(m_repoPath, {"checkout", branchName}, &out);
    }
    
    if (!ok) emit errorOccurred("Checkout failed:\n" + out);
    if (ok) {
        refreshDiff();
        emit repoChanged();
    }
    emit checkoutFinished(ok, out);
    return ok;
}

// ── Helper: run a git sub-command in the repo working dir ─────────────────
static bool runGit(const QString& workDir, const QStringList& args, QString* output) {
    QProcess proc;
    proc.setWorkingDirectory(workDir);
    proc.setProgram("git");
    proc.setArguments(args);
    proc.start();
    proc.waitForFinished(30000);
    if (output)
        *output = QString::fromUtf8(proc.readAllStandardOutput())
                + QString::fromUtf8(proc.readAllStandardError());
    return proc.exitStatus() == QProcess::NormalExit && proc.exitCode() == 0;
}

bool GitRepo::fetchRemote(const QString& remoteName) {
    if (!m_repo) {
        emit fetchFinished(false, "Repository not open");
        return false;
    }
    QString out;
    bool ok = runGit(m_repoPath, {"fetch", remoteName}, &out);
    if (!ok) emit errorOccurred("git fetch failed:\n" + out);
    emit fetchFinished(ok, out);
    return ok;
}

bool GitRepo::pullRemote(const QString& remoteName) {
    if (!m_repo) {
        emit pullFinished(false, "Repository not open");
        return false;
    }
    QString out;
    bool ok = runGit(m_repoPath, {"pull", remoteName, currentBranchName()}, &out);
    if (!ok) emit errorOccurred("git pull failed:\n" + out);
    if (ok) { refreshDiff(); emit repoChanged(); }
    emit pullFinished(ok, out);
    return ok;
}

QStringList GitRepo::unpushedCommitShas(const QString& remoteName) const {
    if (!m_repo) return {};
    QString branch = currentBranchName();
    if (branch.isEmpty()) return {};

    QString out;
    // git log remote/branch..HEAD --format=%h  gives short SHAs of unpushed commits
    bool ok = runGit(m_repoPath,
        {"log", remoteName + "/" + branch + "..HEAD", "--format=%h"}, &out);
    if (!ok) return {};  // remote tracking branch may not exist

    QStringList shas;
    for (const QString& line : out.split('\n', Qt::SkipEmptyParts))
        shas.append(line.trimmed());
    return shas;
}

bool GitRepo::writeFile(const QString& relativePath, const QString& content) {
    if (m_repoPath.isEmpty()) return false;
    QFile f(QDir(m_repoPath).filePath(relativePath));
    if (f.open(QIODevice::WriteOnly | QIODevice::Text)) {
        f.write(content.toUtf8());
        return true;
    }
    return false;
}

QString GitRepo::readFile(const QString& relativePath) {
    if (m_repoPath.isEmpty()) return {};
    QFile f(QDir(m_repoPath).filePath(relativePath));
    if (f.open(QIODevice::ReadOnly | QIODevice::Text)) {
        return QString::fromUtf8(f.readAll());
    }
    return {};
}

QVariantList GitRepo::commitHistory(int limit) const {
    QVariantList result;
    if (!m_repo) return result;

    git_reference* headRef = nullptr;
    if (git_repository_head(&headRef, m_repo) != 0) return result;

    git_revwalk* walker = nullptr;
    if (git_revwalk_new(&walker, m_repo) != 0) {
        git_reference_free(headRef);
        return result;
    }

    git_revwalk_sorting(walker, GIT_SORT_TIME);
    git_revwalk_push(walker, git_reference_target(headRef));
    git_reference_free(headRef);

    git_oid oid;
    int count = 0;
    while (git_revwalk_next(&oid, walker) == 0 && count < limit) {
        git_commit* commit = nullptr;
        if (git_commit_lookup(&commit, m_repo, &oid) != 0) continue;

        char shortSha[8] = {};
        git_oid_tostr(shortSha, sizeof(shortSha), &oid);

        const git_signature* author = git_commit_author(commit);
        const char* rawMsg = git_commit_message(commit);
        // Only the first line of the commit message
        QString message = QString::fromUtf8(rawMsg ? rawMsg : "").split('\n').first();

        QVariantMap entry;
        entry["sha"] = QString::fromUtf8(shortSha);
        entry["message"] = message;
        entry["author"] = author ? QString::fromUtf8(author->name) : QStringLiteral("Unknown");
        entry["date"] = author ? QDateTime::fromSecsSinceEpoch(author->when.time).toString("yyyy-MM-dd hh:mm") : QString();

        result.append(entry);
        git_commit_free(commit);
        ++count;
    }

    git_revwalk_free(walker);
    return result;
}

bool GitRepo::stashFile(const QString& filePath) {
    if (!m_repo) return false;
    QString out;
    // git stash push -m "Stashed <file>" -- <file>
    QString message = "Stashed " + filePath;
    bool ok = runGit(m_repoPath, {"stash", "push", "-m", message, "--", filePath}, &out);
    if (!ok) {
        emit errorOccurred("git stash push failed:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

bool GitRepo::discardFileChanges(const QString& filePath) {
    if (!m_repo) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"checkout", "--", filePath}, &out);
    if (!ok) {
        emit errorOccurred("git checkout failed:\n" + out);
        return false;
    }
    refreshDiff();
    return true;
}

bool GitRepo::stashChanges(const QString& message) {
    if (!m_repo) return false;
    QString out;
    QStringList args;
    if (message.isEmpty())
        args = {"stash"};
    else
        args = {"stash", "push", "-m", message};
    bool ok = runGit(m_repoPath, args, &out);
    if (!ok) {
        emit errorOccurred("git stash failed:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

bool GitRepo::stashPop() {
    if (!m_repo) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"stash", "pop"}, &out);
    if (!ok) {
        emit errorOccurred("git stash pop failed:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

QVariantList GitRepo::stashList() const {
    QVariantList result;
    if (!m_repo) return result;
    QString out;
    bool ok = runGit(m_repoPath, {"stash", "list", "--format=%gd|||%s"}, &out);
    if (!ok) return result;
    for (const QString& line : out.split('\n', Qt::SkipEmptyParts)) {
        QStringList parts = line.trimmed().split("|||");
        if (parts.size() < 2) continue;
        QVariantMap entry;
        entry["index"] = parts[0];
        entry["message"] = parts[1];
        result.append(entry);
    }
    return result;
}

QStringList GitRepo::listAllFiles() const {
    if (!m_repo) return {};
    QString out;
    bool ok = runGit(m_repoPath, {"ls-files", "--others", "--cached", "--exclude-standard"}, &out);
    if (!ok) return {};
    QStringList files;
    for (const QString& line : out.split('\n', Qt::SkipEmptyParts))
        files.append(line.trimmed());
    return files;
}

QString GitRepo::getCommitDiff(const QString& sha) {
    if (!m_repo || sha.isEmpty()) return {};
    QString out;
    bool ok = runGit(m_repoPath, {"show", sha, "--format=format:"}, &out);
    if (!ok) {
        emit errorOccurred("git show failed:\n" + out);
        return {};
    }
    return out;
}

bool GitRepo::revertCommit(const QString& sha) {
    if (!m_repo || sha.isEmpty()) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"revert", "--no-commit", sha}, &out);
    if (!ok) {
        emit errorOccurred("git revert failed:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

bool GitRepo::resetToCommit(const QString& sha, bool hard) {
    if (!m_repo || sha.isEmpty()) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"reset", hard ? "--hard" : "--soft", sha}, &out);
    if (!ok) {
        emit errorOccurred("git reset failed:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

bool GitRepo::mergeBranch(const QString& branchName) {
    if (!m_repo || branchName.isEmpty()) return false;
    QString out;
    // --no-edit prevents git from hanging trying to open a terminal editor for the merge commit message
    bool ok = runGit(m_repoPath, {"merge", "--no-edit", branchName}, &out);
    if (!ok) {
        if (out.contains("CONFLICT") || out.contains("Automatic merge failed")) {
            // Get the list of conflicted files
            QString diffOut;
            if (runGit(m_repoPath, {"diff", "--name-only", "--diff-filter=U"}, &diffOut)) {
                QStringList conflictedFiles;
                for (const QString& line : diffOut.split('\n', Qt::SkipEmptyParts)) {
                    conflictedFiles.append(line.trimmed());
                }
                emit mergeConflictDetected(conflictedFiles);
            } else {
                // Fallback to abort if we can't even list the conflicted files
                abortMerge();
                emit errorOccurred("Merge conflict detected, but failed to list conflicted files. Merge automatically aborted.\n\n" + out);
            }
        } else {
            emit errorOccurred("git merge failed:\n" + out);
        }
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}

bool GitRepo::abortMerge() {
    if (!m_repo) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"merge", "--abort"}, &out);
    refreshDiff();
    emit repoChanged();
    return ok;
}

bool GitRepo::deleteBranch(const QString& branchName) {
    if (!m_repo || branchName.isEmpty()) return false;
    QString out;
    // -D force deletes even if unmerged. Safe enough for this tool? Or -d? 
    // Usually novices might want -D if they just created it, but let's use -d first, or just -D since there is no force UI. 
    // I will use -D so they can definitely delete it if they want.
    bool ok = runGit(m_repoPath, {"branch", "-D", branchName}, &out);
    if (!ok) {
        emit errorOccurred("Failed to delete branch:\n" + out);
        return false;
    }
    emit repoChanged(); // refresh branches
    return true;
}

bool GitRepo::resolveConflictFile(const QString& filePath, const QString& content) {
    if (!m_repo) return false;
    
    // Write the new content
    if (!writeFile(filePath, content)) {
        emit errorOccurred("Failed to write resolved content to " + filePath);
        return false;
    }
    
    // Stage the resolved file
    QString out;
    if (!runGit(m_repoPath, {"add", filePath}, &out)) {
        emit errorOccurred("Failed to stage resolved file " + filePath + ":\n" + out);
        return false;
    }
    
    refreshDiff();
    return true;
}

bool GitRepo::commitResolvedMerge() {
    if (!m_repo) return false;
    QString out;
    bool ok = runGit(m_repoPath, {"commit", "--no-edit"}, &out);
    if (!ok) {
        emit errorOccurred("Failed to commit resolved merge:\n" + out);
        return false;
    }
    refreshDiff();
    emit repoChanged();
    return true;
}
