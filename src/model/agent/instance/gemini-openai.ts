import { OpenAI } from "../openaiAgent.js";

export class GeminiOpenAI extends OpenAI {
    constructor(apiKey: { name: string, apiKey: string, enabled: boolean }[]) { super(apiKey); }
    static hasVisual = () => true;

    public async visualModels(): Promise<Record<string, { chat: Function, tool: Function }> | undefined> {
        return {
            "gemini-2.5-flash-preview-04-17": null,
            "gemini-2.5-pro-preview-05-06": null,
            "gemini-2.5-pro-exp-03-25": null,
            "gemini-2.0-flash": null,
            "输入其它模型（请勿选择该项）": null
        };
    }
    public async chatModels(): Promise<Record<string, Function> | undefined> {
        return {
            "gemini-2.5-flash-preview-04-17": null,
            "gemini-2.5-pro-preview-05-06": null,
            "gemini-2.5-pro-exp-03-25": null,
            "gemini-2.0-flash": null,
            "输入其它模型（请勿选择该项）": null
        };
    }

    protected postProcessChatResponse(data: any): any {
        // 调用返回结果的头尾容易有换行符，进行处理
        return data?.replace(/^\n+|\n+$/g, "");
    }
}
