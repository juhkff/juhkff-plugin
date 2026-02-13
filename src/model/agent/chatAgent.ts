/**
 * @file chatAgent.ts
 * @fileoverview 聊天接口定义、公用函数和模板方法
 * @author juhkff
 */
import { HttpsProxyAgent } from "https-proxy-agent";
import { config } from "../../config/index.js";
import { ComplexJMsg, Request } from "../../types/index.js";
import { ChatHistory } from "../../db/index.js";

export type ApiKey = { name: string, apiKey: string, enabled: boolean };
export type ChatResponse = { ok: boolean; data?: string; error?: string };

export interface ChatInterface {
    chatRequest(groupId: number, model: string, input: string, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<ChatResponse>;
    chatModels(): Promise<Record<string, Function> | undefined>;
}

export interface VisualInterface {
    visualRequest(groupId: number, model: string, nickName: string, j_msg: ComplexJMsg, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<any>;
    toolRequest(model: string, j_msg: { img?: string[], text: string[] }): Promise<any>;
    visualModels(): Promise<Record<string, { chat: Function, tool: Function }> | undefined>;
}

export abstract class ChatAgent implements ChatInterface, VisualInterface {
    public proxy: HttpsProxyAgent<string> = null;
    public apiKey: ApiKey[];
    public apiUrl: undefined | string = undefined;
    public modelsChat: Record<string, Function> = {};
    public modelsVisual: Record<string, { chat: Function, tool: Function }> = {};
    constructor(apiKey: ApiKey[], apiUrl: string | null = null) {
        this.apiKey = apiKey;
        if (apiUrl)
            this.apiUrl = apiUrl;
        (async () => {
            this.modelsChat = await this.chatModels();
            this.modelsVisual = await this.visualModels();
        })()
    }

    public static hasVisual = (): boolean => { throw new Error("Method not implemented."); }

    abstract chatModels(): Promise<Record<string, Function> | undefined>;
    abstract visualModels(): Promise<Record<string, { chat: Function, tool: Function }> | undefined>;

    // --- 请求构建钩子（子类实现） ---

    /** 构建对话请求 */
    protected abstract buildChatRequest(key: ApiKey, model: string): Request;
    /** 构建视觉请求 */
    protected abstract buildVisualRequest(key: ApiKey, model: string): Request;
    /** 构建工具请求 */
    protected abstract buildToolRequest(key: ApiKey, model: string): Request;

    // --- 通用请求处理（子类实现格式相关逻辑） ---

    protected abstract commonRequestChat(groupId: number, request: Request, input: string, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<ChatResponse>;
    protected abstract commonRequestVisual(groupId: number, request: Request, nickName: string, j_msg: ComplexJMsg, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<ChatResponse>;
    protected abstract commonRequestTool(request: Request, j_msg: { img?: string[], text: string[] }): Promise<ChatResponse>;

    /** 对chat响应数据进行后处理，子类可覆盖 */
    protected postProcessChatResponse(data: any): any { return data; }

    // --- 模板方法（封装Key遍历和请求分派逻辑） ---

    async chatRequest(groupId: number, model: string, input: string, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<ChatResponse> {
        let response: ChatResponse;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildChatRequest(eachKey, model);
            if (config.autoReply.useChatProxy) request.options.agent = this.proxy;

            if (!this.modelsChat.hasOwnProperty(model) || this.modelsChat[model] === null) {
                response = await this.commonRequestChat(groupId, request, input, historyMessages, useSystemRole);
            } else {
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

    async visualRequest(groupId: number, model: string, nickName: string, j_msg: ComplexJMsg, historyMessages?: ChatHistory[], useSystemRole?: boolean): Promise<ChatResponse> {
        let response: ChatResponse;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildVisualRequest(eachKey, model);
            if (config.autoReply.useChatProxy) request.options.agent = this.proxy;

            if (!this.modelsVisual.hasOwnProperty(model) || this.modelsVisual[model] === null) {
                response = await this.commonRequestVisual(groupId, JSON.parse(JSON.stringify(request)), nickName, j_msg, historyMessages, useSystemRole);
            } else {
                response = await this.modelsVisual[model].chat(groupId, JSON.parse(JSON.stringify(request)), nickName, j_msg, historyMessages, useSystemRole);
            }
            if (response && response.ok) return response;
        }
        if (this.apiKey.length === 0) {
            return { ok: false, error: "未设置有效的API密钥" };
        }
        return { ok: false, error: "请求失败" };
    }

    async toolRequest(model: string, j_msg: { img?: string[], text: string[] }): Promise<any> {
        let response: ChatResponse;
        for (const eachKey of this.apiKey.filter(k => k.enabled)) {
            const request = this.buildToolRequest(eachKey, model);
            if (config.autoReply.useVisualProxy) request.options.agent = this.proxy;

            if (!this.modelsVisual.hasOwnProperty(model) || this.modelsVisual[model] === null) {
                response = await this.commonRequestTool(JSON.parse(JSON.stringify(request)), j_msg);
            } else {
                response = await this.modelsVisual[model].tool(JSON.parse(JSON.stringify(request)), j_msg);
            }

            if (response && response.ok) return response.data;
        }
        if (this.apiKey.length > 0) return response?.error;
    }
}
