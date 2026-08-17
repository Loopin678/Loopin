#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QUrl>

#include <git2.h>

int main(int argc, char* argv[]) {
    QGuiApplication app(argc, argv);
    QGuiApplication::setOrganizationName("YourCompany");
    QGuiApplication::setApplicationName("CollabDesktopClient");

    // Initialize libgit2 once for the whole process lifetime.
    git_libgit2_init();

    QQmlApplicationEngine engine;
    // NOTE: the exact qrc path Qt generates for a qt_add_qml_module can
    // differ between Qt versions (older ones use "/<URI>/...", 6.5+
    // often uses "/qt/qml/<URI>/..."). If this fails to load, run the
    // build once and check build/App/qmldir plus the generated .qrc
    // files under build/ to see the real path, or switch to
    // engine.loadFromModule("App", "Main") on Qt 6.5+.
    engine.load(QUrl(QStringLiteral("qrc:/App/qml/main.qml")));

    if (engine.rootObjects().isEmpty()) {
        git_libgit2_shutdown();
        return -1;
    }

    const int result = app.exec();
    git_libgit2_shutdown();
    return result;
}
