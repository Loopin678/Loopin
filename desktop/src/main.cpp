#include <QGuiApplication>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QSettings>
#include <QUrl>

#include <git2.h>
#include <QQuickStyle>

#ifndef LOOPIN_VERSION
#define LOOPIN_VERSION "dev"
#endif

// Settings used to live under the placeholder "YourCompany/CollabDesktopClient";
// copy them once so existing users keep their repo path, IDs and API keys.
static void migrateLegacySettings() {
    QSettings current;
    if (current.value("migratedLegacySettings").toBool()) return;
    QSettings legacy(QStringLiteral("YourCompany"), QStringLiteral("CollabDesktopClient"));
    for (const QString& key : legacy.allKeys()) {
        if (!current.contains(key)) current.setValue(key, legacy.value(key));
    }
    current.setValue("migratedLegacySettings", true);
}

int main(int argc, char* argv[]) {
    QGuiApplication app(argc, argv);
    QGuiApplication::setOrganizationName("Loopin");
    QGuiApplication::setApplicationName("Loopin Desktop");
    QGuiApplication::setApplicationDisplayName("Loopin");
    QGuiApplication::setApplicationVersion(LOOPIN_VERSION);
    QGuiApplication::setDesktopFileName("loopin");  // matches packaging/loopin.desktop
    QGuiApplication::setWindowIcon(QIcon(QStringLiteral(":/loopin.png")));
    migrateLegacySettings();

    // Initialize libgit2 once for the whole process lifetime.
    git_libgit2_init();

    QQuickStyle::setStyle("Fusion");

    QQmlApplicationEngine engine;
    // NOTE: the exact qrc path Qt generates for a qt_add_qml_module can
    // differ between Qt versions (older ones use "/<URI>/...", 6.5+
    // often uses "/qt/qml/<URI>/..."). If this fails to load, run the
    // build once and check build/App/qmldir plus the generated .qrc
    // files under build/ to see the real path, or switch to
    engine.load(QUrl(QStringLiteral("qrc:/App/qml/main.qml")));
    if (engine.rootObjects().isEmpty()) {
        engine.load(QUrl(QStringLiteral("qrc:/qt/qml/App/qml/main.qml")));
    }

    if (engine.rootObjects().isEmpty()) {
        git_libgit2_shutdown();
        return -1;
    }

    const int result = app.exec();
    git_libgit2_shutdown();
    return result;
}
