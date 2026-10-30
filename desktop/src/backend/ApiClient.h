#pragma once

#include <QObject>
#include <QString>
#include <QJsonArray>
#include <QJsonObject>
#include <QNetworkAccessManager>
#include <QTimer>
#include <QQmlEngine>

class QNetworkReply;

// Talks to YOUR backend (not GitHub, not an AI provider directly). The
// backend is responsible for holding whatever AI API key you use and for
// recording which commits belong to which task_id.
//
// If backendUrl is left empty, requestCommitGroups() falls back to a
// naive local mock grouping so you can test the rest of the app (diff
// reading, commit review UI, actual git commit/push) without a backend
// running yet.
class ApiClient : public QObject {
    Q_OBJECT
    QML_ELEMENT

    Q_PROPERTY(QString backendUrl READ backendUrl WRITE setBackendUrl NOTIFY backendUrlChanged)
    Q_PROPERTY(QString aiProvider READ aiProvider WRITE setAiProvider NOTIFY aiProviderChanged)
    Q_PROPERTY(QString geminiApiKey READ geminiApiKey WRITE setGeminiApiKey NOTIFY geminiApiKeyChanged)
    Q_PROPERTY(QString openRouterApiKey READ openRouterApiKey WRITE setOpenRouterApiKey NOTIFY openRouterApiKeyChanged)
    Q_PROPERTY(QString projectId READ projectId WRITE setProjectId NOTIFY projectIdChanged)
    Q_PROPERTY(QString userId READ userId WRITE setUserId NOTIFY userIdChanged)
    // Token from "Sign in with Loopin"; empty when signed out
    Q_PROPERTY(QString authToken READ authToken WRITE setAuthToken NOTIFY authTokenChanged)
    Q_PROPERTY(bool signingIn READ signingIn NOTIFY signingInChanged)

public:
    explicit ApiClient(QObject* parent = nullptr);

    QString backendUrl() const { return m_backendUrl; }
    void setBackendUrl(const QString& url);

    QString aiProvider() const { return m_aiProvider; }
    void setAiProvider(const QString& p);

    QString geminiApiKey() const { return m_geminiApiKey; }
    void setGeminiApiKey(const QString& k);

    QString openRouterApiKey() const { return m_openRouterApiKey; }
    void setOpenRouterApiKey(const QString& k);

    QString projectId() const { return m_projectId; }
    void setProjectId(const QString& p);

    QString userId() const { return m_userId; }
    void setUserId(const QString& u);

    // Fetch tasks from local backend for the current projectId
    QString authToken() const { return m_authToken; }
    void setAuthToken(const QString& t);
    bool signingIn() const { return m_signInTimer.isActive(); }

    // "Sign in with Loopin": asks the backend for a code (signInCodeReady),
    // then polls until the user approves it on the website (signedIn).
    Q_INVOKABLE void startSignIn(const QString& clientName);
    Q_INVOKABLE void cancelSignIn();
    // Revokes this app's token on the server (best effort) and forgets it
    Q_INVOKABLE void signOut();
    // GET /api/auth/me -> accountReady; a rejected token signs out
    Q_INVOKABLE void fetchAccount();
    // GET /api/projects -> projectsReady([{id, name}, ...])
    Q_INVOKABLE void fetchProjects();
    // Reads {"url": "..."} from discoveryUrl and switches backendUrl to it
    Q_INVOKABLE void discoverBackendUrl(const QString& discoveryUrl);

    Q_INVOKABLE void fetchTasks();

    // Fetch commits from local backend for the current projectId
    Q_INVOKABLE void fetchProjectCommits();

    // `changes` should be DiffModel::toJson(). Emits commitGroupsReady
    // asynchronously (or synchronously-via-event-loop in mock mode).
    Q_INVOKABLE void requestCommitGroups(const QJsonArray& changes, const QString& taskId);

    // Tells the backend a commit was made, so it can be associated with
    // the tasks on your website.
    Q_INVOKABLE void reportCommit(const QString& commitSha, const QString& message,
                                   const QStringList& taskIds);

    // Sends the file list to Gemini and emits gitignoreReady with the result.
    Q_INVOKABLE void generateGitignore(const QStringList& files);

    // Sends a conflicted file to the AI to intelligently resolve the merge conflicts
    // based on the user's preference. Emits mergeResolutionReady.
    Q_INVOKABLE void requestMergeResolution(const QString& filePath, const QString& fileContent, const QString& preference);

signals:
    void backendUrlChanged();
    void aiProviderChanged();
    void geminiApiKeyChanged();
    void openRouterApiKeyChanged();
    void projectIdChanged();
    void userIdChanged();
    void authTokenChanged();
    void signingInChanged();
    void signInCodeReady(const QString& userCode, const QString& verificationUrl);
    void signedIn(const QJsonObject& user);
    void signInFailed(const QString& reason);
    void signedOut(const QString& reason);
    void accountReady(const QJsonObject& user);
    void projectsReady(const QJsonArray& projects);
    void backendUrlDiscovered(const QString& url);

    // groups is an array of { "message": string, "files": [string, ...] }
    void commitGroupsReady(const QJsonArray& groups);
    void gitignoreReady(const QString& content);
    void mergeResolutionReady(const QString& filePath, const QString& resolvedContent);
    void requestFailed(const QString& errorString);
    void tasksReady(const QJsonArray& tasks);
    void projectCommitsReady(const QJsonArray& commits);
    // Emitted only after the backend has stored the commit and its task links
    void commitReported(const QString& sha);
    // A Loopin backend call (tasks, commits, task links) failed. Separate from
    // requestFailed, which is for AI requests (and aborts AI merge resolution).
    void backendError(const QString& errorString);

private:
    QJsonArray mockGroups(const QJsonArray& changes) const;
    // Human-readable error for a failed backend reply, including the server's message
    static QString backendErrorText(QNetworkReply* reply, const QString& what);
    static QString ollamaChatUrl();
    // A request to our backend, with the sign-in token attached
    QNetworkRequest backendRequest(const QString& path) const;
    // Reports a failed backend call; a 401 with a token means it was revoked
    void handleBackendFailure(QNetworkReply* reply, const QString& what);
    void pollSignIn();

    QNetworkAccessManager m_nam;
    QString m_backendUrl;
    QString m_aiProvider = "ollama";
    QString m_geminiApiKey;
    QString m_openRouterApiKey;
    QString m_projectId;
    QString m_userId;
    QString m_authToken;
    QString m_deviceCode;
    QTimer m_signInTimer;
};
