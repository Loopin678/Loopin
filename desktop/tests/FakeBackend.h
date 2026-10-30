#pragma once

// A tiny in-process HTTP server standing in for the Loopin backend, so the
// desktop tests need no network, database or real server. Tests register a
// handler per "METHOD /path" and can inspect every request that arrived.

#include <QByteArray>
#include <QHash>
#include <QJsonDocument>
#include <QList>
#include <QPointer>
#include <QTcpServer>
#include <QTcpSocket>
#include <functional>

struct FakeRequest {
    QByteArray method;
    QByteArray path;
    QHash<QByteArray, QByteArray> headers;  // lower-case names
    QByteArray body;
    QJsonDocument json() const { return QJsonDocument::fromJson(body); }
};

struct FakeResponse {
    int status = 200;
    QByteArray body = "{}";
};

class FakeBackend : public QTcpServer {
public:
    using Handler = std::function<FakeResponse(const FakeRequest&)>;

    FakeBackend() {
        connect(this, &QTcpServer::newConnection, this, [this]() {
            while (QTcpSocket* s = nextPendingConnection()) {
                connect(s, &QTcpSocket::readyRead, this, [this, s]() { onData(s); });
                connect(s, &QTcpSocket::disconnected, s, &QObject::deleteLater);
            }
        });
        listen(QHostAddress::LocalHost, 0);
    }

    QString url() const { return QStringLiteral("http://127.0.0.1:%1").arg(serverPort()); }

    void on(const QByteArray& methodAndPath, Handler h) { m_handlers.insert(methodAndPath, std::move(h)); }
    void onJson(const QByteArray& methodAndPath, int status, const QByteArray& body) {
        on(methodAndPath, [status, body](const FakeRequest&) { return FakeResponse{status, body}; });
    }

    QList<FakeRequest> requests;

private:
    void onData(QTcpSocket* s) {
        QByteArray& buf = m_buffers[s];
        buf += s->readAll();
        const int headerEnd = buf.indexOf("\r\n\r\n");
        if (headerEnd < 0) return;

        FakeRequest req;
        const QList<QByteArray> lines = buf.left(headerEnd).split('\n');
        const QList<QByteArray> requestLine = lines.value(0).trimmed().split(' ');
        req.method = requestLine.value(0);
        req.path = requestLine.value(1);
        for (int i = 1; i < lines.size(); ++i) {
            const int colon = lines[i].indexOf(':');
            if (colon > 0) req.headers.insert(lines[i].left(colon).trimmed().toLower(), lines[i].mid(colon + 1).trimmed());
        }
        const int length = req.headers.value("content-length", "0").toInt();
        if (buf.size() < headerEnd + 4 + length) return;  // body not complete yet
        req.body = buf.mid(headerEnd + 4, length);
        m_buffers.remove(s);
        requests.append(req);

        const QByteArray key = req.method + ' ' + req.path.split('?').first();
        FakeResponse res = m_handlers.contains(key) ? m_handlers.value(key)(req)
                                                    : FakeResponse{404, "{\"message\":\"no fake handler\"}"};
        QByteArray out = "HTTP/1.1 " + QByteArray::number(res.status) + " X\r\n"
                         "Content-Type: application/json\r\n"
                         "Content-Length: " + QByteArray::number(res.body.size()) + "\r\n"
                         "Connection: close\r\n\r\n" + res.body;
        s->write(out);
        s->disconnectFromHost();
    }

    QHash<QByteArray, Handler> m_handlers;
    QHash<QTcpSocket*, QByteArray> m_buffers;
};
