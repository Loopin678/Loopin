// GitRepo against real throwaway repositories (a local bare repo stands in for GitHub)
#include <QtTest>
#include <QProcess>
#include <QTemporaryDir>
#include <git2.h>
#include "GitRepo.h"

class TestGitRepo : public QObject {
    Q_OBJECT

    QTemporaryDir m_tmp;
    QString m_work;

    QString sh(const QString& cmd, const QString& dir = {}) {
        QProcess p;
        p.setWorkingDirectory(dir.isEmpty() ? m_work : dir);
        p.start("bash", {"-c", cmd});
        p.waitForFinished(30000);
        return QString::fromUtf8(p.readAllStandardOutput()).trimmed();
    }

    // Fresh repo with one pushed commit, for every test
    void freshRepo(GitRepo& repo) {
        const QString base = m_tmp.path() + "/" + QString::number(QDateTime::currentMSecsSinceEpoch()) + QTest::currentTestFunction();
        QDir().mkpath(base);
        m_work = base + "/work";
        sh("git init -q --bare -b main remote.git && git init -q -b main work", base);
        sh("git config user.email t@t && git config user.name T && echo a>a.txt && echo b>b.txt"
           " && git add . && git commit -qm init && git remote add origin ../remote.git && git push -q origin main");
        QVERIFY(repo.openRepository(m_work));
    }

private slots:
    void initTestCase() {
        git_libgit2_init();
        QVERIFY(m_tmp.isValid());
        QVERIFY2(!QStandardPaths::findExecutable("git").isEmpty(), "git must be installed");
    }
    void cleanupTestCase() { git_libgit2_shutdown(); }

    void commitsOnlySelectedFilesEvenIfOthersAreStaged() {
        GitRepo repo; freshRepo(repo);
        sh("echo a2>>a.txt && echo b2>>b.txt && git add b.txt");
        QVERIFY(!repo.stageAndCommit({"a.txt"}, "only a").isEmpty());
        QCOMPARE(sh("git show --name-only --format= HEAD"), QString("a.txt"));
        QCOMPARE(sh("git diff --cached --name-only"), QString("b.txt"));
    }

    void refusesEmptyCommitsAndMessages() {
        GitRepo repo; freshRepo(repo);
        QString err;
        connect(&repo, &GitRepo::errorOccurred, this, [&](const QString& e) { err = e; });
        QVERIFY(repo.stageAndCommit({"a.txt"}, "nothing changed").isEmpty());
        QVERIFY(err.contains("Nothing to commit"));
        sh("echo x>>a.txt");
        QVERIFY(repo.stageAndCommit({"a.txt"}, "   ").isEmpty());
    }

    void commitsDeletionsAndNewFiles() {
        GitRepo repo; freshRepo(repo);
        sh("rm b.txt && echo n>new.txt");
        QVERIFY(!repo.stageAndCommit({"b.txt", "new.txt"}, "swap").isEmpty());
        QCOMPARE(sh("git show --name-status --format= HEAD | sort"), QString("A\tnew.txt\nD\tb.txt"));
    }

    void unpushedUsesFullShasAndCoversNeverPushedBranches() {
        GitRepo repo; freshRepo(repo);
        sh("echo x>>a.txt");
        const QString sha = repo.stageAndCommit({"a.txt"}, "local");
        QCOMPARE(repo.unpushedCommitShas("origin"), QStringList{sha});

        sh("git checkout -q -b feature && echo f>f.txt && git add f.txt && git commit -qm feat");
        repo.refreshDiff();
        QCOMPARE(repo.currentBranchName(), QString("feature"));
        QCOMPARE(repo.unpushedCommitShas("origin").size(), 2);
        QCOMPARE(repo.commitHistory(1).first().toMap().value("fullSha").toString().size(), 40);
    }

    void reportsRejectedPushesAsFailures() {
        GitRepo repo; freshRepo(repo);
        sh("echo x>>a.txt");
        const QString sha = repo.stageAndCommit({"a.txt"}, "mine");
        // Someone else pushes first
        const QString other = QFileInfo(m_work).path() + "/other";
        sh("git clone -q remote.git other && cd other && git -c user.email=o@o -c user.name=O commit -q --allow-empty -m theirs && git push -q origin main",
           QFileInfo(m_work).path());
        Q_UNUSED(other);

        QString err;
        connect(&repo, &GitRepo::errorOccurred, this, [&](const QString& e) { err = e; });
        QVERIFY(!repo.pushCurrentBranch(QString(), "origin"));
        QVERIFY2(err.contains("rejected") || err.contains("fetch first"), qPrintable(err));
        QVERIFY(repo.unpushedCommitShas("origin").contains(sha));
    }

