import * as vscode from 'vscode';
import * as config from './config';

export function updateToc()
{
    vscode.window.showInformationMessage('--- updateToc ---');
}

enum EStatus { 
    E_inTocBlock
    , E_inResBlock
    , E_inUrlBlock
    , E_inConfigBlock
    , E_inCodeBlock
    , E_table
    , E_normal
}

enum EBolckExistStatus {
    E_noExist
    , E_exist  
    , E_existAndMatch   // 存在且开始结束字段匹配
}

function checkIsTocBlockStart(text:string):Boolean {
    return /<!-- TOC -->/.test(text);
}
function checkIsTocBlockEnd(text:string):Boolean {
    return /<!-- \/TOC -->/.test(text);
}
function checkIsConfigBlockStart(text:string):Boolean {
    return /<!-- CONFIG -->/.test(text);
}
function checkIsConfigBlockEnd(text:string):Boolean {
    return /<!-- \/CONFIG -->/.test(text);
}
function checkIsResBlockStart(text:string):Boolean {
    return /<!-- RES -->/.test(text);
}
function checkIsResBlockEnd(text:string):Boolean {
    return /<!-- \/RES -->/.test(text);
}
function checkIsUrlBlockStart(text:string):Boolean {
    return /<!-- URL -->/.test(text);
}
function checkIsUrlBlockEnd(text:string):Boolean {
    return /<!-- \/URL -->/.test(text);
}
function checkIsCodeBlockStart(text:string):Boolean {
    return /^```/.test(text);
}
function checkIsCodeBlockEnd(text:string):Boolean {
    return /^```$/.test(text);
}
function checkIsTableLine(text:string):Boolean {
    return /^\|.*\|$/.test(text);
}

// 字符串乘法
function multString(str:string, num:number):string {
    if (num <= 0) {
        return "";
    }
    return num > 1 ? str += multString(str, --num): str;
}

// 判断是否为 titleUrlList
function checkIsTitleUrlLink(text:string):Boolean {
    // <a id="toc_anchor" name="1-网站"></a>
    return /^<a id=\"toc_anchor\".*<\/a>$/.test(text);
}

