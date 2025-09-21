"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const child_process_1 = require("child_process");
const node_1 = require("vscode-languageclient/node");
let client;
function getTypejackPath() {
    const configPath = vscode_1.workspace.getConfiguration('typejack').get('path');
    if (configPath && configPath.trim() !== '') {
        return configPath;
    }
    return 'typejack';
}
function isTypejackInstalled() {
    const typejackPath = getTypejackPath();
    return new Promise((resolve) => {
        (0, child_process_1.exec)(`"${typejackPath}" --version`, (error) => {
            resolve(!error);
        });
    });
}
function activate(context) {
    const outputChannel = vscode_1.window.createOutputChannel("Typejack Support");
    outputChannel.appendLine("Starting server...");
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    isTypejackInstalled().then(installed => {
        if (installed) {
            buildButton.show();
        }
        else {
            vscode_1.window.showWarningMessage('Typejack is not installed or not found in PATH. Set "typejack.path" in your settings if needed.');
        }
    });
    const statusBarItem = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 100);
    statusBarItem.text = 'Typejack is active';
    statusBarItem.tooltip = 'Typejack Support is running';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);
    const buildButton = vscode_1.window.createStatusBarItem(vscode_1.StatusBarAlignment.Left, 99);
    buildButton.text = '$(gear) Build Project';
    buildButton.tooltip = 'Build Typejack Project';
    buildButton.command = 'typejack.build';
    buildButton.hide();
    context.subscriptions.push(buildButton);
    const buildCommand = vscode_1.commands.registerCommand('typejack.build', async () => {
        const typejackPath = getTypejackPath();
        const cwd = vscode_1.workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        vscode_1.window.withProgress({
            location: vscode_1.ProgressLocation.Notification,
            title: 'Typejack Build',
            cancellable: false
        }, async () => {
            return new Promise((resolve) => {
                (0, child_process_1.exec)(`"${typejackPath}" build`, { cwd }, (error, stdout, stderr) => {
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
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
        }
    };
    // Options to control the language client
    const clientOptions = {
        // Nur für die Datei typejack.toml aktiv
        documentSelector: [
            { scheme: 'file', language: 'toml', pattern: '**/typejack.toml' }
        ],
        synchronize: {
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/.clientrc')
        }
    };
    // Create the language client and start the client.
    client = new node_1.LanguageClient('languageServerExample', 'Language Server Example', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
    outputChannel.appendLine("Server started!");
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map