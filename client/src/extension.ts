import {
    workspace,
    ExtensionContext,
    window,
    StatusBarAlignment,
    commands,
    ProgressLocation
} from 'vscode';
import { exec } from 'child_process';

import {
    LanguageClient,
    LanguageClientOptions,
    ServerOptions
} from 'vscode-languageclient/node';

let client: LanguageClient;

// ------------------------------------------------------------
// Hilfsfunktionen
// ------------------------------------------------------------
function getTypejackPath(): string {
    const configPath = workspace.getConfiguration('typejack').get<string>('path');
    if (configPath && configPath.trim() !== '') {
        return configPath;
    }
    return 'typejack'; // fallback: im PATH
}

function getLanguageServerPath(): string {
    const configPath = workspace.getConfiguration('typejack').get<string>('serverPath');
    if (configPath && configPath.trim() !== '') {
        return configPath;
    }
    return 'typejack-ls'; // fallback
}

function isTypejackInstalled(): Promise<boolean> {
    const typejackPath = getTypejackPath();
    return new Promise((resolve) => {
        exec(`"${typejackPath}" --version`, (error) => {
            resolve(!error);
        });
    });
}

// ------------------------------------------------------------
// Aktivierung der Extension
// ------------------------------------------------------------
export function activate(context: ExtensionContext) {
    const outputChannel = window.createOutputChannel('Typejack Support');
    outputChannel.appendLine('Starting Typejack Language Server...');

    // StatusBar Items
    const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(rocket) Typejack active';
    statusBarItem.tooltip = 'Typejack LSP is running';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    const buildButton = window.createStatusBarItem(StatusBarAlignment.Left, 99);
    buildButton.text = '$(gear) Build Project';
    buildButton.tooltip = 'Build Typejack Project';
    buildButton.command = 'typejack.build';
    buildButton.hide();
    context.subscriptions.push(buildButton);

    // Build Command
    const buildCommand = commands.registerCommand('typejack.build', async () => {
        const typejackPath = getTypejackPath();
        const cwd = workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();

        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: 'Typejack Build',
                cancellable: false
            },
            async () => {
                return new Promise<void>((resolve) => {
                    exec(`"${typejackPath}" build`, { cwd }, (error, _stdout, stderr) => {
                        if (error) {
                            window.showErrorMessage('Typejack build failed: ' + stderr);
                        } else {
                            window.showInformationMessage('Typejack build succeeded!');
                        }
                        resolve();
                    });
                });
            }
        );
    });
    context.subscriptions.push(buildCommand);

    // Show build button only if Typejack is installed
    isTypejackInstalled().then((installed) => {
        if (installed) {
            buildButton.show();
        } else {
            window.showWarningMessage(
                'Typejack not found. Set `typejack.path` in settings if needed.'
            );
        }
    });

    // ------------------------------------------------------------
    // LSP-Client Start
    // ------------------------------------------------------------
    const serverExe = getLanguageServerPath();
    const serverOptions: ServerOptions = {
        run: { command: serverExe, args: [] },
        debug: { command: serverExe, args: [] }
    };

    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'typescript' }],
        synchronize: {
            fileEvents: workspace.createFileSystemWatcher('**/*.ts')
        },
        outputChannel, // 🔹 loggt Serverausgaben in dein Panel
    };

    client = new LanguageClient(
        'typejack-support',
        'Typejack Support',
        serverOptions,
        clientOptions
    );

    client.start();
    outputChannel.appendLine('Typejack Language Server started!');
}

export function deactivate(): Thenable<void> | undefined {
    if (!client) return undefined;
    return client.stop();
}
