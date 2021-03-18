import * as vscode from 'vscode';
import { EnhancedDebugSession } from './enhancedDebugSession';

type Message =
	| StoppedEvent
	| ThreadsResponse
	| ContinueLikeResponse;

interface ContinueLikeResponse {
	type: "response";
	command:
	| "continue"
	| "stepIn"
	| "stepOut"
	| "next";
}

interface StoppedEvent {
	type: "event";
	event: "stopped";
	body: {
		threadId: number;
	};
}

interface ThreadsResponse {
	type: "response";
	command: "threads";
	success: boolean;
	body: {
		threads: ThreadInfo[];
	};
}

interface ThreadInfo {
	id: number;
	name: string;
}

export type GraphVisualizationData = {
	kind: {
		graph: true;
	};
	nodes: GraphNode[];
	edges: GraphEdge[];
};

export type GraphNode = {
	id: string;
	label?: string;
	color?: string;
	shape?: "ellipse" | "box";
};

export type GraphEdge = {
	from: string;
	to: string;
	label?: string;
	id?: string;
	color?: string;
	dashes?: boolean;
};

class DebugSessionKernel implements vscode.NotebookKernel {

	constructor(
		private _session: EnhancedDebugSession,
		readonly id: string,
		readonly label: string,
		readonly isPreferred?: boolean | undefined,
		readonly supportedLanguages?: string[] | undefined
	) {
	}

	private _getContext(): "copy" | "repl" {
		if (this._session.session.type.startsWith("pwa-")) {
			return "copy";
		}
		return "repl";
	}

	executeCell(document: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		this._session.session.customRequest("evaluate", {
			expression: cell.document.getText(),
			frameId: this._session.activeStackFrame,
			context: this._getContext(),
		}).then(async reply => {
			console.log(reply);
            const workspaceEdit = new vscode.WorkspaceEdit();
            if (reply.variablesReference) {
                const graph = await this.constructGraphFromVariablesReference(reply.result, reply.variablesReference)
                console.log(graph);
                workspaceEdit.replaceNotebookCellOutput(document.uri, cell.index, [new vscode.NotebookCellOutput([
                    new vscode.NotebookCellOutputItem('application/x.notebook.stdout', reply.result),
                    new vscode.NotebookCellOutputItem('application/data-structure', graph)
                ], )])
    
            } else {
                workspaceEdit.replaceNotebookCellOutput(document.uri, cell.index, [new vscode.NotebookCellOutput([
                    new vscode.NotebookCellOutputItem('application/x.notebook.stdout', reply.result),
                ], )])
            }
			await vscode.workspace.applyEdit(workspaceEdit);
		});
	}
	cancelCellExecution(document: vscode.NotebookDocument, cell: vscode.NotebookCell): void {
		throw new Error('Method not implemented.');
	}
	executeAllCells(document: vscode.NotebookDocument): void {
		throw new Error('Method not implemented.');
	}
	cancelAllCellsExecution(document: vscode.NotebookDocument): void {
		throw new Error('Method not implemented.');
	}

