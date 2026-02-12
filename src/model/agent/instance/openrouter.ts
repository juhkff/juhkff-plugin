import { OpenAI } from "../openaiAgent.js";

export class OpenRouter extends OpenAI {
    constructor(apiKey: { name: string, apiKey: string, enabled: boolean }[]) { super(apiKey, "https://openrouter.ai/api/v1"); }

    static hasVisual = () => true;

    async chatModels(): Promise<Record<string, Function> | undefined> {
        // List available models (GET /models)
        const response = await fetch(`${this.apiUrl}/models`, {
            method: "GET",
            headers: {},
        });
        const body = await response.json();
        let modelMap: Record<string, Function> = {};
        let models = body.data;
        for (const model of models) {
            modelMap[model.id] = this.commonRequestChat.bind(this);
        }
        modelMap["输入其它模型（请勿选择该项）"] = null;
        return modelMap;
    }

    async visualModels(): Promise<Record<string, { chat: Function; tool: Function; }> | undefined> {
        const response = await fetch(`${this.apiUrl}/models`, {
            method: "GET",
            headers: {},
        });
        const body = await response.json();
        let modelMap: Record<string, { chat: Function; tool: Function; }> = {};
        let models = body.data;
        // 过滤视觉模型
        models = models.filter((model: { architecture: { input_modalities: string[], output_modalities: string[] } }) =>
            OpenRouter.just_text_response(model.architecture.output_modalities) &&
            model.architecture.input_modalities.includes("image"));
        for (const model of models) {
            modelMap[model.id] = {
                chat: this.commonRequestVisual.bind(this),
                tool: this.commonRequestTool.bind(this)
            }
        }
        modelMap["输入其它模型（请勿选择该项）"] = null;
        return modelMap;
    }

    /**
     * 判断输出是否只有文字，目前其实也只有文字，但以防万一在这里做个过滤
     * @param output_modalities 输出类型
     * @returns 只有 "text"
     */
    static just_text_response(output_modalities: string[]) {
        return output_modalities.length == 1 && output_modalities[0] == "text";
    }
}
