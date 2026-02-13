import axios from "axios";
import { config } from "../../config/index.js";
import { ComplexJMsg, Request, RequestBody } from "../../types/index.js";
import { ChatKits, ConfigKits, Objects } from "../../utils/kits.js";
import { EMOTION_KEY } from "../constant.js";
import { ApiKey, ChatAgent, ChatResponse } from "./chatAgent.js";
import { ChatHistory } from "../../db/index.js";

export class OpenAI extends ChatAgent {
    constructor(apiKey: ApiKey[], apiUrl: string | null = null) { super(apiKey, apiUrl); }

    static hasVisual = () => true;

    async chatModels(): Promise<Record<string, Function> | undefined> {
        return {
            "输入模型名称（请勿选择该项）": null
        };
    }
    async visualModels(): Promise<Record<string, { chat: Function; tool: Function; }> | undefined> {
        return {
            "输入视觉模型名称（请勿选择该项）": null
        }
    }

    // --- 请求构建 ---

    protected buildChatRequest(key: ApiKey, model: string): Request {
        return {
            url: this.apiUrl ? `${this.apiUrl}/chat/completions` : config.autoReply.apiCustomUrl,
            options: {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: {
                    model: model,
                    messages: [],
                    stream: false,
                    temperature: 1.5,
                },
            },
        };
    }

    protected buildVisualRequest(key: ApiKey, model: string): Request {
        return {
            url: this.apiUrl ? `${this.apiUrl}/chat/completions` : config.autoReply.apiCustomUrl,
            options: {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: {
                    model: model,
                    messages: [],
                    stream: false,
                },
            },
        };
    }

