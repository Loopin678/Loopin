#include "ChangeWatcher.h"

ChangeWatcher::ChangeWatcher(QObject* parent) : QObject(parent) {
    m_timer.setSingleShot(false);
    connect(&m_timer, &QTimer::timeout, this, &ChangeWatcher::tick);
}

void ChangeWatcher::start(int intervalMs) {
    m_timer.setInterval(intervalMs);
    m_timer.start();
    emit activeChanged();
}

void ChangeWatcher::stop() {
    m_timer.stop();
    emit activeChanged();
}