    void pushUpToHereCreatesANewRemoteBranch() {
        GitRepo repo; freshRepo(repo);
        sh("git checkout -q -b feature && echo f>f.txt && git add f.txt && git commit -qm feat");
        repo.refreshDiff();
        const QString sha = repo.commitHistory(1).first().toMap().value("fullSha").toString();
        QVERIFY(repo.pushCommit(sha, "origin"));
        QCOMPARE(sh("git ls-remote origin refs/heads/feature | cut -f1"), sha);
    }

    void discardRevertsToHeadAndRemovesNewFiles() {
        GitRepo repo; freshRepo(repo);
        sh("echo zz>>a.txt && git add a.txt && echo new>new.txt");
        QVERIFY(repo.discardFileChanges("a.txt"));
        QVERIFY(sh("git status --porcelain a.txt").isEmpty());
        QVERIFY(repo.discardFileChanges("new.txt"));
        QVERIFY(!QFile::exists(m_work + "/new.txt"));
    }

    void stashesASingleNewFile() {
        GitRepo repo; freshRepo(repo);
        sh("echo u>u.txt");
        QVERIFY(repo.stashFile("u.txt"));
        QVERIFY(!QFile::exists(m_work + "/u.txt"));
        QCOMPARE(repo.stashList().size(), 1);
    }

    void deletesBranchesSafelyUnlessForced() {
        GitRepo repo; freshRepo(repo);
        sh("git branch unmerged && git checkout -q unmerged && git commit -q --allow-empty -m wip && git checkout -q main");
        QVERIFY(!repo.deleteBranch("unmerged"));
        QVERIFY(!sh("git branch --list unmerged").isEmpty());
        QVERIFY(repo.deleteBranch("unmerged", true));
        QVERIFY(sh("git branch --list unmerged").isEmpty());
    }

    void localBranchesExcludeRemoteOnes() {
        GitRepo repo; freshRepo(repo);
        sh("git checkout -q -b pushed && git push -q origin pushed && git checkout -q main && git branch -D -q pushed && git fetch -q origin");
        repo.refreshDiff();
        QVERIFY(repo.branches().contains("origin/pushed"));
        QVERIFY(!repo.localBranches().contains("origin/pushed"));
    }

    void conflictResolutionGuardsAndSides() {
        GitRepo repo; freshRepo(repo);
        sh("git checkout -q -b c1 && echo one>c.txt && git add c.txt && git commit -qm c1"
           " && git checkout -q main && echo two>c.txt && git add c.txt && git commit -qm c2");
        repo.refreshDiff();
        QSignalSpy conflicts(&repo, &GitRepo::mergeConflictDetected);
        QVERIFY(!repo.mergeBranch("c1"));
        QCOMPARE(conflicts.count(), 1);
        QCOMPARE(conflicts.first().first().toStringList(), QStringList{"c.txt"});

        QVERIFY(!repo.resolveConflictFile("c.txt", ""));
        QVERIFY(!repo.resolveConflictFile("c.txt", "<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> c1\n"));
        QVERIFY(repo.resolveConflictWithSide("c.txt", false));
        QCOMPARE(sh("cat c.txt"), QString("one"));
        QVERIFY(repo.commitResolvedMerge());
        QCOMPARE(sh("git log -1 --format=%p | wc -w"), QString("2"));
    }

    void writeFileKeepsLineEndings() {
        GitRepo repo; freshRepo(repo);
        QVERIFY(repo.writeFile("lf.txt", "a\nb\n"));
        QFile f(m_work + "/lf.txt");
        QVERIFY(f.open(QIODevice::ReadOnly));
        QCOMPARE(f.readAll(), QByteArray("a\nb\n"));
    }

    void failsCleanlyWithoutARepository() {
        GitRepo repo;
        QVERIFY(!repo.openRepository(m_tmp.path() + "/does-not-exist"));
        QVERIFY(!repo.isOpen());
        QVERIFY(repo.stageAndCommit({"a"}, "m").isEmpty());
        QVERIFY(repo.unpushedCommitShas().isEmpty());
    }
};

QTEST_GUILESS_MAIN(TestGitRepo)
#include "tst_gitrepo.moc"
