# Desktop tests: build with -DLOOPIN_BUILD_TESTS=ON, run with ctest.
# They run headless (QT_QPA_PLATFORM=offscreen) and need no network.
find_package(Qt6 REQUIRED COMPONENTS Test)

set(LOOPIN_CORE_SOURCES
    ${PROJECT_SOURCE_DIR}/src/git/GitRepo.cpp
    ${PROJECT_SOURCE_DIR}/src/git/DiffModel.cpp
    ${PROJECT_SOURCE_DIR}/src/backend/ApiClient.cpp
    ${PROJECT_SOURCE_DIR}/src/watcher/ChangeWatcher.cpp
)
set(LOOPIN_CORE_INCLUDES
    ${PROJECT_SOURCE_DIR}/src/git
    ${PROJECT_SOURCE_DIR}/src/backend
    ${PROJECT_SOURCE_DIR}/src/watcher
    ${CMAKE_CURRENT_SOURCE_DIR}
)

function(loopin_add_test name)
    add_test(NAME ${name} COMMAND ${name})
    set_tests_properties(${name} PROPERTIES ENVIRONMENT "QT_QPA_PLATFORM=offscreen;LANGUAGE=en" TIMEOUT 120)
endfunction()

# Git behaviour (needs the git command line tool)
qt_add_executable(tst_gitrepo tst_gitrepo.cpp ${LOOPIN_CORE_SOURCES})
target_include_directories(tst_gitrepo PRIVATE ${LOOPIN_CORE_INCLUDES})
target_link_libraries(tst_gitrepo PRIVATE Qt6::Test Qt6::Core Qt6::Qml Qt6::Network Qt6::Concurrent PkgConfig::LIBGIT2)
loopin_add_test(tst_gitrepo)

# Backend client against a fake in-process server
qt_add_executable(tst_apiclient tst_apiclient.cpp ${LOOPIN_CORE_SOURCES})
target_include_directories(tst_apiclient PRIVATE ${LOOPIN_CORE_INCLUDES})
target_link_libraries(tst_apiclient PRIVATE Qt6::Test Qt6::Core Qt6::Qml Qt6::Network Qt6::Concurrent PkgConfig::LIBGIT2)
loopin_add_test(tst_apiclient)

# The real ChangeInboxView QML (Link to Task dialog) driven against the fake server.
# Its own QML module "App" holding the app's QML files plus a small harness window.
qt_add_executable(tst_linktask tst_linktask.cpp ${LOOPIN_CORE_SOURCES})
set_source_files_properties(${PROJECT_SOURCE_DIR}/qml/Theme.qml PROPERTIES QT_QML_SINGLETON_TYPE TRUE QT_RESOURCE_ALIAS Theme.qml)
set_source_files_properties(${PROJECT_SOURCE_DIR}/qml/ChangeInboxView.qml PROPERTIES QT_RESOURCE_ALIAS ChangeInboxView.qml)
qt_add_qml_module(tst_linktask
    URI App
    VERSION 1.0
    # Separate from the app's own "App" module output in the build tree
    OUTPUT_DIRECTORY ${CMAKE_CURRENT_BINARY_DIR}/qml/App
    QML_FILES ${PROJECT_SOURCE_DIR}/qml/ChangeInboxView.qml ${PROJECT_SOURCE_DIR}/qml/Theme.qml LinkTaskHarness.qml
)
target_include_directories(tst_linktask PRIVATE ${LOOPIN_CORE_INCLUDES})
target_link_libraries(tst_linktask PRIVATE Qt6::Test Qt6::Core Qt6::Gui Qt6::Qml Qt6::Quick Qt6::QuickControls2
    Qt6::Network Qt6::Concurrent PkgConfig::LIBGIT2)
loopin_add_test(tst_linktask)
