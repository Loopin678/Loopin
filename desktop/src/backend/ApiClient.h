#pragma once

#include <QObject>
#include <QString>
#include <QJsonArray>
#include <QNetworkAccessManager>
#include <QQmlEngine>

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

signals:
    void backendUrlChanged();
    void aiProviderChanged();
    void geminiApiKeyChanged();
    void openRouterApiKeyChanged();
    void projectIdChanged();
    void userIdChanged();

    // groups is an array of { "message": string, "files": [string, ...] }
    void commitGroupsReady(const QJsonArray& groups);
    void gitignoreReady(const QString& content);
    void requestFailed(const QString& errorString);
    void tasksReady(const QJsonArray& tasks);
    void projectCommitsReady(const QJsonArray& commits);
    void commitReported(const QString& sha);

private:
    QJsonArray mockGroups(const QJsonArray& changes) const;

    QNetworkAccessManager m_nam;
    QString m_backendUrl;
    QString m_aiProvider = "ollama";
    QString m_geminiApiKey;
    QString m_openRouterApiKey;
    QString m_projectId;
    QString m_userId;
};
