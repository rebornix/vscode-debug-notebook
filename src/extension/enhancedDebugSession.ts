/**
 * Derived from https://github.com/hediet/vscode-debug-visualizer/blob/master/extension/src/debugger/EnhancedDebugSession.ts
 */

import * as vscode from 'vscode';

export class EnhancedDebugSession {
	activeStackFrame: number | undefined;

	constructor(public readonly session: vscode.DebugSession) {}

	async getStackTrace(args: {
		threadId: number;
		startFrame?: number;
		levels?: number;
	}): Promise<{ totalFrames?: number; stackFrames: StackFrame[] }> {
		try {
			console.log(this.session.id, this.session.name, this.session.type);
			const reply = (await this.session.customRequest("stackTrace", {
				threadId: args.threadId,
				levels: args.levels,
				startFrame: args.startFrame || 0,
			})) as { totalFrames?: number; stackFrames: StackFrame[] };
			console.log(reply);
			return reply;
		} catch (e) {
			console.error(e);
			throw e;
		}
	}

	public async getCompletions(args: {
		text: string;
		column: number;
		frameId: number | undefined;
	}): Promise<vscode.CompletionItem[]> {
		try {
			const reply = await this.session.customRequest("completions", {
				text: args.text,
				frameId: args.frameId,
				column: args.column,
			});
			if (!reply) {
				return [];
			}
			return reply.targets;
		} catch (error) {
			console.error(error);
			return [];
		}
	}

	public async getVariables(args: {
		variablesReference: number
	}): Promise<Variable[]> {
		try {
			const reply = await this.session.customRequest("variables", {
				variablesReference: args.variablesReference
			});
			if (!reply) {
				return [];
			}
			return reply.variables;
		} catch (error) {
			console.error(error);
			return [];
		}
	}

	/**
	 * Evaluates the given expression.
	 * If context is "watch", long results are usually shortened.
	 */

	public async evaluate(args: {
		expression: string;
		frameId: number | undefined;
		context: "watch" | "repl" | "copy";
	}): Promise<{ result: string, variablesReference: number }> {
		const reply = await this.session.customRequest("evaluate", {
			expression: args.expression,
			frameId: args.frameId,
			context: args.context,
		});
		return { result: reply.result, variablesReference: reply.variablesReference };
	}
}

interface Variable {
	name: string;
	value: string;
	variablesReference: number;
}

interface StackFrame {
	id: number;
	name: string;
}
