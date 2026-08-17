#include "ApiClient.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QMap>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QTimer>
#include <QUrl>
#include <qglobal.h>

ApiClient::ApiClient(QObject* parent) : QObject(parent) {
    QString envKey = qEnvironmentVariable("GEMINI_API_KEY");
    if (!envKey.isEmpty()) {
        m_geminiApiKey = envKey;
    }
}

void ApiClient::setAiProvider(const QString& p) {
    if (m_aiProvider == p) return;
    m_aiProvider = p;
    emit aiProviderChanged();
}

void ApiClient::setGeminiApiKey(const QString& k) {
    if (m_geminiApiKey == k) return;
    m_geminiApiKey = k;
    emit geminiApiKeyChanged();
}

void ApiClient::setOpenRouterApiKey(const QString& k) {
    if (m_openRouterApiKey == k) return;
    m_openRouterApiKey = k;
    emit openRouterApiKeyChanged();
}

void ApiClient::setBackendUrl(const QString& url) {
    if (m_backendUrl == url) return;
    m_backendUrl = url;
    emit backendUrlChanged();
}

void ApiClient::requestCommitGroups(const QJsonArray& changes, const QString& taskId) {
    if (m_aiProvider == "gemini") {
        if (m_geminiApiKey.isEmpty()) {
            emit requestFailed("Gemini API key is not configured in settings.");
            return;
        }
        QJsonObject systemInstruction;
        QJsonArray systemParts;
        QJsonObject systemText;
        systemText["text"] = "You are a professional software engineer. Group the following git diffs into logical atomic commits. For each commit, provide a professional commit message following the Conventional Commits specification, and a list of file paths included in that commit. Return a JSON array of objects, each containing 'message' (string) and 'files' (array of strings).";
        systemParts.append(systemText);
        systemInstruction["parts"] = systemParts;

        QJsonObject contents;
        QJsonArray parts;
        QJsonObject textPart;
        
        QJsonArray truncatedChanges;
        for (const QJsonValue& val : changes) {
            QJsonObject obj = val.toObject();
            QString patch = obj.value("patch").toString();
            QStringList patchLines = patch.split('\n');
            if (patchLines.size() > 80) {
                patchLines = patchLines.mid(0, 80);
                obj["patch"] = patchLines.join('\n') + "\n... (truncated)";
            }
            truncatedChanges.append(obj);
        }
        textPart["text"] = QString::fromUtf8(QJsonDocument(truncatedChanges).toJson(QJsonDocument::Compact));
        parts.append(textPart);
        contents["parts"] = parts;

        QJsonObject generationConfig;
        generationConfig["responseMimeType"] = "application/json";

        QJsonObject body;
        body["systemInstruction"] = systemInstruction;
        QJsonArray contentsArr;
        contentsArr.append(contents);
        body["contents"] = contentsArr;
        body["generationConfig"] = generationConfig;

        QNetworkRequest req(QUrl(QStringLiteral("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=") + m_geminiApiKey));
        req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

        QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
        connect(reply, &QNetworkReply::finished, this, [this, reply]() {
            reply->deleteLater();
            if (reply->error() != QNetworkReply::NoError) {
                QString errBody = QString::fromUtf8(reply->readAll());
                emit requestFailed("Gemini Error: " + reply->errorString() + (errBody.isEmpty() ? "" : "\n" + errBody));
                return;
            }
            
            QJsonObject json = QJsonDocument::fromJson(reply->readAll()).object();
            QJsonArray candidates = json.value("candidates").toArray();
            if (!candidates.isEmpty()) {
                QString resultText = candidates.first().toObject().value("content").toObject().value("parts").toArray().first().toObject().value("text").toString();
                QJsonDocument doc = QJsonDocument::fromJson(resultText.toUtf8());
                emit commitGroupsReady(doc.array());
            } else {
                emit requestFailed("Failed to generate commits using Gemini AI");
            }
        });
        return;
    } else {
        // ollama or openrouter
        if (m_aiProvider == "openrouter" && m_openRouterApiKey.isEmpty()) {
            emit requestFailed("OpenRouter API key is not configured in settings.");
            return;
        }

        QJsonObject body;
        body["model"] = (m_aiProvider == "openrouter") ? "google/gemini-2.5-flash" : "qwen2.5-coder:1.5b";
        body["stream"] = false;

        QJsonArray messages;
        QJsonObject systemMsg;
        systemMsg["role"] = "system";
        systemMsg["content"] = "You are a professional software engineer. Group the following git diffs into logical atomic commits. For each commit, provide a professional commit message following the Conventional Commits specification, and a list of file paths included in that commit. Return ONLY a JSON array of objects, each containing 'message' (string) and 'files' (array of strings). Do not output markdown, do not output explanations.";
        messages.append(systemMsg);

        QJsonArray truncatedChanges;
        for (const QJsonValue& val : changes) {
            QJsonObject obj = val.toObject();
            QString patch = obj.value("patch").toString();
            QStringList patchLines = patch.split('\n');
            if (patchLines.size() > 80) {
                patchLines = patchLines.mid(0, 80);
                obj["patch"] = patchLines.join('\n') + "\n... (truncated)";
            }
            truncatedChanges.append(obj);
        }
        
        QJsonObject userMsg;
        userMsg["role"] = "user";
        userMsg["content"] = QString::fromUtf8(QJsonDocument(truncatedChanges).toJson(QJsonDocument::Compact));
        messages.append(userMsg);

        body["messages"] = messages;

        QNetworkRequest req(QUrl(m_aiProvider == "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "http://localhost:11434/api/chat"));
        req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
        if (m_aiProvider == "openrouter") {
            req.setRawHeader("Authorization", ("Bearer " + m_openRouterApiKey).toUtf8());
            req.setRawHeader("HTTP-Referer", "https://github.com/loopin"); 
            req.setRawHeader("X-Title", "Loopin Desktop");
        }

        QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
        connect(reply, &QNetworkReply::finished, this, [this, reply]() {
            reply->deleteLater();
            if (reply->error() != QNetworkReply::NoError) {
                QString errBody = QString::fromUtf8(reply->readAll());
                emit requestFailed("AI Provider Error: " + reply->errorString() + (errBody.isEmpty() ? "" : "\n" + errBody));
                return;
            }
            
            QJsonObject json = QJsonDocument::fromJson(reply->readAll()).object();
            QString resultText = json.value("choices").isArray() 
                ? json.value("choices").toArray().first().toObject().value("message").toObject().value("content").toString()
                : json.value("message").toObject().value("content").toString(); // fallback for ollama if different schema
            
            // Strip out any markdown formatting that small models love to add
            resultText.replace("```json", "");
            resultText.replace("```", "");
            resultText = resultText.trimmed();

            QJsonDocument doc = QJsonDocument::fromJson(resultText.toUtf8());
            if (doc.isArray()) {
                emit commitGroupsReady(doc.array());
            } else {
                emit requestFailed("AI returned invalid JSON:\n" + resultText);
            }
        });
        return;
    }

    if (m_backendUrl.isEmpty()) {
        // No backend configured -- emit mock groups on the next event
        // loop turn so callers can treat this uniformly as async.
        const QJsonArray groups = mockGroups(changes);
        QTimer::singleShot(0, this, [this, groups]() { emit commitGroupsReady(groups); });
        return;
    }

    QJsonObject body;
    body["changes"] = changes;
    body["task_id"] = taskId;

    QNetworkRequest req(QUrl(m_backendUrl + "/api/commits/group"));
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

    QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        reply->deleteLater();
        if (reply->error() != QNetworkReply::NoError) {
            emit requestFailed(reply->errorString());
            return;
        }
        const QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
        emit commitGroupsReady(doc.array());
    });
}

