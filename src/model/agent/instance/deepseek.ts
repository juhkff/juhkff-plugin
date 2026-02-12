import axios from "axios";
import { config } from "../../../config/index.js";
import { ComplexJMsg, HistoryComplexJMsg, Request, RequestBody } from "../../../types/index.js";
import { OpenAI } from "../openaiAgent.js";
import { ConfigKits } from "../../../utils/kits.js";

export class DeepSeek extends OpenAI {
    constructor(apiKey: { name: string, apiKey: string, enabled: boolean }[]) { super(apiKey, "https://api.deepseek.com"); }
    static hasVisual = () => false;

    public async chatModels(): Promise<Record<string, Function> | undefined> {
        return {
            "deepseek-chat": this.deepseek_chat.bind(this),
            "deepseek-reasoner": this.deepseek_reasoner.bind(this),
        };
    }

    private async deepseek_chat(groupId: number, request: Request, input: string, historyMessages: any[] = [], useSystemRole = true) {
        return await this.doRequest(groupId, request, input, historyMessages, useSystemRole, "V3");
    }

    private async deepseek_reasoner(groupId: number, request: Request, input: string, historyMessages: any[] = [], useSystemRole = true) {
        const result = await this.doRequest(groupId, request, input, historyMessages, useSystemRole, "R1");
        if (result && result.ok) return result;
        // R1 失败，回退到 V3
        return await this.fallbackToV3(groupId, request, input, historyMessages, useSystemRole);
    }

    private async doRequest(groupId: number, request: Request, input: string, historyMessages: any[] = [], useSystemRole = true, tag: string) {
        // 添加消息内容
        if (useSystemRole) {
            const promptName = ConfigKits.checkSpecificGroupPrompt(groupId, config.autoReply.chatPromptApply, config.autoReply.groupChatPromptApply);
            let systemContent = await this.generateSystemContent(groupId, config.autoReply.useEmotion, config.autoReply.chatPrompts.find(p => p.name == promptName)?.prompt);
            (request.options.body as RequestBody).messages.push(systemContent);
        }
        // 添加历史对话
        if (historyMessages && historyMessages.length > 0) {
            historyMessages.forEach((msg) => {
                // 不是图片时添加
                if (!msg.imageBase64) {
                    (request.options.body as RequestBody).messages.push({ role: msg.role, content: msg.content });
                }
            });
        }
        // 添加当前对话
        if (input != null)
            (request.options.body as RequestBody).messages.push({ role: "user", content: input });
        logger.info(`[ds]DeepSeek-${tag} API调用，请求内容：${JSON.stringify(request, null, 2)}`);
        try {
            request.options.body = JSON.stringify(request.options.body);
            const response = await axios.post(request.url, request.options.body, {
                headers: request.options.headers,
                httpAgent: request.options.agent,
                httpsAgent: request.options.agent,
            })
            const data = response.data;
            if (response && response.status === 200) {
                return { ok: true, data: data?.choices?.[0]?.message?.content };
            } else {
                logger.error(`[ds]DeepSeek-${tag}调用失败：`, JSON.stringify(data, null, 2));
                return { ok: false, error: `[ds]DeepSeek-${tag}调用失败，详情请查阅控制台。` };
            }
        } catch (error) {
            logger.error(`[ds]DeepSeek-${tag}调用失败`, error);
            return { ok: false, error: `[ds]DeepSeek-${tag}调用失败，详情请查阅控制台。` };
        }
    }

    /**
     * R1 失败时回退到 V3，构建全新的请求体避免复用已序列化的 body
     */
    private async fallbackToV3(groupId: number, originalRequest: Request, input: string, historyMessages: any[], useSystemRole: boolean) {
        logger.info("[ds]DeepSeek-R1 失败，回退到 DeepSeek-V3");
        const fallbackRequest: Request = {
            url: originalRequest.url,
            options: {
                method: "POST",
                headers: { ...originalRequest.options.headers },
                body: {
                    model: "deepseek-chat",
                    messages: [],
                    stream: false,
                    temperature: 1.5,
                },
            },
        };
        if (originalRequest.options.agent) fallbackRequest.options.agent = originalRequest.options.agent;
        return await this.deepseek_chat(groupId, fallbackRequest, input, historyMessages, useSystemRole);
    }

    // DeepSeek 不支持视觉模型
    visualRequest(groupId: number, model: string, nickName: string, j_msg: ComplexJMsg, historyMessages?: HistoryComplexJMsg[], useSystemRole?: boolean): Promise<any> {
        return undefined;
    }
    toolRequest(model: string, j_msg: { img?: string[], text: string[] }): Promise<any> {
        return undefined;
    }
    visualModels(): Promise<Record<string, any> | undefined> {
        return undefined;
    }
}
