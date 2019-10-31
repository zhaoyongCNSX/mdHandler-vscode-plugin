import * as vscode from 'vscode';



function getBooleanConfig(configKey:string):boolean {
    let value:any = vscode.workspace.getConfiguration().get<boolean>(configKey);
    if (typeof(value) === "undefined") {
        return false;
    }
    return value;  
}

function getStringConfig(configKey:string):string {
    let value:any = vscode.workspace.getConfiguration().get<string>(configKey);
    if (typeof(value) === "undefined") {
        return "";
    }
    return value;    
}

export function getSaveFileAutoHandler():boolean {
    return getBooleanConfig('MarkdownHandler.autoHandlerWhenSave');
}

export function getUpdateToc():boolean {
    return getBooleanConfig('MarkdownHandler.toc.generateToc');
}

export function getTocAutoInsertLink():boolean {
    return getBooleanConfig('MarkdownHandler.toc.autoInsertLink');
}

export function getTitleAutoNo():boolean {
    return getBooleanConfig('MarkdownHandler.title.autoNumbering');
}

export function getTitleNoStartLevelStr():string {
    return getStringConfig('MarkdownHandler.title.numveringStartNum');
}

export function getAutoInsertEmptyLine():boolean {
    return getBooleanConfig('MarkdownHandler.autoInsertEmptyLine');
}
// 中文符号替换为英文符号
export function getUseEnglishPunctuation():boolean {
    return getBooleanConfig('MarkdownHandler.useEnglishPunctuation');
}

export function getImageSavePath():string {
    return getStringConfig('MarkdownHandler.pasteImage.imageSavePath');
}