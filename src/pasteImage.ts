
import * as vscode from 'vscode';
import * as config from './config';
import * as path from 'path';
import * as fs from 'fs';
import { spawn } from 'child_process';
import { url } from 'inspector';


let child_process_1 = require('child_process');


export function guid() {
	function s4() {
		return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
	}
	return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
  
export function getTimeString() {
    let now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}-${now.getSeconds()}`;
}

function insertMdImgStr(imgUrl:string) {
	let editor = vscode.window.activeTextEditor;
	if (editor) {
		editor.edit((edit: any) => {
			let current = (editor as vscode.TextEditor).selection;
			if (current.isEmpty) {
				edit.insert(current.start, `![](${imgUrl})`);
			} else {
				edit.replace(current, `![](${imgUrl})`);
			}
		});
	}
}

let funcTemp = function (imagePath:string, imagePathReturnByScript:string, imgSaveAbsDir:string) {
	if (!imagePathReturnByScript) {
		return;
	}
	if (imagePathReturnByScript === 'no image') {
		vscode.window.showInformationMessage('There is not a image in clipboard.');
		return;
	}	
	let oldName = path.parse(imagePath).name;
    
    // 弹框询问
	vscode.window.showInputBox({ ignoreFocusOut:true, password:false, placeHolder:oldName, prompt:"输入图片名", }).then(function(input){
		if (typeof input === "undefined") {
			return ;
		}
		input = input.trim();	// 去除前后空白字符
		// 输入空字符串
		if (input.length === 0) {
			let mdImgUrl = `${imgSaveAbsDir}/${oldName}.png`;
			insertMdImgStr(mdImgUrl);
			return;
		}
		let newPath = path.join(path.parse(imagePath).dir, `${input}.png`);
		// 重命名
		vscode.workspace.fs.rename(vscode.Uri.file(imagePath), vscode.Uri.file(newPath), {overwrite:true}).then(function(){
			let mdImgUrl = `${imgSaveAbsDir}/${input}.png`;
			insertMdImgStr(mdImgUrl);
		});
	});
};


function mkPath(strPath:string):boolean {
	if (fs.existsSync(strPath)) {  
        return true;  
    } else {  
        if (mkPath(path.dirname(strPath))) {  
            fs.mkdirSync(strPath);  
            return true;  
        }  
	}
	return false;
}

function getImgFileTempName():string {
    return getTimeString();
}

// 保存剪切板中的图片为 imagePath, cb 为保存完成后的回调
function saveClipboardImg(imageSavePath:string, imgSaveAbsDir:string,  cb:any) {
    let platform = process.platform;
	if (platform === 'win32') {
		// Windows
		var scriptPath = path.join(__dirname, '../res/pc.ps1');
		var command = "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe";
		var powershellExisted = fs.existsSync(command);
		if (!powershellExisted) {
			command = "powershell";
		}
		var powershell = child_process_1.spawn(command, [
			'-noprofile',
			'-noninteractive',
			'-nologo',
			'-sta',
			'-executionpolicy', 'unrestricted',
			'-windowstyle', 'hidden',
			'-file', scriptPath,
			imageSavePath
		]);
		powershell.on('error', function (e:any) {
			if (e.code === "ENOENT") {
				vscode.window.showErrorMessage("The powershell command is not in you PATH environment variables.Please add it and retry.");
			}
			else {
				vscode.window.showErrorMessage(e);
			}
		});
		powershell.on('exit', function (code:any, signal:any) {
			console.log('exit', code, signal);
		});
		powershell.stdout.on('data', function (data:any) {
			cb(imageSavePath, data.toString().trim(), imgSaveAbsDir);
		});
	}
	else if (platform === 'darwin') {
		// Mac
		let scriptPath = path.join(__dirname, '../../res/mac.applescript');
		let ascript = child_process_1.spawn('osascript', [scriptPath, imageSavePath]);
		ascript.on('error', function (e:any) {
			vscode.window.showErrorMessage(e);
		});
		ascript.on('exit', function (code:any, signal:any) {
			// console.log('exit',code,signal);
		});
		ascript.stdout.on('data', function (data:any) {
			cb(imageSavePath, data.toString().trim(), imgSaveAbsDir);
		});
	}
	else {
		// Linux 
		let scriptPath = path.join(__dirname, '../../res/linux.sh');
		let ascript = child_process_1.spawn('sh', [scriptPath, imageSavePath]);
		ascript.on('error', function (e:any) {
			vscode.window.showErrorMessage(e);
		});
		ascript.on('exit', function (code:any, signal:any) {
			// console.log('exit',code,signal);
		});
		ascript.stdout.on('data', function (data:any) {
			let result = data.toString().trim();
			if (result === "no xclip") {
				vscode.window.showInformationMessage('You need to install xclip command first.');
				return;
			}
			cb(imageSavePath, data.toString().trim(), imgSaveAbsDir);
		});
	}
}

export function pasteClipboardImg() {
	let activateTEdt = vscode.window.activeTextEditor;
	if (typeof(activateTEdt) === "undefined") {
		vscode.window.showErrorMessage('activeTextEditor Undefined!');
		return ;
	}
	let document = activateTEdt.document;
	if (document.languageId !== "markdown") {
		return ;
	}
	
	let fileRootPath = path.parse(document.uri.fsPath).dir;
	let imgSaveAbsDir = config.getImageSavePath();
	let imgDirPath = path.join(fileRootPath, imgSaveAbsDir);
	mkPath(imgDirPath);
	let tempName = getImgFileTempName();
	let imgSavePath = path.join(imgDirPath, `${tempName}.png`);
    saveClipboardImg(imgSavePath, imgSaveAbsDir, funcTemp);
}