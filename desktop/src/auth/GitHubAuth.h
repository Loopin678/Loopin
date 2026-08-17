#pragma once

#include <QObject>
#include <QString>
#include <QTimer>
#include <QNetworkAccessManager>
#include <QQmlEngine>

// Implements GitHub's OAuth Device Flow:
// https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow
//
// IMPORTANT: replace kClientId below with your own GitHub OAuth App's
// Client ID, and make sure "Enable Device Flow" is checked on that
// app's settings page (Settings -> Developer settings -> OAuth Apps).
class GitHubAuth : public QObject {
    Q_OBJECT
    QML_ELEMENT

public:
    explicit GitHubAuth(QObject* parent = nullptr);

    // Kicks off the flow: requests a device/user code pair, opens the
    // verification page in the system browser, and starts polling for
    // the user to approve the login.
    Q_INVOKABLE void startLogin();

signals:
    // Emitted once we have a code for the user to enter. `verificationUri`
    // has already been opened in their browser automatically.
    void userCodeReady(const QString& userCode, const QString& verificationUri);

    // Emitted once the user has approved the login in the browser.
    void authenticated(const QString& accessToken);

    // Emitted if the flow fails or the user denies access.
    void authFailed(const QString& error);

private:
    void pollForToken(int intervalSeconds);

    QNetworkAccessManager m_nam;
    QTimer* m_pollTimer = nullptr;
    QString m_deviceCode;

    static const QString kClientId;
};
