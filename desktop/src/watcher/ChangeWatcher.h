#pragma once

#include <QObject>
#include <QTimer>
#include <QQmlEngine>

// Triggers periodic diff refreshes while a repo is open.
//
// This is a deliberately simple polling timer rather than an OS-level
// file watcher: watching every file in a repo via QFileSystemWatcher
// hits inotify/fd limits on large repos and only reports adds/removes,
// not in-place edits, unless every individual file is watched. For an
// MVP, polling is more robust. If you want push-based updates later,
// this is the piece to replace with the "change-event store" layer
// from the design doc.
class ChangeWatcher : public QObject {
    Q_OBJECT
    QML_ELEMENT

    Q_PROPERTY(bool active READ active NOTIFY activeChanged)

public:
    explicit ChangeWatcher(QObject* parent = nullptr);

    bool active() const { return m_timer.isActive(); }

    Q_INVOKABLE void start(int intervalMs = 2000);
    Q_INVOKABLE void stop();

signals:
    void tick();
    void activeChanged();

private:
    QTimer m_timer;
};
