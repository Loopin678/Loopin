// The real Link to Task dialog (ChangeInboxView.qml) against a fake backend
#include <QtTest>
#include <QJsonArray>
#include <QJsonObject>
#include <QProcess>
#include <QQmlApplicationEngine>
#include <QQuickStyle>
#include <QTemporaryDir>
#include <git2.h>
#include "FakeBackend.h"

class TestLinkTask : public QObject {
    Q_OBJECT

    QTemporaryDir m_tmp;
    FakeBackend m_backend;
    QHash<QString, QStringList> m_links;  // commit sha -> task ids, as the server stores them
    bool m_rejectNext = false;
    QQmlApplicationEngine* m_engine = nullptr;
    QObject *m_window = nullptr, *m_api = nullptr, *m_inbox = nullptr, *m_dialog = nullptr;
    QString m_sha, m_message;

    QObject* findByProperty(const char* name, const QString& value) {
        for (QObject* o : m_window->findChildren<QObject*>())
            if (o->property(name).toString() == value) return o;
        return nullptr;
    }

    void openDialog() {
        m_dialog->setProperty("targetSha", m_sha);
        m_dialog->setProperty("targetMessage", m_message);
        QMetaObject::invokeMethod(m_dialog, "open");
        QTRY_VERIFY(m_dialog->property("opened").toBool());
    }
    void toggle(const QString& taskId, bool on) {
        QMetaObject::invokeMethod(m_dialog, "toggle", Q_ARG(QVariant, taskId), Q_ARG(QVariant, on));
    }

private slots:
    void initTestCase() {
        git_libgit2_init();
        QQuickStyle::setStyle("Fusion");

        // Fake Loopin backend
        m_backend.onJson("GET /api/projects/p1/tasks", 200,
            "[{\"id\":\"t1\",\"title\":\"Login form\"},{\"id\":\"t2\",\"title\":\"Password reset\"},{\"id\":\"t3\",\"title\":\"Docs\"}]");
        m_backend.on("GET /api/projects/p1/commits", [this](const FakeRequest&) {
            QJsonArray out;
            for (auto it = m_links.cbegin(); it != m_links.cend(); ++it) {
                QJsonArray tasks;
                for (const QString& id : it.value()) tasks.append(QJsonObject{{"id", id}, {"title", id}});
                out.append(QJsonObject{{"id", it.key()}, {"tasks", tasks}});
            }
            return FakeResponse{200, QJsonDocument(out).toJson()};
        });
        m_backend.on("POST /api/commits", [this](const FakeRequest& r) {
            if (m_rejectNext) {
                m_rejectNext = false;
                return FakeResponse{403, "{\"message\":\"User ID is not an active member of this project.\"}"};
            }
            const QJsonObject body = r.json().object();
            QStringList ids;
            for (const QJsonValue& v : body.value("taskIds").toArray()) ids << v.toString();
            m_links[body.value("sha").toString()] = ids;
            return FakeResponse{201, "{}"};
        });

        // A repository with one commit to link
        QProcess p;
        p.setWorkingDirectory(m_tmp.path());
        p.start("bash", {"-c", "git init -q -b main && git -c user.email=a@b -c user.name=A commit -q --allow-empty -m 'feat: add login form'"});
        QVERIFY(p.waitForFinished());

        m_engine = new QQmlApplicationEngine(this);
        m_engine->load(QUrl(QFile::exists(":/qt/qml/App/LinkTaskHarness.qml") ? "qrc:/qt/qml/App/LinkTaskHarness.qml" : "qrc:/App/LinkTaskHarness.qml"));
        QVERIFY(!m_engine->rootObjects().isEmpty());
        m_window = m_engine->rootObjects().first();
        m_api = m_window->property("api").value<QObject*>();
        m_inbox = m_window->property("inbox").value<QObject*>();
        QObject* repo = m_window->property("repo").value<QObject*>();

        bool opened = false;
        QMetaObject::invokeMethod(repo, "openRepository", Q_RETURN_ARG(bool, opened), Q_ARG(QString, m_tmp.path()));
        QVERIFY(opened);
        QVariantList history;
        QMetaObject::invokeMethod(repo, "commitHistory", Q_RETURN_ARG(QVariantList, history), Q_ARG(int, 1));
        m_sha = history.first().toMap().value("fullSha").toString();
        m_message = history.first().toMap().value("message").toString();

        m_dialog = findByProperty("title", "Link Commit to Task");
        QVERIFY(m_dialog);
    }

