import { config } from "../../config/index.js";
export class ChatAgent {
    proxy = null;
    apiKey;
    apiUrl = undefined;
    modelsChat = {};
    modelsVisual = {};
    constructor(apiKey, apiUrl = null) {
        this.apiKey = apiKey;
        if (apiUrl)
            this.apiUrl = apiUrl;
        (async () => {
            this.modelsChat = await this.chatModels();
            this.modelsVisual = await this.visualModels();
        })();
    }
    static hasVisual = () => { throw new Error("Method not implemented."); };
    /** 对chat响应数据进行后处理，子类可覆盖 */
    postProcessChatResponse(data) { return data; }
    // --- 模板方法（封装Key遍历和请求分派逻辑） ---
    async chatRequest(groupId, model, input, historyMessages, useSystemRole) {
        let response;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildChatRequest(eachKey, model);
            if (config.autoReply.useChatProxy)
                request.options.agent = this.proxy;
            if (!this.modelsChat.hasOwnProperty(model) || this.modelsChat[model] === null) {
                response = await this.commonRequestChat(groupId, request, input, historyMessages, useSystemRole);
            }
            else {
                response = await this.modelsChat[model](groupId, request, input, historyMessages, useSystemRole);
            }
            if (response && response.ok) {
                response.data = this.postProcessChatResponse(response.data);
                return response;
            }
        }
        if (this.apiKey.length === 0) {
            return { ok: false, error: "未设置有效的API密钥" };
        }
        return { ok: false, error: "请求失败" };
    }
    async visualRequest(groupId, model, nickName, j_msg, historyMessages, useSystemRole) {
        let response;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildVisualRequest(eachKey, model);
            if (config.autoReply.useChatProxy)
                request.options.agent = this.proxy;
            if (!this.modelsVisual.hasOwnProperty(model) || this.modelsVisual[model] === null) {
                response = await this.commonRequestVisual(groupId, JSON.parse(JSON.stringify(request)), nickName, j_msg, historyMessages, useSystemRole);
            }
            else {
                response = await this.modelsVisual[model].chat(groupId, JSON.parse(JSON.stringify(request)), nickName, j_msg, historyMessages, useSystemRole);
            }
            if (response && response.ok)
                return response;
        }
        if (this.apiKey.length === 0) {
            return { ok: false, error: "未设置有效的API密钥" };
        }
        return { ok: false, error: "请求失败" };
    }
    async toolRequest(model, j_msg) {
        let response;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildToolRequest(eachKey, model);
            if (config.autoReply.useVisualProxy)
                request.options.agent = this.proxy;
            if (!this.modelsVisual.hasOwnProperty(model) || this.modelsVisual[model] === null) {
                response = await this.commonRequestTool(JSON.parse(JSON.stringify(request)), j_msg);
            }
            else {
                response = await this.modelsVisual[model].tool(JSON.parse(JSON.stringify(request)), j_msg);
            }
            if (response && response.ok)
                return response.data;
        }
        if (this.apiKey.length > 0)
            return response?.error;
    }
}
