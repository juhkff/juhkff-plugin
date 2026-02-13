import { config } from "../config/index.js"
import { ChatHistory } from "../db/index.js";
import { agent } from "../model/map.js";
import { Objects } from "../utils/kits.js";

// export const help = () => {
//     return {
//         name: "命令预设",
//         type: "active",
//         dsc: "根据预设和群BOT进行情景互动",
//         enable: config.commandPrompt.useCommandPrompt,
//     }
// }

export class commandPrompt extends plugin {
    constructor() {
        super({
            name: "[扎克芙芙]情景预设",
            dsc: "根据预设和群BOT进行情景互动",
            event: "message",
            priority: 9999, // 优先级，越小越先执行
            rule: [
                {
                    reg: "^#.*", // 仅匹配#开头的文本
                    fnc: "commandPrompt",
                    log: false,
                },
            ],
        })
    }

    async commandPrompt(e: E) {
        let content = e.msg;
        content = content.replace(/^#+/, '');
        if (!config.commandPrompt.useCommandPrompt || Objects.isNull(content)) return false;
        const command = config.commandPrompt.commandDict.find(cmdObj => cmdObj.cmd === content);
        if (!command) return false;
        const reqText = command.prompt[Math.floor(Math.random() * command.prompt.length)].text;
        if (!agent.chat) return "请开启主动群聊并设置有效的AI接口";
        const cmdMsg: ChatHistory[] = [];
        cmdMsg.push(ChatHistory.build({ content: reqText, messageId: String(e.message_id), role: "assistant" }));
        const result = await agent.chat.chatRequest(e.group_id, config.autoReply.chatModel, null, cmdMsg, false);
        if (!result.ok) return false;
        cmdMsg.push(ChatHistory.build({ content: result.data, messageId: null, role: "assistant" }));
        await e.reply(result.data);
        while (true) {
            const ue = await this.awaitContext(true, command.timeout) as E;
            if (typeof ue === "boolean" && ue === false) {
                if (!Objects.isNull(command.timeoutChat))
                    await e.reply(command.timeoutChat);
                break;
            }
            // 不知道怎么写好，先这么写了
            this.finish("resolveContext", true);
            const { msg: text } = ue;
            if (text === "#结束") break;
            const history: ChatHistory[] = [];
            for (let i = 0; i < cmdMsg.length; i++)
                history.push(ChatHistory.build({ role: cmdMsg[i].role, messageId: cmdMsg[i].messageId, content: cmdMsg[i].content }));
            cmdMsg.push(ChatHistory.build({ content: text, messageId: String(ue.message_id), role: "user" }));
            const result = await agent.chat.chatRequest(ue.group_id, config.autoReply.chatModel, text, history, false)
            if (!result.ok) return false;
            if (!Objects.isNull(command.finishMsg)) {
                const finishMsgList = command.finishMsg.split("|");
                for (const each of finishMsgList) {
                    if (result.data.includes(each.trim())) {
                        await ue.reply(result.data);
                        return true;
                    }
                }
            }
            cmdMsg.push(ChatHistory.build({ content: result.data, messageId: null, role: "assistant" }));
            await ue.reply(result.data);
        }
        return true;
    }
}

/*
function extractText(message: [{ type: string, text?: string }]) {
    return message.filter(item => item.type === "text" && typeof item.text === "string").map(item => item.text as string).join("");
}
*/
