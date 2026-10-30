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
            api.setAuthToken("lpn_test-token");
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

    void linkingWhileSignedOutSaysWhatToDo() {
        Fixture f;
        f.api.setAuthToken("");
        QSignalSpy errors(&f.api, &ApiClient::backendError);
        f.api.reportCommit(SHA, "msg", {"t1"});
        QCOMPARE(errors.count(), 1);
        QVERIFY(errors.first().first().toString().contains("Sign in to Loopin"));
        QVERIFY(f.backend.requests.isEmpty());
    }

    void sendsTheSignInTokenOnEveryBackendCall() {
        Fixture f;
        f.backend.onJson("GET /api/projects/p1/tasks", 200, "[]");
        f.backend.onJson("GET /api/projects/p1/commits", 200, "[]");
        QSignalSpy tasks(&f.api, &ApiClient::tasksReady);
        QSignalSpy commits(&f.api, &ApiClient::projectCommitsReady);
        f.api.fetchTasks();
        f.api.fetchProjectCommits();
        QVERIFY(tasks.wait(5000));
        if (commits.isEmpty()) QVERIFY(commits.wait(5000));
        for (const FakeRequest& r : f.backend.requests)
            QCOMPARE(r.headers.value("authorization"), QByteArray("Bearer lpn_test-token"));
    }

    void signsOutWhenTheTokenIsRejected() {
        // e.g. revoked on the website: Profile -> Connected apps -> Sign out
        Fixture f;
        f.backend.onJson("GET /api/projects/p1/tasks", 401, "{\"message\":\"This sign-in was revoked\"}");
        QSignalSpy signedOut(&f.api, &ApiClient::signedOut);
        f.api.fetchTasks();
        QVERIFY(signedOut.wait(5000));
        QVERIFY(f.api.authToken().isEmpty());
        QVERIFY(signedOut.first().first().toString().contains("Sign in again"));
    }

    void signInFlow() {
        Fixture f;
        f.api.setAuthToken("");
        int polls = 0;
        f.backend.on("POST /api/auth/device", [](const FakeRequest& r) {
            Q_ASSERT(r.json().object().value("clientName").toString() == "Loopin Desktop on test");
            return FakeResponse{200, "{\"deviceCode\":\"dev-123\",\"userCode\":\"WXYZ-BCDF\","
                                     "\"verificationUriComplete\":\"http://site/connect?code=WXYZ-BCDF\",\"interval\":1}"};
        });
        f.backend.on("POST /api/auth/device/token", [&polls](const FakeRequest& r) {
            Q_ASSERT(r.json().object().value("deviceCode").toString() == "dev-123");
            if (++polls < 2) return FakeResponse{400, "{\"error\":\"authorization_pending\"}"};
            return FakeResponse{200, "{\"token\":\"lpn_new\",\"user\":{\"id\":\"u9\",\"name\":\"Ada\",\"username\":\"ada\"}}"};
        });

        QSignalSpy code(&f.api, &ApiClient::signInCodeReady);
        QSignalSpy signedIn(&f.api, &ApiClient::signedIn);
        f.api.startSignIn("Loopin Desktop on test");
        QVERIFY(code.wait(5000));
        QCOMPARE(code.first().at(0).toString(), QString("WXYZ-BCDF"));
        QVERIFY(f.api.signingIn());

        QVERIFY(signedIn.wait(10000));
        QCOMPARE(f.api.authToken(), QString("lpn_new"));
        QCOMPARE(f.api.userId(), QString("u9"));
        QVERIFY(!f.api.signingIn());
        QCOMPARE(polls, 2);
    }

    void signInDeclinedOnTheWebsite() {
        Fixture f;
        f.api.setAuthToken("");
        f.backend.onJson("POST /api/auth/device", 200, "{\"deviceCode\":\"d\",\"userCode\":\"C\",\"interval\":1}");
        f.backend.onJson("POST /api/auth/device/token", 400, "{\"error\":\"access_denied\"}");
        QSignalSpy failed(&f.api, &ApiClient::signInFailed);
        f.api.startSignIn("x");
        QVERIFY(failed.wait(10000));
        QVERIFY(failed.first().first().toString().contains("declined"));
        QVERIFY(f.api.authToken().isEmpty());
        QVERIFY(!f.api.signingIn());
    }

    void signOutRevokesTheTokenOnTheServer() {
        Fixture f;
        f.backend.on("DELETE /api/auth/tokens/current", [](const FakeRequest&) { return FakeResponse{204, ""}; });
        QSignalSpy out(&f.api, &ApiClient::signedOut);
        f.api.signOut();
        QCOMPARE(out.count(), 1);
        QVERIFY(f.api.authToken().isEmpty());
        QTRY_COMPARE(f.backend.requests.size(), 1);
        QCOMPARE(f.backend.requests.first().headers.value("authorization"), QByteArray("Bearer lpn_test-token"));
    }

    void loadsMyProjects() {
        Fixture f;
        f.backend.onJson("GET /api/projects", 200, "{\"projects\":[{\"id\":\"p1\",\"name\":\"Apollo\"}]}");
        QSignalSpy ready(&f.api, &ApiClient::projectsReady);
        f.api.fetchProjects();
        QVERIFY(ready.wait(5000));
        QCOMPARE(ready.first().first().toJsonArray().first().toObject().value("name").toString(), QString("Apollo"));
    }

    void discoversTheBackendAddress() {
        FakeBackend announcer;
        announcer.onJson("GET /backend.json", 200, "{\"url\":\"https://example.trycloudflare.com\"}");
        ApiClient api;
        QSignalSpy found(&api, &ApiClient::backendUrlDiscovered);
        api.discoverBackendUrl(announcer.url() + "/backend.json");
        QVERIFY(found.wait(5000));
        QCOMPARE(api.backendUrl(), QString("https://example.trycloudflare.com"));

        // Server not running yet: the file says null
        announcer.onJson("GET /backend.json", 200, "{\"url\":null}");
        QSignalSpy errors(&api, &ApiClient::backendError);
        api.discoverBackendUrl(announcer.url() + "/backend.json");
        QVERIFY(errors.wait(5000));
        QVERIFY(errors.first().first().toString().contains("offline"));
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
        QVERIFY2(!body.contains("authorId"), "the author comes from the sign-in token");

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
