/****************************************************************************
** Generated QML type registration code
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <QtQml/qqml.h>
#include <QtQml/qqmlmoduleregistration.h>

#if __has_include(<ApiClient.h>)
#  include <ApiClient.h>
#endif
#if __has_include(<ChangeWatcher.h>)
#  include <ChangeWatcher.h>
#endif
#if __has_include(<DiffModel.h>)
#  include <DiffModel.h>
#endif
#if __has_include(<GitHubAuth.h>)
#  include <GitHubAuth.h>
#endif
#if __has_include(<GitRepo.h>)
#  include <GitRepo.h>
#endif


#if !defined(QT_STATIC)
#define Q_QMLTYPE_EXPORT Q_DECL_EXPORT
#else
#define Q_QMLTYPE_EXPORT
#endif
Q_QMLTYPE_EXPORT void qml_register_types_App()
{
    QT_WARNING_PUSH QT_WARNING_DISABLE_DEPRECATED
    qmlRegisterTypesAndRevisions<ApiClient>("App", 1);
    qmlRegisterTypesAndRevisions<ChangeWatcher>("App", 1);
    qmlRegisterTypesAndRevisions<DiffModel>("App", 1);
    qmlRegisterEnum<DiffModel::Roles>("DiffModel::Roles");
    qmlRegisterTypesAndRevisions<GitHubAuth>("App", 1);
    qmlRegisterTypesAndRevisions<GitRepo>("App", 1);
    QMetaType::fromType<QAbstractItemModel *>().id();
    qmlRegisterEnum<QAbstractItemModel::LayoutChangeHint>("QAbstractItemModel::LayoutChangeHint");
    qmlRegisterEnum<QAbstractItemModel::CheckIndexOption>("QAbstractItemModel::CheckIndexOption");
    QMetaType::fromType<QAbstractListModel *>().id();
    QT_WARNING_POP
    qmlRegisterModule("App", 1, 0);
}

static const QQmlModuleRegistration appRegistration("App", qml_register_types_App);