    protected buildToolRequest(key: ApiKey, model: string): Request {
        return {
            url: this.apiUrl ? `${this.apiUrl}/chat/completions` : config.autoReply.visualApiCustomUrl,
            options: {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${key.apiKey}`,
                    "Content-Type": "application/json",
                },
                body: {
                    model: model,
                    messages: [],
                    stream: false,
                },
            },
        };
    }

    //----------------------------------------- function -----------------------------------------

    /**
     * 生成 role = system 的内容
     * @param useEmotion 是否使用情感
     * @param chatPrompt 聊天预设
     * @returns `{role: 'system', content: 'xxx'}`
     */
    protected async generateSystemContent(groupId: number, useEmotion: boolean, chatPrompt: null | undefined | string): Promise<{ role?: "system", content?: string } & Record<string, any>> {
        if (Objects.isNull(chatPrompt))
            chatPrompt =
                "You are a helpful assistant, you must speak Chinese. Now you are in a chat group, and the following is chat history";
        var emotionPrompt = await redis.get(EMOTION_KEY);
        // 传入机器人在群中的昵称
        chatPrompt = ChatKits.replaceWithBotNickName(chatPrompt, groupId);
        return {
            role: "system",
            // 按deepseek-r1的模板修正格式
            content: (useEmotion ?
                `${chatPrompt} \n 你的情感倾向——${emotionPrompt.replace(/\n/g, "").replace(/\s+/g, "")}`
                : chatPrompt) as string
        };
    }
    protected async generateSystemContentVisual(groupId: number, useEmotion: boolean, chatPrompt: null | undefined | string): Promise<{ role?: "system", content: ({ type?: "text", text?: string } & Record<string, any>)[] }> {
        if (Objects.isNull(chatPrompt))
            chatPrompt =
                "You are a helpful assistant, you must speak Chinese. Now you are in a chat group, and the following is chat history";
        var emotionPrompt = await redis.get(EMOTION_KEY);
        chatPrompt = ChatKits.replaceWithBotNickName(chatPrompt, groupId);
        return {
            role: "system",
            content: [{
                type: "text",
                text: (useEmotion ?
                    `${chatPrompt} \n 你的情感倾向——${emotionPrompt.replace(/\n/g, "").replace(/\s+/g, "")}`
                    : chatPrompt) as string,
            }],
        };
    }
    protected async commonRequestChat(groupId: number, request: Request, input: string, historyMessages: ChatHistory[] = [], useSystemRole = true): Promise<ChatResponse> {
        if (useSystemRole) {
            const promptName = ConfigKits.checkSpecificGroupPrompt(groupId, config.autoReply.chatPromptApply, config.autoReply.groupChatPromptApply);
            var systemContent = await this.generateSystemContent(groupId, config.autoReply.useEmotion, config.autoReply.chatPrompts.find(p => p.name == promptName)?.prompt);
            (request.options.body as RequestBody).messages.push(systemContent);
        }
        // 添加历史对话
        if (historyMessages && historyMessages.length > 0) {
            historyMessages.forEach((msg) => {
                // 不是图片时添加
                (request.options.body as RequestBody).messages.push({
                    role: msg.role,
                    content: JSON.stringify(msg.toJSON())
                });
            });
        }
        if (input != null)
            (request.options.body as RequestBody).messages.push({ role: "user", content: input });
        if (config.autoReply.debugMode)
            logger.info(`[OpenAI]对话模型 ${(request.options.body as RequestBody).model} API调用，请求内容：${JSON.stringify(request, null, 2)}`);
        try {
            request.options.body = JSON.stringify(request.options.body);
            // const response = await fetch(request.url, request.options as RequestInit);
            const response = await axios.post(request.url, request.options.body, {
                headers: request.options.headers,
                httpAgent: request.options.agent,
                httpsAgent: request.options.agent,
            });
            const data = response.data;
            if (response.status === 200) {
                return { ok: true, data: data?.choices?.[0]?.message?.content };
            } else {
                logger.error(`[OpenAI]对话模型调用失败：`, JSON.stringify(data, null, 2));
                return { ok: false, error: `[OpenAI]对话模型调用失败，详情请查阅控制台。` };
            }
        } catch (error) {
            logger.error(`[OpenAI]对话模型调用失败`, error);
            return { ok: false, error: `[OpenAI]对话模型调用失败，详情请查阅控制台。` };
        }
    }

    protected async commonRequestVisual(groupId: number, request: Request, nickeName: string, j_msg: ComplexJMsg, historyMessages?: ChatHistory[], useSystemRole: boolean = true): Promise<ChatResponse> {
        if (useSystemRole) {
            const promptName = ConfigKits.checkSpecificGroupPrompt(groupId, config.autoReply.chatPromptApply, config.autoReply.groupChatPromptApply);
            var systemContent = await this.generateSystemContentVisual(groupId, config.autoReply.useEmotion, config.autoReply.chatPrompts.find(p => p.name == promptName)?.prompt);
            (request.options.body as RequestBody).messages.push(systemContent);
        }
        // 添加历史对话
        if (historyMessages && historyMessages.length > 0) {
            historyMessages.forEach((history) => {
                (request.options.body as RequestBody).messages.push({
                    role: history.role,
                    content: JSON.stringify(history.toJSON())
                });
            });
        }

        (request.options.body as RequestBody).messages.push({ role: "user", content: content });
        if (config.autoReply.debugMode) {
            // 创建打印用副本
            var logRequest = JSON.parse(JSON.stringify(request));
            logRequest.options.body.messages.forEach((message: any) => {
                var content = message.content;
                content.forEach((item: any) => {
                    if (item.type == "image_url") {
                        // 截断前40位
                        item.image_url.url = item.image_url.url.substring(0, 40) + "...";
                    }
                    /*
                    if (item.type == "text" && item.text.length > 40) {
                        item.text = item.text.substring(0, 40) + "...";
                    }
                    */
                });
            });

            logger.info(`[OpenAI]视觉模型 ${logRequest.options.body.model} API调用，请求内容：${JSON.stringify(logRequest, null, 2)}`);
        }
        try {
            request.options.body = JSON.stringify(request.options.body);
            const response = await fetch(request.url, request.options as RequestInit);
            const data = await response.json();
            if (response.ok) {
                return { ok: response.ok, data: data?.choices?.[0]?.message?.content };
            } else {
                logger.error("[OpenAI]视觉模型API调用失败：", JSON.stringify(data, null, 2));
                return { ok: response.ok, error: "[OpenAI]视觉模型API调用失败，详情请查阅控制台。" };
            }
        } catch (error) {
            logger.error("[OpenAI]视觉模型API调用失败", error);
            return { ok: false, error: "[OpenAI]视觉模型API调用失败，详情请查阅控制台。" };
        }
    }

    /**
     * 工具请求
     * @param {*} request
     * @param {*} j_msg:{img:[],text:[]}
     */
    protected async commonRequestTool(request: Request, j_msg: { img?: string[], text: string[] }) {
        var content: any[] = [];
        if (!Objects.isNull(j_msg.img)) {
            j_msg.img.forEach((base64) => {
                content.push({
                    type: "image_url",
                    image_url: { detail: "auto", url: base64 },
                });
            });
        }
        if (!Objects.isNull(j_msg.text)) {
            j_msg.text.forEach((text) => {
                content.push({ type: "text", text: text });
            });
        }
        (request.options.body as RequestBody).messages.push({ role: "user", content: content });

        if (config.autoReply.debugMode) {
            // 创建打印用副本
            var logRequest: Request = JSON.parse(JSON.stringify(request));
            (logRequest.options.body as RequestBody).messages.forEach((message: any) => {
                var content = message.content;
                content.forEach((item: any) => {
                    if (item.type == "image_url") {
                        // 截断前40位
                        item.image_url.url = item.image_url.url.substring(0, 40) + "...";
                    }
                    /*
                    if (item.type == "text" && item.text.length > 40) {
                        item.text = item.text.substring(0, 40) + "...";
                    }
                    */
                });
            });
            logger.info(`[OpenAI]视觉模型 ${(logRequest.options.body as RequestBody).model} API工具请求调用，请求内容：${JSON.stringify(logRequest, null, 2)}`);
        }
        try {
            request.options.body = JSON.stringify(request.options.body);
            const response = await fetch(request.url, request.options as RequestInit);
            const data = await response.json();
            if (response.ok) {
                return { ok: response.ok, data: data?.choices?.[0]?.message?.content }
            } else {
                logger.error(`[OpenAI]视觉模型API工具请求调用失败: ${JSON.stringify(data, null, 2)}`);
                return { ok: response.ok, error: "[OpenAI]视觉模型API工具请求调用失败，详情请查阅控制台。" };
            }
        } catch (error) {
            logger.error("[OpenAI]视觉模型API工具请求调用失败", error);
            return { ok: false, error: "[OpenAI]视觉模型API工具请求调用失败，详情请查阅控制台。" };
        }
    }
}
