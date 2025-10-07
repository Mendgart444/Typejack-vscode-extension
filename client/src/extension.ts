import { workspace, ExtensionContext, window, StatusBarAlignment, commands, ProgressLocation } from 'vscode';
import { exec } from 'child_process';

import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
} from 'vscode-languageclient/node';

// begining of the code.

let client: LanguageClient;


// get the path to the typejack executable
function getTypejackPath(): string {
	const configPath = workspace.getConfiguration('typejack').get<string>('path');
	if (configPath && configPath.trim() !== '') {
		return configPath;
	}

	return 'typejack';
}
// check if typejack is installed and show the build button if it is
function isTypejackInstalled(): Promise<boolean> {
	const typejackPath = getTypejackPath();
	return new Promise((resolve) => {
		exec(`"${typejackPath}" --version`, (error) => {
			resolve(!error);
		});
	});
}

function getLanguageServerPath(): string {
	const configPath = workspace.getConfiguration('typejack').get<string>('serverPath');
	if (configPath && configPath.trim() !== '') {
        return configPath;
    }

	return 'typejack-ls';
}


export function activate(context: ExtensionContext) {
	// activate server for toml files
	const outputChannel = window.createOutputChannel("Typejack Support");
	outputChannel.appendLine("Starting server...");


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

	const serverExe = getLanguageServerPath();

	const serverOptions: ServerOptions = {
        // Konfiguration für den normalen Start
        run: {
            command: serverExe,
            args: [],
            // Optionale Umgebungsvariablen oder CWD können hier hinzugefügt werden:
            // options: { cwd: path.join(__dirname, '..') }
        },
        // Konfiguration für den Debug-Start (oft identisch für externe Binaries)
        debug: {
            command: serverExe,
            args: []
        }
    };

	const clientOptions: LanguageClientOptions = {
		documentSelector: [{ scheme: 'file', language: 'typescript' }],
		synchronize: {
			fileEvents: workspace.createFileSystemWatcher('**/*.ts')
		}
	}

	client = new LanguageClient (
		'typejack-support',
		'Typejack Support',
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
