#include "DiffModel.h"

#include <QJsonObject>

namespace {

QString statusToString(git_delta_t status) {
    switch (status) {
        case GIT_DELTA_ADDED: return QStringLiteral("added");
        case GIT_DELTA_UNTRACKED: return QStringLiteral("added");
        case GIT_DELTA_DELETED: return QStringLiteral("deleted");
        case GIT_DELTA_RENAMED: return QStringLiteral("renamed");
        case GIT_DELTA_COPIED: return QStringLiteral("copied");
        case GIT_DELTA_MODIFIED:
        default:
            return QStringLiteral("modified");
    }
}

}  // namespace

DiffModel::DiffModel(QObject* parent) : QAbstractListModel(parent) {}

int DiffModel::rowCount(const QModelIndex& parent) const {
    if (parent.isValid()) return 0;
    return m_entries.size();
}

QVariant DiffModel::data(const QModelIndex& index, int role) const {
    if (!index.isValid() || index.row() < 0 || index.row() >= m_entries.size())
        return {};

    const DiffEntry& e = m_entries.at(index.row());
    switch (role) {
        case FilePathRole: return e.filePath;
        case ChangeTypeRole: return e.changeType;
        case PatchTextRole: return e.patchText;
        case SelectedRole: return e.selected;
        default: return {};
    }
}

bool DiffModel::setData(const QModelIndex& index, const QVariant& value, int role) {
    if (!index.isValid() || index.row() < 0 || index.row() >= m_entries.size())
        return false;

    if (role == SelectedRole) {
        m_entries[index.row()].selected = value.toBool();
        emit dataChanged(index, index, {SelectedRole});
        return true;
    }
    return false;
}

QHash<int, QByteArray> DiffModel::roleNames() const {
    return {
        {FilePathRole, "filePath"},
        {ChangeTypeRole, "changeType"},
        {PatchTextRole, "patchText"},
        {SelectedRole, "selected"},
    };
}

int DiffModel::count() const {
    return rowCount();
}

void DiffModel::setSelected(int row, bool selected) {
    if (row < 0 || row >= m_entries.size()) return;
    setData(index(row, 0), selected, SelectedRole);
}

void DiffModel::rebuild(git_diff* diff) {
    beginResetModel();
    m_entries.clear();

    const size_t deltaCount = diff ? git_diff_num_deltas(diff) : 0;
    for (size_t i = 0; i < deltaCount; ++i) {
        git_patch* patch = nullptr;
        if (git_patch_from_diff(&patch, diff, i) != 0 || patch == nullptr)
            continue;

        const git_diff_delta* delta = git_patch_get_delta(patch);

        DiffEntry entry;
        entry.filePath = QString::fromUtf8(
            delta->new_file.path ? delta->new_file.path : delta->old_file.path);
        entry.changeType = statusToString(delta->status);

        git_buf buf = {};
        if (git_patch_to_buf(&buf, patch) == 0) {
            entry.patchText = QString::fromUtf8(buf.ptr, static_cast<int>(buf.size));
            git_buf_dispose(&buf);
        }

        m_entries.append(entry);
        git_patch_free(patch);
    }

    endResetModel();
    emit countChanged();
}

QJsonArray DiffModel::toJson() const {
    QJsonArray arr;
    for (const auto& e : m_entries) {
        QJsonObject obj;
        obj["filePath"] = e.filePath;
        obj["changeType"] = e.changeType;
        obj["patch"] = e.patchText;
        obj["selected"] = e.selected;
        arr.append(obj);
    }
    return arr;
}

QStringList DiffModel::selectedFilePaths() const {
    QStringList result;
    for (const auto& e : m_entries)
        if (e.selected)
            result << e.filePath;
    return result;
}
