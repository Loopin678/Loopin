#include "GitRepo.h"

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

GitRepo::GitRepo(QObject* parent)
    : QObject(parent), m_diffModel(new DiffModel(this)) {}

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
        return false;
    }

    m_repoPath = path;
    emit repoChanged();
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

    git_tree* tree = headTree();
    git_diff_options opts = GIT_DIFF_OPTIONS_INIT;
    // Without these flags, brand-new (untracked) files are silently
    // excluded from the diff -- only modifications to files git already
    // knows about would show up, which would hide most of what the
    // "Change Inbox" is supposed to catch.
    opts.flags |= GIT_DIFF_INCLUDE_UNTRACKED | GIT_DIFF_RECURSE_UNTRACKED_DIRS
                | GIT_DIFF_SHOW_UNTRACKED_CONTENT;
    git_diff* diff = nullptr;

    const int rc = git_diff_tree_to_workdir_with_index(&diff, m_repo, tree, &opts);
    if (tree) git_tree_free(tree);

    if (rc != 0) {
        emit errorOccurred(lastErrorMessage());
        return;
    }

    m_diffModel->rebuild(diff);
    git_diff_free(diff);
    emit diffChanged();
}

bool GitRepo::stageAndCommit(const QStringList& files, const QString& message) {
    if (!m_repo || files.isEmpty()) return false;

    git_index* index = nullptr;
    if (git_repository_index(&index, m_repo) != 0) {
        emit errorOccurred(lastErrorMessage());
        return false;
    }

    for (const QString& f : files) {
        // NOTE: deleted files need git_index_remove_bypath instead; for
        // an MVP we handle the common add/modify case here.
        git_index_add_bypath(index, f.toUtf8().constData());
    }
    git_index_write(index);

    git_oid treeId;
    git_index_write_tree(&treeId, index);
    git_index_free(index);

    git_tree* tree = nullptr;
    if (git_tree_lookup(&tree, m_repo, &treeId) != 0) {
        emit errorOccurred(lastErrorMessage());
        return false;
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
        return false;
    }

    refreshDiff();
    return true;
}

bool GitRepo::pushCurrentBranch(const QString& token, const QString& remoteName) {
    if (!m_repo) return false;

    git_remote* remote = nullptr;
    if (git_remote_lookup(&remote, m_repo, remoteName.toUtf8().constData()) != 0) {
        emit errorOccurred(lastErrorMessage());
        return false;
    }

    git_reference* headRef = nullptr;
    if (git_repository_head(&headRef, m_repo) != 0) {
        git_remote_free(remote);
        emit errorOccurred(lastErrorMessage());
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
        emit errorOccurred(lastErrorMessage());
        return false;
    }
    return true;
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
