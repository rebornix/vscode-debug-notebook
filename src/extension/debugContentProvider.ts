import * as vscode from 'vscode';

export class DebugNotebook implements vscode.NotebookContentProvider {
	// options?: vscode.NotebookDocumentContentOptions | undefined;
	// onDidChangeNotebookContentOptions?: vscode.Event<vscode.NotebookDocumentContentOptions> | undefined;
	async resolveNotebook(document: vscode.NotebookDocument, webview: vscode.NotebookCommunication): Promise<void> {
		// throw new Error('Method not implemented.');
	}
	async openNotebook(uri: vscode.Uri, openContext: vscode.NotebookDocumentOpenContext, token: vscode.CancellationToken): Promise<vscode.NotebookData> {
		const metadata = new vscode.NotebookDocumentMetadata();

		return {
			metadata: metadata.with({ trusted: true }),
			cells: [
				{
					kind: vscode.NotebookCellKind.Code,
					language: 'javascript',
					source: ''
				}
			]
		};
	}
	async saveNotebook(document: vscode.NotebookDocument, token: vscode.CancellationToken): Promise<void> {
		// throw new Error('Method not implemented.');
	}
	async saveNotebookAs(targetResource: vscode.Uri, document: vscode.NotebookDocument, token: vscode.CancellationToken): Promise<void> {
		// throw new Error('Method not implemented.');
	}
	async backupNotebook(document: vscode.NotebookDocument, context: vscode.NotebookDocumentBackupContext, token: vscode.CancellationToken): Promise<vscode.NotebookDocumentBackup> {
		throw new Error('Method not implemented.');
	}
}