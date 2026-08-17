#include "ApiClient.h"

#include <QJsonDocument>
#include <QJsonObject>
#include <QMap>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QTimer>
#include <QUrl>

ApiClient::ApiClient(QObject* parent) : QObject(parent) {}

void ApiClient::setBackendUrl(const QString& url) {
    if (m_backendUrl == url) return;
    m_backendUrl = url;
    emit backendUrlChanged();
}

void ApiClient::requestCommitGroups(const QJsonArray& changes, const QString& taskId) {
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
