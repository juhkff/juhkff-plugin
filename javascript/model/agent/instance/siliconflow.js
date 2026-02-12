import { OpenAI } from "../openaiAgent.js";
export class Siliconflow extends OpenAI {
    constructor(apiKey) { super(apiKey, "https://api.siliconflow.cn/v1"); }
    static hasVisual = () => true;
    async visualModels() {
        // TODO SF官网的API竟然不能查询特定Tag，只能自己写在这了，时不时更新一下
        return {
            "Qwen/Qwen2.5-VL-72B-Instruct": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "Pro/Qwen/Qwen2.5-VL-7B-Instruct": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "Qwen/QVQ-72B-Preview": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "Qwen/Qwen2-VL-72B-Instruct": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "deepseek-ai/deepseek-vl2": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "Pro/Qwen/Qwen2-VL-7B-Instruct": {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this),
            },
            "输入其它模型（请勿选择该项）": null
        };
    }
    async chatModels() {
        let response;
        for (const eachKey of this.apiKey.filter((key) => key.enabled)) {
            response = await fetch(`${this.apiUrl}/models?type=text`, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${eachKey.apiKey}`,
                },
            });
            if (response && response.ok) {
                const modelMap = {};
                const models = await response.json();
                for (const model of models.data) {
                    modelMap[model.id] = this.commonRequestChat.bind(this);
                }
                modelMap["输入其它模型（请勿选择该项）"] = null;
                return modelMap;
            }
        }
        if (this.apiKey.length > 0) {
            const error = await response?.json();
            logger.error(`Siliconflow: 获取模型列表失败，${JSON.stringify(error, null, 2)}`);
            return {};
        }
    }
}
