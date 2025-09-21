import * as path from 'path';
import { workspace, ExtensionContext, window, StatusBarAlignment, commands, ProgressLocation } from 'vscode';
import { exec } from 'child_process';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from 'vscode-languageclient/node';

let client: LanguageClient;

function getTypejackPath(): string {
	const configPath = workspace.getConfiguration('typejack').get<string>('path');
	if (configPath && configPath.trim() !== '') {
		return configPath;
	}

	return 'typejack';
}

function isTypejackInstalled(): Promise<boolean> {
	const typejackPath = getTypejackPath();
	return new Promise((resolve) => {
		exec(`"${typejackPath}" --version`, (error) => {
			resolve(!error);
		});
	});
}

export function activate(context: ExtensionContext) {
	const outputChannel = window.createOutputChannel("Typejack Support");
	outputChannel.appendLine("Starting server...");

	// The server is implemented in node
	const serverModule = context.asAbsolutePath(
		path.join('server', 'out', 'server.js')
	);

	isTypejackInstalled().then(installed => {
        if (installed) {
            buildButton.show();
        } else {
            window.showWarningMessage('Typejack is not installed or not found in PATH. Set "typejack.path" in your settings if needed.');
        }
    });

	const statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left, 100);
	statusBarItem.text = 'Typejack is active';
	statusBarItem.tooltip = 'Typejack Support is running';
	statusBarItem.show();
	context.subscriptions.push(statusBarItem);

	const buildButton = window.createStatusBarItem(StatusBarAlignment.Left, 99);
	buildButton.text = '$(gear) Build Project';
	buildButton.tooltip = 'Build Typejack Project';
	buildButton.command = 'typejack.build';
	buildButton.hide();
	context.subscriptions.push(buildButton);

	const buildCommand = commands.registerCommand('typejack.build', async () => {
        const typejackPath = getTypejackPath();
        const cwd = workspace.workspaceFolders?.[0]?.uri.fsPath || process.cwd();
        window.withProgress({
            location: ProgressLocation.Notification,
            title: 'Typejack Build',
            cancellable: false
        }, async () => {
            return new Promise<void>((resolve) => {
                exec(`"${typejackPath}" build`, { cwd }, (error, stdout, stderr) => {
                    if (error) {
                        window.showErrorMessage('Typejack build failed: ' + stderr);
                    } else {
                        window.showInformationMessage('Typejack build succeeded!');
                    }
                    resolve();
                });
            });
        });
    });
    context.subscriptions.push(buildCommand);

	// If the extension is launched in debug mode then the debug server options are used
	// Otherwise the run options are used
	const serverOptions: ServerOptions = {
		run: { module: serverModule, transport: TransportKind.ipc },
		debug: {
			module: serverModule,
			transport: TransportKind.ipc,
		}
	};

	// Options to control the language client
	const clientOptions: LanguageClientOptions = {
		// Nur für die Datei typejack.toml aktiv
		documentSelector: [
			{ scheme: 'file', language: 'toml', pattern: '**/typejack.toml' }
		],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
		}
	};

	// Create the language client and start the client.
	client = new LanguageClient(
		'languageServerExample',
		'Language Server Example',
		serverOptions,
		clientOptions
	);

	// Start the client. This will also launch the server
	client.start();
	outputChannel.appendLine("Server started!")
}

export function deactivate(): Thenable<void> | undefined {
	if (!client) {
		return undefined;
	}
	return client.stop();
}
