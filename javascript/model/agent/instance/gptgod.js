import { OpenAI } from "../openaiAgent.js";
export class GPTGod extends OpenAI {
    constructor(apiKey) {
        super(apiKey);
    }
    static hasVisual = () => true;
    async chatModels() {
        return {
            "输入其它或自定义模型（请勿选择该项）": null
        };
    }
    async visualModels() {
        return {
            "输入其它或自定义模型（请勿选择该项）": null
        };
    }
    postProcessChatResponse(data) {
        // 调用返回结果的头尾容易有换行符，进行处理
        return data?.replace(/^\n+|\n+$/g, "");
    }
}
