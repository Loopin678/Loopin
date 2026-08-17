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

    // `changes` should be DiffModel::toJson(). Emits commitGroupsReady
    // asynchronously (or synchronously-via-event-loop in mock mode).
    Q_INVOKABLE void requestCommitGroups(const QJsonArray& changes, const QString& taskId);

    // Tells the backend a commit was made, so it can be associated with
    // the task on your website.
    Q_INVOKABLE void reportCommit(const QString& commitSha, const QString& message,
                                   const QString& taskId);

    // Sends the file list to Gemini and emits gitignoreReady with the result.
    Q_INVOKABLE void generateGitignore(const QStringList& files);

signals:
    void backendUrlChanged();
    void aiProviderChanged();
    void geminiApiKeyChanged();
    void openRouterApiKeyChanged();

    // groups is an array of { "message": string, "files": [string, ...] }
    void commitGroupsReady(const QJsonArray& groups);

    void requestFailed(const QString& error);
    void gitignoreReady(const QString& content);

private:
    QJsonArray mockGroups(const QJsonArray& changes) const;

    QNetworkAccessManager m_nam;
    QString m_backendUrl;
    QString m_aiProvider = "ollama";
    QString m_geminiApiKey;
    QString m_openRouterApiKey;
};
