cmake_minimum_required(VERSION 3.21)
project(collab_desktop_client LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_AUTOMOC ON)

find_package(Qt6 REQUIRED COMPONENTS Core Gui Qml Quick Network)
find_package(PkgConfig REQUIRED)
pkg_check_modules(LIBGIT2 REQUIRED IMPORTED_TARGET libgit2)

qt_standard_project_setup(REQUIRES 6.2)

qt_add_executable(collab_desktop_client
    src/main.cpp
    src/auth/GitHubAuth.cpp
    src/git/GitRepo.cpp
    src/git/DiffModel.cpp
    src/backend/ApiClient.cpp
    src/watcher/ChangeWatcher.cpp
)

qt_add_qml_module(collab_desktop_client
    URI App
    VERSION 1.0
    QML_FILES
        qml/main.qml
        qml/LoginView.qml
        qml/ChangeInboxView.qml
        qml/CommitReviewView.qml
)

target_include_directories(collab_desktop_client PRIVATE
    src
    src/auth
    src/git
    src/backend
    src/watcher
)

target_link_libraries(collab_desktop_client PRIVATE
    Qt6::Core
    Qt6::Gui
    Qt6::Qml
    Qt6::Quick
    Qt6::Network
    PkgConfig::LIBGIT2
)
