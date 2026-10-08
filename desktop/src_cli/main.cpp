#include <QCoreApplication>
#include <QCommandLineParser>
#include <QTimer>
#include <QFile>
#include <QTextStream>
#include <QStringList>
#include <QDebug>
#include <iostream>
#include "ApiClient.h"
#include "GitRepo.h"
#include <git2.h>

// Simple .env parser
void loadEnvFile() {
    QFile file(".env");
    if (file.open(QIODevice::ReadOnly | QIODevice::Text)) {
        QTextStream in(&file);
        while (!in.atEnd()) {
            QString line = in.readLine().trimmed();
            if (line.isEmpty() || line.startsWith("#")) continue;
            int idx = line.indexOf('=');
            if (idx > 0) {
                QString key = line.left(idx).trimmed();
                QString val = line.mid(idx + 1).trimmed();
                // Remove quotes if present
                if (val.startsWith('"') && val.endsWith('"')) {
                    val = val.mid(1, val.length() - 2);
                }
                qputenv(key.toLocal8Bit(), val.toLocal8Bit());
            }
        }
    }
}

int main(int argc, char *argv[])
{
    git_libgit2_init();

    QCoreApplication app(argc, argv);
    QCoreApplication::setApplicationName("loopin-cli");
    QCoreApplication::setApplicationVersion("1.0");

    loadEnvFile();

    QCommandLineParser parser;
    parser.setApplicationDescription("Loopin CLI - AI Git Assistant");
    parser.addHelpOption();
    parser.addVersionOption();
    parser.addPositionalArgument("command", "The command to run (e.g., merge-resolve, generate-gitignore).");
    parser.addPositionalArgument("args", "Arguments for the command.", "[args...]");

    parser.process(app);

    const QStringList args = parser.positionalArguments();
    if (args.isEmpty()) {
        parser.showHelp(1);
    }

    QString command = args.at(0);

    // Setup GitRepo
    GitRepo repo;
    if (!repo.openRepository(".")) {
        std::cerr << "Error: Not a git repository." << std::endl;
        return 1;
    }

    // Setup ApiClient
    ApiClient api;
    QString provider = qEnvironmentVariable("LOOPIN_AI_PROVIDER");
    if (provider.isEmpty()) provider = "gemini";
    api.setAiProvider(provider);
    
    QString apiKey = qEnvironmentVariable("LOOPIN_GEMINI_API_KEY");
    if (!apiKey.isEmpty()) {
        api.setGeminiApiKey(apiKey);
    }
    
    QString openRouterKey = qEnvironmentVariable("LOOPIN_OPENROUTER_API_KEY");
    if (!openRouterKey.isEmpty()) {
        api.setOpenRouterApiKey(openRouterKey);
    }

    if (command == "merge-resolve") {
        if (args.size() < 2) {
            std::cerr << "Usage: loopin-cli merge-resolve <filepath> [preference]" << std::endl;
            return 1;
        }
        QString filePath = args.at(1);
        QString preference = args.size() > 2 ? args.at(2) : "Intelligently merge both sets of changes.";

        QString content = repo.readFile(filePath);
        if (content.isEmpty()) {
            std::cerr << "Failed to read file: " << filePath.toStdString() << std::endl;
            return 1;
        }

        std::cout << "Resolving conflict in " << filePath.toStdString() << " using AI..." << std::endl;

        QObject::connect(&api, &ApiClient::mergeResolutionReady, [&](const QString& path, const QString& resolvedContent) {
            if (repo.resolveConflictFile(path, resolvedContent)) {
                std::cout << "Successfully resolved: " << path.toStdString() << std::endl;
                app.quit();
            } else {
                std::cerr << "Failed to save resolved file." << std::endl;
                app.exit(1);
            }
        });

        QObject::connect(&api, &ApiClient::requestFailed, [&](const QString& errorMsg) {
            std::cerr << "AI Request Failed: " << errorMsg.toStdString() << std::endl;
            app.exit(1);
        });

        api.requestMergeResolution(filePath, content, preference);
    }
    else if (command == "generate-gitignore") {
        QStringList files = repo.listAllFiles();
        if (files.isEmpty()) {
            std::cerr << "No files found in repository." << std::endl;
            return 1;
        }
        
        std::cout << "Analyzing " << files.size() << " files to generate .gitignore..." << std::endl;

        QObject::connect(&api, &ApiClient::gitignoreReady, [&](const QString& content) {
            std::cout << "\n--- Generated .gitignore ---\n" << content.toStdString() << "\n----------------------------" << std::endl;
            app.quit();
        });

        QObject::connect(&api, &ApiClient::requestFailed, [&](const QString& errorMsg) {
            std::cerr << "AI Request Failed: " << errorMsg.toStdString() << std::endl;
            app.exit(1);
        });

        api.generateGitignore(files);
    }
    else {
        std::cerr << "Unknown command: " << command.toStdString() << std::endl;
        parser.showHelp(1);
    }

    return app.exec();
}
