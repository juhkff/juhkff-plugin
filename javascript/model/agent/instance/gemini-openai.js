import { OpenAI } from "../openaiAgent.js";
export class GeminiOpenAI extends OpenAI {
    constructor(apiKey) { super(apiKey); }
    static hasVisual = () => true;
    async visualModels() {
        return {
            "gemini-2.5-flash-preview-04-17": null,
            "gemini-2.5-pro-preview-05-06": null,
            "gemini-2.5-pro-exp-03-25": null,
            "gemini-2.0-flash": null,
            "输入其它模型（请勿选择该项）": null
        };
    }
    async chatModels() {
        return {
            "gemini-2.5-flash-preview-04-17": null,
            "gemini-2.5-pro-preview-05-06": null,
            "gemini-2.5-pro-exp-03-25": null,
            "gemini-2.0-flash": null,
            "输入其它模型（请勿选择该项）": null
        };
    }
    postProcessChatResponse(data) {
        // 调用返回结果的头尾容易有换行符，进行处理
        return data?.replace(/^\n+|\n+$/g, "");
    }
}
