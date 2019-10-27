// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as mdHandler from './handlerMd';
import { TextDecoder } from 'util';



// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "markdownhandler" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('extension.handlerMd', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		vscode.window.showInformationMessage('Start Markdown Handler Plugins!');
	});

	let generageToc = vscode.commands.registerCommand('extension.updateToc', () => {
		vscode.window.showInformationMessage('will update toc');
		mdHandler.updateToc();
	});
	context.subscriptions.push(disposable);
	context.subscriptions.push(generageToc);

	vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
		let document = event.document;
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

		let activateTEdt = vscode.window.activeTextEditor;
		if (typeof(activateTEdt) === "undefined") {
			vscode.window.showErrorMessage('vscode.window.activeTextEditor Undefined!');
			return ;
		}
		let lineCount = activateTEdt.document.lineCount;
		activateTEdt.edit(editBuilder => {
			const end = new vscode.Position(lineCount+1, 0);
			editBuilder.replace(new vscode.Range(new vscode.Position(0, 0), end), content);
		});

		// TODO 恢复光标位置

		// TODO 提示处理成功

	});

	// vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
	// });


}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log('your extension "markdownhandler" is now deactivated!');
}
