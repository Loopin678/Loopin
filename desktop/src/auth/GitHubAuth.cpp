#include "GitHubAuth.h"

#include <QDesktopServices>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QUrl>
#include <QUrlQuery>

// TODO: replace with your GitHub OAuth App's Client ID.
const QString GitHubAuth::kClientId = QStringLiteral("Ov23li3pbk1LwdgxLJEV");

GitHubAuth::GitHubAuth(QObject* parent) : QObject(parent) {}

void GitHubAuth::checkSavedToken() {
    auto job = new QKeychain::ReadPasswordJob(QStringLiteral("CollabDesktopClient"), this);
    job->setKey(QStringLiteral("github_oauth_token"));
    connect(job, &QKeychain::Job::finished, this, [this, job]() {
        if (job->error()) {
            emit noSavedToken();
        } else {
            emit authenticated(job->textData());
        }
        job->deleteLater();
    });
    job->start();
}

void GitHubAuth::startLogin() {
    QNetworkRequest req(QUrl(QStringLiteral("https://github.com/login/device/code")));
    req.setHeader(QNetworkRequest::ContentTypeHeader, "application/x-www-form-urlencoded");
    req.setRawHeader("Accept", "application/json");

    QUrlQuery params;
    params.addQueryItem("client_id", kClientId);
    params.addQueryItem("scope", "repo");

    QNetworkReply* reply = m_nam.post(req, params.query(QUrl::FullyEncoded).toUtf8());
    connect(reply, &QNetworkReply::finished, this, [this, reply]() {
        reply->deleteLater();

        if (reply->error() != QNetworkReply::NoError) {
            emit authFailed(reply->errorString());
            return;
        }

        const QJsonObject json = QJsonDocument::fromJson(reply->readAll()).object();
        if (!json.contains("device_code")) {
            emit authFailed(QStringLiteral("Unexpected response starting device flow."));
            return;
        }

        m_deviceCode = json.value("device_code").toString();
        const QString userCode = json.value("user_code").toString();
        const QString verificationUri = json.value("verification_uri").toString();
        const int interval = json.value("interval").toInt(5);

        QDesktopServices::openUrl(QUrl(verificationUri));
        emit userCodeReady(userCode, verificationUri);
        pollForToken(interval);
    });
}

void GitHubAuth::pollForToken(int intervalSeconds) {
    if (m_pollTimer) {
        m_pollTimer->stop();
        m_pollTimer->deleteLater();
    }

    m_pollTimer = new QTimer(this);
    m_pollTimer->setInterval(intervalSeconds * 1000);

    connect(m_pollTimer, &QTimer::timeout, this, [this]() {
        QNetworkRequest req(
            QUrl(QStringLiteral(
                "https://github.com/login/oauth/access_token"
            ))
        );

        req.setHeader(
            QNetworkRequest::ContentTypeHeader,
            "application/x-www-form-urlencoded"
        );
        req.setRawHeader("Accept", "application/json");

        QUrlQuery params;
        params.addQueryItem("client_id", kClientId);
        params.addQueryItem("device_code", m_deviceCode);
        params.addQueryItem(
            "grant_type",
            "urn:ietf:params:oauth:grant-type:device_code"
        );

        QNetworkReply* reply =
            m_nam.post(req, params.query(QUrl::FullyEncoded).toUtf8());

        connect(reply, &QNetworkReply::finished, this, [this, reply]() {
            reply->deleteLater();

            if (reply->error() != QNetworkReply::NoError) {
                m_pollTimer->stop();
                emit authFailed(reply->errorString());
                return;
            }

            const QJsonObject json =
                QJsonDocument::fromJson(reply->readAll()).object();

            // SUCCESS
            if (json.contains("access_token")) {
                m_pollTimer->stop();
                QString token = json.value("access_token").toString();

                auto job = new QKeychain::WritePasswordJob(QStringLiteral("CollabDesktopClient"), this);
                job->setKey(QStringLiteral("github_oauth_token"));
                job->setTextData(token);
                connect(job, &QKeychain::Job::finished, this, [job]() {
                    job->deleteLater();
                });
                job->start();

                emit authenticated(token);
                return;
            }

            const QString error = json.value("error").toString();

            // USER HAS NOT APPROVED YET
            if (error == QStringLiteral("authorization_pending")) {
                return; // keep polling
            }

            // POLLED TOO FAST
            if (error == QStringLiteral("slow_down")) {
                const int newInterval =
                    json.value("interval").toInt(
                        m_pollTimer->interval() / 1000 + 5
                    );

                m_pollTimer->setInterval(newInterval * 1000);
                return; // keep polling
            }

            // REAL FAILURES
            if (error == QStringLiteral("expired_token")) {
                m_pollTimer->stop();
                emit authFailed(
                    QStringLiteral("GitHub login expired. Please try again.")
                );
                return;
            }

            if (error == QStringLiteral("access_denied")) {
                m_pollTimer->stop();
                emit authFailed(
                    QStringLiteral("GitHub login was cancelled.")
                );
                return;
            }

            // Anything unexpected
            m_pollTimer->stop();
            emit authFailed(
                error.isEmpty()
                    ? QStringLiteral("Unknown GitHub OAuth error.")
                    : error
            );
        });
    });

    m_pollTimer->start();
}