// tslint:disable-next-line: class-name
export class handler {
    constructor(doc: vscode.TextDocument) {
        this.doc = doc;
        this.mapBlockExist.set("tocBlock", EBolckExistStatus.E_noExist);
        this.mapBlockExist.set("configBlock", EBolckExistStatus.E_noExist);
        this.mapBlockExist.set("resBlock", EBolckExistStatus.E_noExist);
        this.mapBlockExist.set("urlBlock", EBolckExistStatus.E_noExist);
        this.mapBlockExist.set("codeBlock", EBolckExistStatus.E_noExist);
    }
    test(): void {
        console.log('Handler func()');
    }
    // 设置当前 title level [1, levelMax]
    setCrtTitlelevelNum(crtLevel:number):boolean {
        if (crtLevel < 1 || crtLevel > this.levelMax) {
            return false;
        }

        for (let i=0; i<this.levelMax; ++i) {
            if (crtLevel === i+1) {
                this.lstLevelNum[i] += 1;
            } else if (crtLevel < i+1) {
                this.lstLevelNum[i] = 0;
            } else {
                // do nothing
            }
        }
        return true;
    }
    // 获取当前 title level 字符串 eg: "1.2.3"
    private getCrtTitleLevelStr(crtLevel:number):string {
        let noStartStr:string = config.getTitleNoStartLevelStr();
        let levelStr:string = "";
        if (crtLevel < 1 || crtLevel > this.levelMax) {
            return "";
        }
        let lstStr: string[] = [];
        for (let i=noStartStr.length-1; i<crtLevel; ++i) {
            lstStr.push(String(this.lstLevelNum[i]));
        }
        levelStr = lstStr.join(".");
        return levelStr;
    }
    // 生成用于锚点元素的字符串. eg: "21-插件_开发"
    private getLinkStr(crtLevel:number, clearTitle:string):string {
        let levelStr = this.getCrtTitleLevelStr(crtLevel);
        levelStr = levelStr.replace(RegExp("\\.", "g"), "");
        let noEmptyCharTitle = clearTitle.replace(RegExp(" ", "g"), "");
        let linkStr:string = `#${levelStr}-${noEmptyCharTitle}`;
        return linkStr;
    }
    // 生成 title 字符串. eg: "# 2.1. 插件 开发"
    private getTitleStr(level:number, clearTitle:string):string {
        let titleStr:string = "";
        if (config.getTitleAutoNo()) {
            let strLevelNum = this.getCrtTitleLevelStr(level);
            if (strLevelNum.length > 0) {
                strLevelNum = `${strLevelNum}. `;
            }
            titleStr = `${multString("#", level)} ${strLevelNum}${clearTitle}`;
        } else {
            titleStr = `${multString("#", level)} ${clearTitle}`;
        }
        return titleStr;
    }
    // 生成 title 对应的锚点元素 <a id="toc_anchor" name="21-插件_开发"></a>
    private getTitleUrlLink(level:number, clearTitle:string):string {
        let titleUrlLink:string = `<a id="toc_anchor" name="${this.getLinkStr(level, clearTitle)}"></a>`;
        return titleUrlLink;
    }
    // 生成TOC字符串 eg: "  - [插件开发](#21-插件_开发)"
    private getTocStr(level:number, clearTitle:string):string {
        let tocStr:string = "";
        if (config.getTocAutoInsertLink()) {
            tocStr = `${multString("    ", level-1)}- [${clearTitle}](${this.getLinkStr(level, clearTitle)})`;
        } else {
            tocStr = `${multString("    ", level-1)}- ${clearTitle}`;
        }

        return tocStr;
    }
    // 判断是否为标题
    private checkIsTitle(text:string):{ [key: string]: any; } {
        let rtnVal :{ [key: string]: any; } = {
            "isTitle": false,
            "titleUrlLink": "",
            "titleString": "",
            "tocString": ""
        };
        let reg :RegExp = /^(#+)[\d\. ]*(.+)$/;
        if (reg.test(text) === false) {
            return rtnVal;
        } 
        let levelStr = RegExp.$1;
        let clearTitle = RegExp.$2;

        let nLevel:number = levelStr.length;
        this.setCrtTitlelevelNum(nLevel);
        rtnVal["isTitle"] = true;
        if (config.getTocAutoInsertLink()) {
            rtnVal["titleUrlLink"] = this.getTitleUrlLink(nLevel, clearTitle);
        } 
        rtnVal["titleString"] = this.getTitleStr(nLevel, clearTitle);
        rtnVal["tocString"] = this.getTocStr(nLevel, clearTitle);
        return rtnVal;
    }

    // 替换字符
    private processOneLineStr(text:string):string {
        if (config.getUseEnglishPunctuation() === false) {
            return text;
        }
        // TODO 暂时先写死
        let mapReplace:any = {
            "。":". ", "，":", ", "：":": ", "；":"; ", "“":"\"", "”":"\""
            , "‘":"\'", "’":"\'", "《":"<<", "》":">>", "？":"?", "、":", "
            , "（":"(", "）":")"
        };
        Object.keys(mapReplace).forEach(function(key){
            text = text.replace(RegExp(`${key}`, "g"), mapReplace[key]);
        });
        return text;
    }

    startProcess():Boolean {
        return this._process();
    }
    // 开始处理
    private _process(): Boolean {
        let nConsequentEmptyLineMaxCount = 4;   // 连续空白行的最大值
        let nConsequentEmptyLineCount = 0;  // 连续空白行的个数
        let bBeforeLineIsTitleUrlLink = false;
        for (let i=0; i < this.doc.lineCount; ++i) {
            let line = this.doc.lineAt(i);
            let sourceText = line.text;
            sourceText = this.processOneLineStr(sourceText);
            let trimedText = sourceText.trim();

            let beforeLineStatus = this.crtLineStatus;
            this.crtLineStatus = this.nextLineStatus;
            this.nextLineStatus = EStatus.E_normal;

            do {                
                // TOC 中的字符都会被舍弃. 之后会重新生成
                if (this.crtLineStatus === EStatus.E_inTocBlock) {
                    if (checkIsTocBlockEnd(trimedText)) {
                        this.mapBlockExist.set("tocBlock", EBolckExistStatus.E_existAndMatch);
                        this.nextLineStatus = EStatus.E_normal;
                    } else {
                        this.nextLineStatus = EStatus.E_inTocBlock;
                    }
                    break;
                }
                // CONFIG 块.
                else if (this.crtLineStatus === EStatus.E_inConfigBlock) {
                    if (checkIsConfigBlockEnd(trimedText)) {
                        this.mapBlockExist.set("configBlock", EBolckExistStatus.E_existAndMatch);
                        this.nextLineStatus = EStatus.E_normal;
                    } else {
                        this.nextLineStatus = EStatus.E_inConfigBlock;
                    }
                    this.lstConfig.push(sourceText);
                    break;
                }
                // RES 块
                else if (this.crtLineStatus === EStatus.E_inResBlock) {
                    if (checkIsResBlockEnd(trimedText)) {
                        this.mapBlockExist.set("resBlock", EBolckExistStatus.E_existAndMatch);
                        this.nextLineStatus = EStatus.E_normal;
                    } else {
                        this.nextLineStatus = EStatus.E_inResBlock;
                    }
                    this.lstRes.push(sourceText);
                    break;
                }
                // URL 块 
                else if (this.crtLineStatus === EStatus.E_inUrlBlock) {
                    if (checkIsUrlBlockEnd(trimedText)) {
                        this.mapBlockExist.set("urlBlock", EBolckExistStatus.E_existAndMatch);
                        this.nextLineStatus = EStatus.E_normal;
                    } else {
                        this.nextLineStatus = EStatus.E_inUrlBlock;
                    }
                    this.lstUrl.push(sourceText);
                    break;
                }
                // 代码块
                else if (this.crtLineStatus === EStatus.E_inCodeBlock) {
                    if (checkIsCodeBlockEnd(trimedText)) {
                        this.mapBlockExist.set("codeBlock", EBolckExistStatus.E_existAndMatch);
                        this.nextLineStatus = EStatus.E_normal;
                    } else {
                        this.nextLineStatus = EStatus.E_inCodeBlock;
                    }
                    this.lstContent.push(sourceText);
                    break;
                }
                else if (this.crtLineStatus === EStatus.E_normal) {
                    // 空行
                    if (line.isEmptyOrWhitespace) {
                        // title url 之后的空行, 直接移除
                        if (bBeforeLineIsTitleUrlLink) {
                            bBeforeLineIsTitleUrlLink = false;
                            break;
                        }
                        nConsequentEmptyLineCount++;
                        // 去除多余的空行
                        if (nConsequentEmptyLineCount >= nConsequentEmptyLineMaxCount) {
                            break;
                        }
                        this.lstContent.push("");
                        break;
                    } 
                    let nBeforeConsequentEmptyLineCount = nConsequentEmptyLineCount;
                    nConsequentEmptyLineCount = 0;

                    let bNeedAddOneEmptyLine = false;
                    // 表格, 开始之前要有一个空行
                    if (checkIsTableLine(trimedText)) {
                        this.crtLineStatus = EStatus.E_table;
                        if (beforeLineStatus !== EStatus.E_table) {
                            if (nBeforeConsequentEmptyLineCount === 0 
                                && config.getAutoInsertEmptyLine()) {
                                this.lstContent.push("");
                            }
                        }
                        this.lstContent.push(sourceText);
                        break;
                    }
                    // TOC 开始, 忽略 toc 内容. 之后会生成
                    if (checkIsTocBlockStart(trimedText)) {
                        this.crtLineStatus = EStatus.E_inTocBlock;
                        this.nextLineStatus = EStatus.E_inTocBlock;
                        this.mapBlockExist.set("tocBlock", EBolckExistStatus.E_exist);
                        break;
                    }
                    // CONFIG
                    else if (checkIsConfigBlockStart(trimedText)) {
                        this.crtLineStatus = EStatus.E_inConfigBlock;
                        this.nextLineStatus = EStatus.E_inConfigBlock;
                        this.mapBlockExist.set("configBlock", EBolckExistStatus.E_exist);
                        this.lstConfig.push(sourceText);
                        break;
                    }
                    // RES
                    else if (checkIsResBlockStart(trimedText)) {
                        this.crtLineStatus = EStatus.E_inResBlock;
                        this.nextLineStatus = EStatus.E_inResBlock;
                        this.mapBlockExist.set("resBlock", EBolckExistStatus.E_exist);
                        this.lstRes.push(sourceText);
                        break;
                    }
                    // URL
                    else if (checkIsUrlBlockStart(trimedText)) {
                        this.crtLineStatus = EStatus.E_inUrlBlock;
                        this.nextLineStatus = EStatus.E_inUrlBlock;
                        this.mapBlockExist.set("urlBlock", EBolckExistStatus.E_exist);
                        this.lstUrl.push(sourceText);
                        break;
                    }
                    // CODE, 开始前要有一个空行
                    else if (checkIsCodeBlockStart(trimedText)) {
                        this.crtLineStatus = EStatus.E_inCodeBlock;
                        this.nextLineStatus = EStatus.E_inCodeBlock;
                        this.mapBlockExist.set("codeBlock", EBolckExistStatus.E_exist);
                        if (nBeforeConsequentEmptyLineCount === 0
                            && config.getAutoInsertEmptyLine()) {
                            this.lstContent.push("");
                        }
                        this.lstContent.push(sourceText);
                        break;
                    }
                    // Title
                    let checkTitleRtn = this.checkIsTitle(trimedText);
                    if (checkTitleRtn["isTitle"]) {
                        this.crtLineStatus = EStatus.E_normal;
                        this.nextLineStatus = EStatus.E_normal;
                        let titleUrlLink:string = checkTitleRtn["titleUrlLink"];
                        let titleStr:string = checkTitleRtn["titleString"];
                        let tocStr:string = checkTitleRtn["tocString"];
                        
                        if (config.getTocAutoInsertLink()) {
                            this.lstContent.push(titleUrlLink);
                            this.lstContent.push("");
                        }
                        this.lstContent.push(titleStr);

                        this.lstToc.push(tocStr);
                        break;
                    }
                    // 删除已存在的 title 链接 (以及之后的一个空行)
                    else if (checkIsTitleUrlLink(trimedText)) {
                        bBeforeLineIsTitleUrlLink = true;
                        break;
                    }

                    // 其他非特殊元素
                    this.crtLineStatus = EStatus.E_normal;
                    this.nextLineStatus = EStatus.E_normal;
                    this.lstContent.push(sourceText);
                } else {
                    console.error(`process line type error! no: ${line.lineNumber} text: ${line.text}`);
                }
            } while (false);
        }
        
        if (!this.checkBlocksMatch()) {
            return false;
        }

        this.joinBlockToContent();
        return true;
    }
    
    getContent(): Array<string> {
        return this.lstContent;
    }

    // 校验块元素状态是否合法
    checkBlocksMatch():Boolean {
        this.mapBlockExist.forEach((value, key) =>{
            if (value === EBolckExistStatus.E_exist) {
                vscode.window.showErrorMessage(`当前文档存在语法错误. 未找到块元素 ${key} 的结束标志!`);
                return false;
            }
        });
        return true;
    }

    // 合并所有块元素到 content
    joinBlockToContent():Boolean {
        let lstTmp:string[] = [];
        if (config.getUpdateToc()) {
            this.lstToc = ['<!-- TOC -->', ""].concat(this.lstToc, ["", '<!-- /TOC -->']);
            lstTmp = this.lstToc.concat([""], this.lstConfig, [""], this.lstRes, [""], this.lstUrl);
        } else {
            lstTmp = lstTmp.concat([""], this.lstConfig, [""], this.lstRes, [""], this.lstUrl);
        }
        this.lstContent = lstTmp.concat(this.lstContent);
        return true;
    }

    private readonly doc : vscode.TextDocument;

    private lstContent: string[] = [];        // 处理后的文本内容, 包括 toc
    private lstToc: string[] = [];
    private lstConfig: string[] = [];
    private lstRes: string[] = [];
    private lstUrl: string[] = [];

    private readonly levelMax:number = 7;
    private lstLevelNum: number[] = [0, 0, 0, 0, 0, 0, 0];
    
    private crtLineStatus : EStatus = EStatus.E_normal;
    private nextLineStatus: EStatus = EStatus.E_normal;

    private mapBlockExist = new Map<string, EBolckExistStatus>();   // 记录块元素的状态.(有没有块元素, 块元素的开始结束标签是否匹配)
}