    void explainsSigningIn() {
        m_api->setProperty("backendUrl", m_backend.url());
        m_api->setProperty("projectId", "p1");
        m_api->setProperty("authToken", "");
        openDialog();
        toggle("t1", true);
        QMetaObject::invokeMethod(m_dialog, "accept");
        QTRY_VERIFY(m_inbox->property("opsStatus").toString().contains("Sign in to Loopin"));
        QVERIFY(m_links.isEmpty());
    }

    void loadsTasks() {
        m_api->setProperty("authToken", "lpn_test");
        QMetaObject::invokeMethod(m_api, "fetchTasks");
        QMetaObject::invokeMethod(m_api, "fetchProjectCommits");
        QTRY_COMPARE(m_window->property("availableTasks").toList().size(), 3);
    }

    void keepsSelectionsHiddenBySearch() {
        openDialog();
        toggle("t1", true);
        QObject* search = findByProperty("placeholderText", "Type to search tasks...");
        QVERIFY(search);
        search->setProperty("text", "reset");
        QCOMPARE(m_dialog->property("filteredTasks").toList().size(), 1);
        toggle("t2", true);
        QCOMPARE(m_dialog->property("selectedCount").toInt(), 2);
        QMetaObject::invokeMethod(m_dialog, "accept");

        // The task hidden by the search is saved too (the old dialog dropped it)
        QTRY_COMPARE(m_links.value(m_sha), (QStringList{"t1", "t2"}));
        QVERIFY(m_inbox->property("opsStatus").toString().contains("Task links saved"));
    }

    void usesTheFullShaAndRealMessage() {
        // The last POST (a GET of the commit list follows every save)
        QJsonObject body;
        for (const FakeRequest& r : m_backend.requests)
            if (r.method == "POST") body = r.json().object();
        QCOMPARE(body.value("sha").toString().size(), 40);
        QCOMPARE(body.value("message").toString(), QString("feat: add login form"));
    }

    void historyFindsLinksByFullSha() {
        QTRY_VERIFY(m_window->property("linkedCommits").toMap().contains(m_sha));
        QVariant ids;
        QMetaObject::invokeMethod(m_inbox, "linkedTaskIds", Q_RETURN_ARG(QVariant, ids), Q_ARG(QVariant, m_sha));
        QStringList list = ids.value<QJSValue>().toVariant().toStringList();
        list.sort();
        QCOMPARE(list, (QStringList{"t1", "t2"}));
    }

    void reopeningShowsExistingLinksAndCanUnlink() {
        openDialog();
        QCOMPARE(m_dialog->property("selectedCount").toInt(), 2);
        toggle("t1", false);
        QMetaObject::invokeMethod(m_dialog, "accept");
        QTRY_COMPARE(m_links.value(m_sha), QStringList{"t2"});
    }

    void rollsBackWhenTheServerRefuses() {
        m_rejectNext = true;
        openDialog();
        toggle("t3", true);
        QMetaObject::invokeMethod(m_dialog, "accept");
        QTRY_VERIFY(m_inbox->property("opsStatus").toString().contains("not an active member"));
        // The optimistic link is replaced by what the server actually has
        QTRY_COMPARE(m_window->property("linkedCommits").toMap().value(m_sha).toStringList(), QStringList{"t2"});
    }

    void cleanupTestCase() { git_libgit2_shutdown(); }
};

QTEST_MAIN(TestLinkTask)
#include "tst_linktask.moc"
