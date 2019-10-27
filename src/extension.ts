// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as mdHandler from './handlerMd';
import * as config from './config';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "markdownhandler" is active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	let cmdHandleMarkdown = vscode.commands.registerCommand('extension.handlerMarkdown', () => {
		vscode.window.setStatusBarMessage('正在处理当前markdown文件.');
		processMdFile();
	});
	context.subscriptions.push(cmdHandleMarkdown);

	vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
		if (config.getSaveFileAutoHandler()) {
			processMdFile();
		}
	});
}

function processMdFile() {
	let activateTEdt = vscode.window.activeTextEditor;
	if (typeof(activateTEdt) === "undefined") {
		vscode.window.showErrorMessage('activeTextEditor Undefined!');
		return ;
	}
	let document = activateTEdt.document;
	if (document.languageId !== "markdown") {
		return ;
	}
	let handler = new mdHandler.handler(document);
	let bProcessOk = handler.startProcess();
	if (bProcessOk === false) {
		return ;
	}

	let lstContent:string[] = handler.getContent();
	let content:string = lstContent.join("\n");

	let lineCount = activateTEdt.document.lineCount;
	if (typeof(activateTEdt) === "undefined") {
		vscode.window.showErrorMessage('activeTextEditor Undefined!');
		return ;
	}
	activateTEdt.edit(editBuilder => {
		const end = new vscode.Position(lineCount+1, 0);
		editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), content);
		vscode.window.setStatusBarMessage('当前markdown文件处理完成!');
	});
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('your extension "markdownhandler" is now deactivated!');
}
