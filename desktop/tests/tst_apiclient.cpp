// ApiClient against an in-process fake backend (see FakeBackend.h)
#include <QtTest>
#include <QJsonArray>
#include <QJsonObject>
#include "ApiClient.h"
#include "FakeBackend.h"

static const QString SHA = QStringLiteral("0123456789abcdef0123456789abcdef01234567");

class TestApiClient : public QObject {
    Q_OBJECT

    // An ApiClient wired to a fresh fake backend
    struct Fixture {
        FakeBackend backend;
        ApiClient api;
        Fixture() {
            api.setBackendUrl(backend.url());
            api.setProjectId("p1");
            api.setUserId("u1");
        }
    };

private slots:
    void fetchesTasks() {
        Fixture f;
        f.backend.onJson("GET /api/projects/p1/tasks", 200, "[{\"id\":\"t1\",\"title\":\"One\"},{\"id\":\"t2\",\"title\":\"Two\"}]");
        QSignalSpy ready(&f.api, &ApiClient::tasksReady);
        f.api.fetchTasks();
        QVERIFY(ready.wait(5000));
        QCOMPARE(ready.first().first().toJsonArray().size(), 2);
    }

    void reportsTaskLoadingErrorsWithTheServersMessage() {
        Fixture f;
        f.backend.onJson("GET /api/projects/p1/tasks", 403, "{\"message\":\"You are not a member of this project\"}");
        QSignalSpy errors(&f.api, &ApiClient::backendError);
        f.api.fetchTasks();
        QVERIFY(errors.wait(5000));
        QVERIFY(errors.first().first().toString().contains("You are not a member of this project"));
    }

    void explainsAnUnreachableBackend() {
        ApiClient api;
        api.setBackendUrl("http://127.0.0.1:1");  // nothing listens on port 1
        api.setProjectId("p1");
        QSignalSpy errors(&api, &ApiClient::backendError);
        api.fetchTasks();
        QVERIFY(errors.wait(5000));
        QVERIFY(errors.first().first().toString().contains("Settings"));
    }

    void linkingWithoutIdsSaysWhatToFill() {
        Fixture f;
        f.api.setUserId("");
        QSignalSpy errors(&f.api, &ApiClient::backendError);
        f.api.reportCommit(SHA, "msg", {"t1"});
        QCOMPARE(errors.count(), 1);
        QVERIFY(errors.first().first().toString().contains("User ID"));
        QVERIFY(f.backend.requests.isEmpty());
    }

    void reportsCommitsWithTheCompleteTaskSet() {
        Fixture f;
        f.backend.onJson("POST /api/commits", 201, "{\"id\":\"x\"}");
        QSignalSpy reported(&f.api, &ApiClient::commitReported);

        f.api.reportCommit(SHA, "feat: login", {"t1", "t2"});
        QVERIFY(reported.wait(5000));
        QCOMPARE(reported.first().first().toString(), SHA);

        const QJsonObject body = f.backend.requests.last().json().object();
        QCOMPARE(body.value("sha").toString(), SHA);
        QCOMPARE(body.value("message").toString(), QString("feat: login"));
        QCOMPARE(body.value("taskIds").toArray().size(), 2);

        // An empty list is still sent: it means "unlink everything"
        reported.clear();
        f.api.reportCommit(SHA, "feat: login", {});
        QVERIFY(reported.wait(5000));
        QVERIFY(f.backend.requests.last().json().object().value("taskIds").isArray());
    }

    void onlyClaimsSuccessWhenTheServerAccepted() {
        Fixture f;
        f.backend.onJson("POST /api/commits", 403, "{\"message\":\"User ID is not an active member of this project.\"}");
        QSignalSpy reported(&f.api, &ApiClient::commitReported);
        QSignalSpy errors(&f.api, &ApiClient::backendError);
        f.api.reportCommit(SHA, "x", {"t1"});
        QVERIFY(errors.wait(5000));
        QVERIFY(errors.first().first().toString().contains("not an active member"));
        QCOMPARE(reported.count(), 0);
    }

    void sendsOnlySelectedFilesToTheAi() {
        FakeBackend ollama;
        qputenv("OLLAMA_HOST", ollama.url().toUtf8());
        ollama.onJson("POST /api/chat", 200, "{\"message\":{\"content\":\"[{\\\"message\\\":\\\"feat: a\\\",\\\"files\\\":[\\\"a.txt\\\"]}]\"}}");

        ApiClient api;
        api.setAiProvider("ollama");
        QSignalSpy groups(&api, &ApiClient::commitGroupsReady);
        QJsonArray changes{
            QJsonObject{{"filePath", "a.txt"}, {"patch", "+a"}, {"selected", true}},
            QJsonObject{{"filePath", "secret.env"}, {"patch", "+KEY=1"}, {"selected", false}},
        };
        api.requestCommitGroups(changes, "");
        QVERIFY(groups.wait(5000));
        QCOMPARE(groups.first().first().toJsonArray().size(), 1);

        const QString sent = QString::fromUtf8(ollama.requests.last().body);
        QVERIFY(sent.contains("a.txt"));
        QVERIFY2(!sent.contains("secret.env"), "deselected files must not be sent to the AI");
        qunsetenv("OLLAMA_HOST");
    }

    void refusesToGroupWhenNothingIsSelected() {
        ApiClient api;
        QSignalSpy failed(&api, &ApiClient::requestFailed);
        api.requestCommitGroups(QJsonArray{QJsonObject{{"filePath", "a"}, {"selected", false}}}, "");
        QVERIFY(failed.wait(2000));
        QVERIFY(failed.first().first().toString().contains("No files"));
    }

    void ollamaMergeRequestsDisableStreaming() {
        // Without stream:false Ollama streams NDJSON, the result parsed as ""
        // and the conflicted file was overwritten with nothing
        FakeBackend ollama;
        qputenv("OLLAMA_HOST", ollama.url().toUtf8());
        ollama.onJson("POST /api/chat", 200, "{\"message\":{\"content\":\"resolved\\n\"}}");

        ApiClient api;
        api.setAiProvider("ollama");
        QSignalSpy resolved(&api, &ApiClient::mergeResolutionReady);
        api.requestMergeResolution("c.txt", "<<<<<<< a\nx\n=======\ny\n>>>>>>> b\n", "keep both");
        QVERIFY(resolved.wait(5000));
        QCOMPARE(resolved.first().at(1).toString(), QString("resolved\n"));
        QCOMPARE(ollama.requests.last().json().object().value("stream").toBool(true), false);
        qunsetenv("OLLAMA_HOST");
    }

    void emptyAiMergeAnswersAreErrorsNotResolutions() {
        FakeBackend ollama;
        qputenv("OLLAMA_HOST", ollama.url().toUtf8());
        ollama.onJson("POST /api/chat", 200, "{\"message\":{\"content\":\"   \"}}");

        ApiClient api;
        api.setAiProvider("ollama");
        QSignalSpy resolved(&api, &ApiClient::mergeResolutionReady);
        QSignalSpy failed(&api, &ApiClient::requestFailed);
        api.requestMergeResolution("c.txt", "conflict", "keep both");
        QVERIFY(failed.wait(5000));
        QCOMPARE(resolved.count(), 0);
        qunsetenv("OLLAMA_HOST");
    }
};

QTEST_GUILESS_MAIN(TestApiClient)
#include "tst_apiclient.moc"