void ApiClient::reportCommit(const QString& commitSha, const QString& message,
                              const QString& taskId) {
    if (m_backendUrl.isEmpty()) return;  // nothing to report to in mock mode

    QJsonObject body;
    body["commit_sha"] = commitSha;
    body["message"] = message;
    body["task_id"] = taskId;

    QNetworkRequest req(QUrl(m_backendUrl + "/api/commits/report"));
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

    QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
    connect(reply, &QNetworkReply::finished, reply, &QNetworkReply::deleteLater);
}

QJsonArray ApiClient::mockGroups(const QJsonArray& changes) const {
    // Naive stand-in for the real AI grouping step described in your
    // design doc: buckets changed files by top-level directory. This
    // exists purely so the commit-review UI and the actual git
    // commit/push path are testable before your backend exists.
    QMap<QString, QJsonArray> buckets;
    for (const QJsonValue& v : changes) {
        const QJsonObject obj = v.toObject();
        if (!obj.value("selected").toBool(true)) continue;

        const QString path = obj.value("filePath").toString();
        const QString bucket = path.contains('/') ? path.section('/', 0, 0)
                                                    : QStringLiteral("root");

        QJsonArray files = buckets.value(bucket);
        files.append(path);
        buckets[bucket] = files;
    }

    QJsonArray groups;
    for (auto it = buckets.constBegin(); it != buckets.constEnd(); ++it) {
        QJsonObject group;
        group["message"] = QStringLiteral("chore: update %1").arg(it.key());
        group["files"] = it.value();
        groups.append(group);
    }
    return groups;
}

