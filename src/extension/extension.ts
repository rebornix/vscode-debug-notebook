import * as vscode from 'vscode';
import { DebugNotebook } from './debugContentProvider';
import { DebugKernelProvider } from './debugKernels';


export function activate(context: vscode.ExtensionContext) {
	const debugNotebook = new DebugNotebook();
	context.subscriptions.push(vscode.notebook.registerNotebookContentProvider('debug-notebook', debugNotebook));
	const debugKernelProvider = new DebugKernelProvider();
	context.subscriptions.push(vscode.notebook.registerNotebookKernelProvider({ viewType: 'debug-notebook' }, debugKernelProvider));

	context.subscriptions.push(vscode.commands.registerCommand('debugnb.new', async () => {
		await vscode.commands.executeCommand('workbench.action.files.newUntitledFile', { viewType: 'debug-notebook' });
	}));
}

export function deactivate() { }
