#pragma once

#include <QAbstractListModel>
#include <QJsonArray>
#include <QQmlEngine>
#include <QVector>

#include <git2.h>

struct DiffEntry {
    QString filePath;
    QString changeType;  // "added" | "modified" | "deleted" | "renamed" | "copied"
    QString patchText;
    bool selected = true;
};

// Exposes the current working-directory diff as a QML-consumable list
// model. Instances are created internally by GitRepo, not from QML.
class DiffModel : public QAbstractListModel {
    Q_OBJECT
    QML_ELEMENT
    QML_UNCREATABLE("Created internally by GitRepo")

    Q_PROPERTY(int count READ count NOTIFY countChanged)

public:
    enum Roles {
        FilePathRole = Qt::UserRole + 1,
        ChangeTypeRole,
        PatchTextRole,
        SelectedRole
    };
    Q_ENUM(Roles)

    explicit DiffModel(QObject* parent = nullptr);

    int rowCount(const QModelIndex& parent = QModelIndex()) const override;
    QVariant data(const QModelIndex& index, int role) const override;
    bool setData(const QModelIndex& index, const QVariant& value, int role) override;
    QHash<int, QByteArray> roleNames() const override;

    int count() const;

    // Rebuilds the model from a git_diff. Returns true if the entries actually changed.
    bool rebuild(git_diff* diff);

    // Toggle whether a row's file should be included in the next
    // "organize changes" request sent to the backend.
    Q_INVOKABLE void setSelected(int row, bool selected);

    // Full change set (all rows, with their selected flag) as JSON,
    // suitable for POSTing to the backend's AI-grouping endpoint.
    Q_INVOKABLE QJsonArray toJson() const;

    Q_INVOKABLE QStringList selectedFilePaths() const;

signals:
    void countChanged();

private:
    QVector<DiffEntry> m_entries;
};
