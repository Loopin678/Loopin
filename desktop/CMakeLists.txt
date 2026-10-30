cmake_minimum_required(VERSION 3.21)
project(loopin_desktop VERSION 0.1.1 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Qml Quick Network QuickControls2 Concurrent)
find_package(Qt6Keychain QUIET)
if(Qt6Keychain_FOUND)
    message(STATUS "Qt6Keychain found, using system keychain")
    add_compile_definitions(USE_QTKEYCHAIN)
    set(KEYCHAIN_LIBS qt6keychain)
else()
    message(STATUS "Qt6Keychain not found, using QSettings fallback for credential storage")
    set(KEYCHAIN_LIBS "")
endif()

find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBGIT2 REQUIRED IMPORTED_TARGET libgit2)

qt_standard_project_setup(REQUIRES 6.2)

set(LOOPIN_APP_ICON_RESOURCES "")
if(WIN32)
    # Embeds packaging/loopin.ico as the .exe icon
    set(LOOPIN_APP_ICON_RESOURCES packaging/loopin.rc)
elseif(APPLE)
    set(MACOSX_BUNDLE_ICON_FILE loopin.icns)
    set(LOOPIN_APP_ICON_RESOURCES ${CMAKE_CURRENT_SOURCE_DIR}/packaging/loopin.icns)
    set_source_files_properties(${LOOPIN_APP_ICON_RESOURCES} PROPERTIES MACOSX_PACKAGE_LOCATION Resources)
endif()

qt_add_executable(loopin_desktop
    src/main.cpp
    src/auth/GitHubAuth.cpp
    src/git/GitRepo.cpp
    src/git/DiffModel.cpp
    src/backend/ApiClient.cpp
    src/watcher/ChangeWatcher.cpp
    ${LOOPIN_APP_ICON_RESOURCES}
)

set_target_properties(loopin_desktop PROPERTIES
    WIN32_EXECUTABLE TRUE          # no console window behind the app on Windows
    MACOSX_BUNDLE TRUE
    MACOSX_BUNDLE_BUNDLE_NAME "Loopin"
    MACOSX_BUNDLE_GUI_IDENTIFIER "com.loopin.desktop"
    MACOSX_BUNDLE_BUNDLE_VERSION "${PROJECT_VERSION}"
    MACOSX_BUNDLE_SHORT_VERSION_STRING "${PROJECT_VERSION}"
)
target_compile_definitions(loopin_desktop PRIVATE LOOPIN_VERSION="${PROJECT_VERSION}")

# Window/taskbar icon at runtime
qt_add_resources(loopin_desktop "app_icon"
    PREFIX "/"
    BASE packaging
    FILES packaging/loopin.png
)

set_source_files_properties(qml/Theme.qml PROPERTIES QT_QML_SINGLETON_TYPE TRUE)
# Serve the QML files from the module root (qrc:/.../App/main.qml), not a qml/
# subfolder: a subfolder gets its own implicit directory import in which Theme is
# a plain type, and Qt 6.8 then fails with "Theme was a singleton at compile
# time, but is not a singleton anymore" (every Theme colour becomes undefined).
foreach(qml_file main LoginView ChangeInboxView CommitReviewView Theme)
    set_source_files_properties(qml/${qml_file}.qml PROPERTIES QT_RESOURCE_ALIAS ${qml_file}.qml)
endforeach()

qt_add_qml_module(loopin_desktop
    URI App
    VERSION 1.0
    QML_FILES
        qml/main.qml
        qml/LoginView.qml
        qml/ChangeInboxView.qml
        qml/CommitReviewView.qml
        qml/Theme.qml
)

target_include_directories(loopin_desktop PRIVATE
    src
    src/auth
    src/git
    src/backend
    src/watcher
)

target_link_libraries(loopin_desktop PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::QuickControls2
    Qt6::Network
    Qt6::Concurrent
    ${KEYCHAIN_LIBS}
    PkgConfig::LIBGIT2
)

# CLI Target
qt_add_executable(loopin_cli
    src_cli/main.cpp
    src/git/GitRepo.cpp
    src/git/DiffModel.cpp
    src/backend/ApiClient.cpp
)

target_include_directories(loopin_cli PRIVATE
    src
    src/git
    src/backend
)

target_link_libraries(loopin_cli PRIVATE
    Qt6::Core
    Qt6::Network
    Qt6::Qml
    PkgConfig::LIBGIT2
)

# ── Install rules (used by the release packaging) ──────────────────────
include(GNUInstallDirs)
install(TARGETS loopin_desktop loopin_cli
    BUNDLE DESTINATION .
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)
if(UNIX AND NOT APPLE)
    install(FILES packaging/loopin.desktop DESTINATION ${CMAKE_INSTALL_DATADIR}/applications)
    install(FILES packaging/loopin.png DESTINATION ${CMAKE_INSTALL_DATADIR}/icons/hicolor/256x256/apps)
endif()