void ApiClient::generateGitignore(const QStringList& files) {
    if (m_aiProvider == "gemini") {
        if (m_geminiApiKey.isEmpty()) {
            emit requestFailed("Gemini API key is not configured in settings.");
            return;
        }
        QJsonObject systemInstruction;
        QJsonArray systemParts;
        QJsonObject systemText;
        systemText["text"] = "You are a senior developer. Given this list of files in a git repository, generate a comprehensive .gitignore file. Include common patterns for the detected languages and frameworks. Only output the raw .gitignore content, no explanation.";
        systemParts.append(systemText);
        systemInstruction["parts"] = systemParts;

        QJsonObject contents;
        QJsonArray parts;
        QJsonObject textPart;
        textPart["text"] = files.join('\n');
        parts.append(textPart);
        contents["parts"] = parts;

        QJsonObject generationConfig;
        generationConfig["responseMimeType"] = "text/plain";

        QJsonObject body;
        body["systemInstruction"] = systemInstruction;
        QJsonArray contentsArr;
        contentsArr.append(contents);
        body["contents"] = contentsArr;
        body["generationConfig"] = generationConfig;

        QNetworkRequest req(QUrl(QStringLiteral("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=") + m_geminiApiKey));
        req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");

        QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
        connect(reply, &QNetworkReply::finished, this, [this, reply]() {
            reply->deleteLater();
            if (reply->error() != QNetworkReply::NoError) {
                QString errBody = QString::fromUtf8(reply->readAll());
                emit requestFailed("Gemini Error: " + reply->errorString() + (errBody.isEmpty() ? "" : "\n" + errBody));
                return;
            }

            QJsonObject json = QJsonDocument::fromJson(reply->readAll()).object();
            QJsonArray candidates = json.value("candidates").toArray();
            if (!candidates.isEmpty()) {
                QString text = candidates.first().toObject()
                    .value("content").toObject()
                    .value("parts").toArray()
                    .first().toObject()
                    .value("text").toString();
                emit gitignoreReady(text);
            } else {
                emit requestFailed("Failed to generate .gitignore using Gemini AI");
            }
        });
        return;
    } else {
        if (m_aiProvider == "openrouter" && m_openRouterApiKey.isEmpty()) {
            emit requestFailed("OpenRouter API key is not configured in settings.");
            return;
        }

        QJsonObject body;
        body["model"] = (m_aiProvider == "openrouter") ? "google/gemini-2.5-flash" : "qwen2.5-coder:1.5b";
        body["stream"] = false;

        QJsonArray messages;
        QJsonObject systemMsg;
        systemMsg["role"] = "system";
        systemMsg["content"] = "You are a senior developer. Given this list of files in a git repository, generate a comprehensive .gitignore file. Include common patterns for the detected languages and frameworks. Only output the raw .gitignore content, no explanation.";
        messages.append(systemMsg);

        QJsonObject userMsg;
        userMsg["role"] = "user";
        userMsg["content"] = files.join('\n');
        messages.append(userMsg);

        body["messages"] = messages;

        QNetworkRequest req(QUrl(m_aiProvider == "openrouter" ? "https://openrouter.ai/api/v1/chat/completions" : "http://localhost:11434/api/chat"));
        req.setHeader(QNetworkRequest::ContentTypeHeader, "application/json");
        if (m_aiProvider == "openrouter") {
            req.setRawHeader("Authorization", ("Bearer " + m_openRouterApiKey).toUtf8());
            req.setRawHeader("HTTP-Referer", "https://github.com/loopin"); 
            req.setRawHeader("X-Title", "Loopin Desktop");
        }

        QNetworkReply* reply = m_nam.post(req, QJsonDocument(body).toJson());
        connect(reply, &QNetworkReply::finished, this, [this, reply]() {
            reply->deleteLater();
            if (reply->error() != QNetworkReply::NoError) {
                QString errBody = QString::fromUtf8(reply->readAll());
                emit requestFailed("AI Provider Error: " + reply->errorString() + (errBody.isEmpty() ? "" : "\n" + errBody));
                return;
            }

            QJsonObject json = QJsonDocument::fromJson(reply->readAll()).object();
            QString resultText = json.value("choices").isArray() 
                ? json.value("choices").toArray().first().toObject().value("message").toObject().value("content").toString()
                : json.value("message").toObject().value("content").toString(); // fallback
            
            resultText.replace("```gitignore", "");
            resultText.replace("```", "");
            resultText = resultText.trimmed();

            if (!resultText.isEmpty()) {
                emit gitignoreReady(resultText);
            } else {
                emit requestFailed("Failed to generate .gitignore using AI");
            }
        });
        return;
    }
}
