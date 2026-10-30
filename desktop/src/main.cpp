#include <QFile>
#include <QGuiApplication>
#include <QIcon>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QSysInfo>
#include <QSettings>
#include <QUrl>

#include <git2.h>
#include <QQuickStyle>

#ifndef LOOPIN_VERSION
#define LOOPIN_VERSION "dev"
#endif
#ifndef LOOPIN_DISCOVERY_URL
#define LOOPIN_DISCOVERY_URL ""
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
    engine.rootContext()->setContextProperty("loopinDiscoveryUrl", QStringLiteral(LOOPIN_DISCOVERY_URL));
    // Shown on the website's approval page and in Profile -> Connected apps
    engine.rootContext()->setContextProperty("loopinClientName",
        QStringLiteral("Loopin Desktop on %1").arg(QSysInfo::machineHostName()));
    // qt_add_qml_module puts the module under /qt/qml/ with policy QTP0001 NEW
    // (Qt 6.5+), or at the resource root with the older default
    const QString mainQml = QFile::exists(QStringLiteral(":/qt/qml/App/main.qml"))
        ? QStringLiteral("qrc:/qt/qml/App/main.qml")
        : QStringLiteral("qrc:/App/main.qml");
    engine.load(QUrl(mainQml));

    if (engine.rootObjects().isEmpty()) {
        git_libgit2_shutdown();
        return -1;
    }

    const int result = app.exec();
    git_libgit2_shutdown();
    return result;
}
