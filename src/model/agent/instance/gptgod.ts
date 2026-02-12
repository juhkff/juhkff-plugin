import { OpenAI } from "../openaiAgent.js";

export class GPTGod extends OpenAI {
    constructor(apiKey: { name: string, apiKey: string, enabled: boolean }[]) {
        super(apiKey);
    }
    static hasVisual = () => true;

    async chatModels(): Promise<Record<string, Function> | undefined> {
        return {
            "输入其它或自定义模型（请勿选择该项）": null
        };
    }
    async visualModels(): Promise<Record<string, { chat: Function; tool: Function; }> | undefined> {
        return {
            "输入其它或自定义模型（请勿选择该项）": null
        }
    }

    protected postProcessChatResponse(data: any): any {
        // 调用返回结果的头尾容易有换行符，进行处理
        return data?.replace(/^\n+|\n+$/g, "");
    }
}
