import { OpenAI } from "../openaiAgent.js";
export class ArkEngine extends OpenAI {
    constructor(apiKey) {
        super(apiKey);
    }
    static hasVisual = () => true;
    async chatModels() {
        return {
            "doubao-1-5-pro-32k-250115": null,
            "doubao-1-5-thinking-pro-250415": null,
            "deepseek-r1-250120": null,
            "输入其它或自定义模型（请勿选择该项）": null
        };
    }
    async visualModels() {
        return {
            "doubao-1.5-vision-pro-250328": null,
            "doubao-1-5-thinking-vision-pro-250428": null,
            "doubao-seed-1-6-250615": null,
            "doubao-seed-1-6-thinking-250615": null,
            "doubao-seed-1-6-flash-250615": null,
            "输入其它或自定义模型（请勿选择该项）": null
        };
    }
    postProcessChatResponse(data) {
        // 调用返回结果的头尾容易有换行符，进行处理
        return data?.replace(/^\n+|\n+$/g, "");
    }
}
