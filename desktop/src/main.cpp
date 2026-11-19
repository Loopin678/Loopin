#include <QFile>
#include <QFont>
#include <QFontDatabase>
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

    // Website look: Inter + JetBrains Mono, and our own control style (qml/Loopin)
    // on top of Basic, which draws anything the style doesn't override.
    QFontDatabase::addApplicationFont(QStringLiteral(":/fonts/Inter.ttf"));
    QFontDatabase::addApplicationFont(QStringLiteral(":/fonts/JetBrainsMono-Regular.ttf"));
    QFont appFont(QStringLiteral("Inter"));
    appFont.setPixelSize(13);
    QGuiApplication::setFont(appFont);
    QQuickStyle::setStyle(QStringLiteral("Loopin"));
    QQuickStyle::setFallbackStyle(QStringLiteral("Basic"));
    QQmlApplicationEngine engine;
    engine.addImportPath(QStringLiteral(":/"));  // finds the Loopin style
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
