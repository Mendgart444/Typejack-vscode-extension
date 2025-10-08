"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode_1 = require("vscode");
const child_process_1 = require("child_process");
const node_1 = require("vscode-languageclient/node");
let client;
// ------------------------------------------------------------
// Hilfsfunktionen
// ------------------------------------------------------------
function getTypejackPath() {
    const configPath = vscode_1.workspace.getConfiguration('typejack').get('path');
    if (configPath && configPath.trim() !== '') {
        return configPath;
    }
    return 'typejack'; // fallback: im PATH
}
function getLanguageServerPath() {
    const configPath = vscode_1.workspace.getConfiguration('typejack').get('serverPath');
    if (configPath && configPath.trim() !== '') {
        return configPath;
    }
    return 'typejack-ls'; // fallback
}
function isTypejackInstalled() {
    const typejackPath = getTypejackPath();
    return new Promise((resolve) => {
        (0, child_process_1.exec)(`"${typejackPath}" --version`, (error) => {
            resolve(!error);
        });
    });
}
// ------------------------------------------------------------
// Aktivierung der Extension
// ------------------------------------------------------------
function activate(context) {
    const outputChannel = vscode_1.window.createOutputChannel('Typejack Support');
    outputChannel.appendLine('Starting Typejack Language Server...');
    // StatusBar Items
    const statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(rocket) Typejack active';
    statusBarItem.tooltip = 'Typejack LSP is running';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    const buildButton = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 99);
    buildButton.text = '$(gear) Build Project';
    buildButton.tooltip = 'Build Typejack Project';
    buildButton.command = 'typejack.build';
    buildButton.hide();
    context.subscriptions.push(buildButton);
    // Build Command
    const buildCommand = vscode_1.commands.registerCommand('typejack.build', async () => {
        const typejackPath = getTypejackPath();
        const cwd = vscode_1.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        await vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: 'Typejack Build',
            cancellable: false
        }, async () => {
            return new Promise((resolve) => {
                (0, child_process_1.exec)(`"${typejackPath}" build`, { cwd }, (error, _stdout, stderr) => {
                    if (error) {
                        vscode_1.window.showErrorMessage('Typejack build failed: ' + stderr);
                    }
                    else {
                        vscode_1.window.showInformationMessage('Typejack build succeeded!');
                    }
                    resolve();
                });
            });
        });
    });
    context.subscriptions.push(buildCommand);
    // Show build button only if Typejack is installed
    isTypejackInstalled().then((installed) => {
        if (installed) {
            buildButton.show();
        }
        else {
            vscode_1.window.showWarningMessage('Typejack not found. Set `typejack.path` in settings if needed.');
        }
    });
    // ------------------------------------------------------------
    // LSP-Client Start
    // ------------------------------------------------------------
    const serverExe = getLanguageServerPath();
    const serverOptions = {
        run: { command: serverExe, args: [] },
        debug: { command: serverExe, args: [] }
    };
    const clientOptions = {
        documentSelector: [{ scheme: 'file', language: 'typescript' }],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.ts')
        },
        outputChannel, // 🔹 loggt Serverausgaben in dein Panel
    };
    client = new node_1.LanguageClient('typejack-support', 'Typejack Support', serverOptions, clientOptions);
    client.start();
    outputChannel.appendLine('Typejack Language Server started!');
}
function deactivate() {
    if (!client)
        return undefined;
    return client.stop();
}
//# sourceMappingURL=extension.js.map