    private async constructGraphFromVariablesReference(
		rootLabel: string,
		rootVariablesReference: number,
		maxDepth: number = 30,
		maxKnownNodes: number = 50,
	): Promise<GraphVisualizationData> {
		// Perform a breadth-first search on the object to construct the graph

		const graph: GraphVisualizationData = {
			kind: { graph: true },
			nodes: [],
			edges: []
		};
		const knownNodeIds: { [ref: number]: string; } = {};
		const bfsQueue: { source: { id: string, name: string } | undefined, label: string, variablesReference: number, depth: number }[] = [{
			source: undefined,
			label: rootLabel,
			variablesReference: rootVariablesReference,
			depth: 0,
		}];

		let knownCount: number = 0;

		do {
			const variable = bfsQueue.shift()!;
			const hasChilds = variable.variablesReference > 0;

			if (variable.depth > maxDepth) {
				break;
			}

            if (variable?.source?.name === '__proto__') {
                break;
            }

			let nodeId: string;

			if (!hasChilds || !(variable.variablesReference in knownNodeIds)) {
				// The variable is a leaf or an unvisited object: create the node.

				const node: GraphNode = {
					id: hasChilds ? `${variable.variablesReference}` : `__${variable.label}@${knownCount}__`,
					label: variable.label,
					color: variable.depth == 0 ? "lightblue" : undefined,
					shape: "box",
				};

				graph.nodes.push(node);
				knownCount++;

				if (hasChilds) {
					knownNodeIds[variable.variablesReference] = node.id;

					for (const child of await this._session.getVariables({ variablesReference: variable.variablesReference })) {
						bfsQueue.push({ source: { id: node.id, name: child.name }, label: child.value, variablesReference: child.variablesReference, depth: variable.depth + 1 });
					}
				}

				nodeId = node.id;
			} else {
				// The variable is a visited object (e.g. due to a cyclic reference)

				nodeId = knownNodeIds[variable.variablesReference];
			}

			if (variable.source) {
				graph.edges.push({ from: variable.source.id, to: nodeId, label: variable.source.name });
			}
		} while (bfsQueue.length > 0 && knownCount <= maxKnownNodes);

		return graph;
	}

}

export class DebugKernelProvider implements vscode.NotebookKernelProvider {
    private _disposables: vscode.Disposable[] = [];
	private _kernels: DebugSessionKernel[] = [];
	private _onDidChangeKernels = new vscode.EventEmitter<vscode.NotebookDocument | undefined>();
	onDidChangeKernels = this._onDidChangeKernels.event;
	private readonly sessions = new Map<vscode.DebugSession, EnhancedDebugSession>();

	public getEnhancedDebugSession(
		session: vscode.DebugSession
	): EnhancedDebugSession {
		let result = this.sessions.get(session);
		if (!result) {
			result = new EnhancedDebugSession(session);
			this.sessions.set(session, result);
		}
		return result;
	}

	constructor() {
		this._disposables.push(vscode.debug.onDidStartDebugSession(session => {
			const e = this.sessions.get(session)!;
		}));
		this._disposables.push(vscode.debug.onDidTerminateDebugSession(session => {
			this.sessions.delete(session);
		}));

		this._disposables.push(vscode.debug.registerDebugAdapterTrackerFactory("*", {
			createDebugAdapterTracker: session => {
				return {
					onDidSendMessage: async msg => {
						this._handleMessage(session, msg);
					},
				};
			},
		}));
		
		this._disposables.push(vscode.debug.onDidChangeActiveDebugSession(e => {
			this._updateKernels();
		}));

		this._updateKernels();
	}

	private async _handleMessage(session: vscode.DebugSession, msg: any) {
		const extendedSession = this.getEnhancedDebugSession(
			session
		);

		const m = msg as Message;
		if (m.type === "event") {
			if (m.event === "stopped") {
				const threadId = m.body.threadId;
				const r = await extendedSession.getStackTrace({
					threadId,
					startFrame: 0,
					levels: 1,

				});
				extendedSession.activeStackFrame =
					r.stackFrames.length > 0
						? r.stackFrames[0].id
						: undefined;
			}
		} else if (m.type === "response") {
			if (
				m.command === "continue" ||
				m.command === "next" ||
				m.command === "stepIn" ||
				m.command === "stepOut"
			) {
				extendedSession.activeStackFrame = undefined;
			}
		}
	}


	private _updateKernels() {
		const session = vscode.debug.activeDebugSession;
		if (!session) {
			this._kernels = [];
		} else {
			const enhancedDebugSession = this.getEnhancedDebugSession(session);
			this._kernels = [new DebugSessionKernel(
				enhancedDebugSession,
				session.id,
				session.name,
				true,
				['javascript']
			)];
		}

		this._onDidChangeKernels.fire(undefined);
	}

	provideKernels(document: vscode.NotebookDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.NotebookKernel[]> {
		return this._kernels;
	}

    dispose() {
        this._disposables.forEach(d => d.dispose());
    }
}