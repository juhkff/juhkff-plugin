import { changePrompt, ChatApiType } from "../config/define/autoReply.js";
import { config } from "../config/index.js";
import { ChatResponse } from "../model/agent/chatAgent.js";
import { transformTextToVoice } from "../plugin/siliconflow.js";
import { generateAnswer, parseAt, parseImage, parseJson, parseUrl, saveContext } from "../utils/handle.js";
import { generateAnswerVisual, parseImageVisual, parseJsonVisual, parseTextVisual, parseUrlVisual, saveContextVisual } from "../utils/handleVisual.js";
import { ChatKits, Objects, Thread } from "../utils/kits.js";

export const help = () => {
    return {
        name: "主动群聊",
        type: "passive",
        dsc: "假装人类发言",
        enable: config.autoReply.useAutoReply,
    }
}

/**
 * 主动群聊插件
 * @author Bilibili - 扎克芙芙
 */
export class autoReply extends plugin {
    // 构建正则匹配等
    constructor() {
        super({
            name: "[扎克芙芙]主动回复群聊",
            dsc: "主动回复群聊",
            event: "message",
            priority: 9999, // 优先级，越小越先执行
            rule: [
                {
                    reg: "^((?!#).)*$", // 匹配所有非#开头的文本
                    fnc: "autoReply",
                    log: false,
                },
                {
                    reg: "^#聊天预设切换.*",
                    fnc: "switchChatPreset",
                    log: false,
                }
            ],
        });
    }

    async autoReply(e: E) {
        if (!config.autoReply.useAutoReply) return false;
        if (e.message_type != "group") return false;
        await ChatKits.saveGroupDict(e);
        if (config.autoReply.chatApiType.includes(ChatApiType.VISUAL)) {
            await this.visualProcess(e);
        } else {
            await this.commonProcess(e);
        }
    }

    async switchChatPreset(e: E) {
        if (e.sender.role != "owner" && e.sender.role != "admin") {
            return e.reply("只有群主或管理员可以切换聊天预设");
        }
        const promptName = e.msg.replace(/^#聊天预设切换\s*/, "").trim();
        if (!promptName) {
            return e.reply("请指定要切换的聊天预设名称");
        }
        if (!config.autoReply.chatPrompts.some(p => p.name === promptName)) {
            return e.reply(`没有找到名为 "${promptName}" 的聊天预设`);
        }
        changePrompt(promptName);
        await e.reply(`已切换聊天预设为 "${promptName}"`);
    }

    /**
     * @description: 通用处理（不使用视觉模型覆盖原接口）
     * @param {*} e
     * @returns
     */
    async commonProcess(e: any) {
        // 避免重复保存上下文
        // 借助siliconflow-plugin保存群聊上下文
        var time = Date.now();
        // let chatDate = formatDateDetail(time);
        await parseImage(e);
        // 处理引用消息，获取图片和文本
        // await parseSourceMessage(e);
        // 处理分享链接
        await parseJson(e);
        // 处理@信息
        await parseAt(e);
        if (config.autoReply.attachUrlAnalysis) {
            // 处理URL
            await parseUrl(e);
        }
        // 通过自定义的e.j_msg拼接完整消息内容
        var msg = e.j_msg.filter((msg: any) => msg.hasOwnProperty("text")).map((msg: { text: string }) => msg.text.trim()).join(" ");
        logger.debug(`[autoReply]解析后的消息内容: ${msg}`);

        if (msg) msg = msg.trim();
        if (Objects.isNull(msg)) {
            // logger.info('[潜伏模板]非通常消息，不回复')
            return false;
        }

        var chatRate = config.autoReply.defaultChatRate; // 主动回复概率
        var replyAtBot = config.autoReply.defaultReplyAtBot; // 是否回复@机器人的消息
        // 如果 groupRate 配置存在且不为空
        if (config.autoReply.groupChatRate && config.autoReply.groupChatRate.length > 0) {
            for (var each of config.autoReply.groupChatRate) {
                // 确保 config.groupList 是数组，以避免 undefined 的情况
                if (
                    Array.isArray(each.groupList) &&
                    each.groupList.includes(e.group_id)
                ) {
                    // if(config.chatRate) 会将0概率认为是为false，改成如下写法
                    if (each.chatRate !== undefined && each.chatRate !== null)
                        chatRate = each.chatRate;
                    if (each.replyAtBot !== undefined && each.replyAtBot !== null)
                        replyAtBot = each.replyAtBot;
                    break;
                }
            }
        }

        var answer: ChatResponse;
        var answer_time = undefined;
        // 如果@了bot，就直接回复
        if ((e.atBot && replyAtBot) || Math.random() < Number(chatRate)) {
            answer = await generateAnswer(e, msg);
            if (!e.atBot && !answer.ok) {
                // 如果自主发言失败不提示
            } else {
                await this.handleReply(e, answer.data);
                answer_time = Date.now();
            }
        }
        if (config.autoReply.useContext) {
            // 保存用户消息;
            await saveContext(time, e, "user", msg);
            // 保存AI回复
            if (answer.ok) {
                await saveContext(answer_time, e, "assistant", answer.data);
            }
        }
        return false;
    }

    /**
     * @description: 视觉模型处理
     * @param {*} e
     */
    async visualProcess(e: any) {
        // 避免重复保存上下文
        // 借助siliconflow-plugin保存群聊上下文
        var time = Date.now();
        await parseImageVisual(e);
        // 处理引用消息，获取图片和文本
        // await parseSourceMessageVisual(e);
        // 处理分享链接
        await parseJsonVisual(e);
        if (config.autoReply.attachUrlAnalysis) {
            // 处理URL
            await parseUrlVisual(e);
        }
        // 通过自定义的e.j_msg拼接完整消息内容
        await parseTextVisual(e);

        // 排除 notProcessed 内容如果均为空，则跳过
        const content = { img: e.j_msg.img, sourceImg: e.j_msg.sourceImg, sourceText: e.j_msg.sourceText, text: e.j_msg.text };
        if (Objects.isNull(content)) {
            return false;
        }
        var chatRate = config.autoReply.defaultChatRate; // 主动回复概率
        var replyAtBot = config.autoReply.defaultReplyAtBot; // 是否回复@机器人的消息
        // 如果 groupRate 配置存在且不为空
        if (config.autoReply.groupChatRate && config.autoReply.groupChatRate.length > 0) {
            for (var each of config.autoReply.groupChatRate) {
                // 确保 config.groupList 是数组，以避免 undefined 的情况
                if (
                    Array.isArray(each.groupList) &&
                    each.groupList.includes(e.group_id)
                ) {
                    // if(config.chatRate) 会将0概率认为是为false，改成如下写法
                    if (each.chatRate !== undefined && each.chatRate !== null)
                        chatRate = each.chatRate;
                    if (each.replyAtBot !== undefined && each.replyAtBot !== null)
                        replyAtBot = each.replyAtBot;
                    break;
                }
            }
        }

        var answer: ChatResponse;
        var answer_time = undefined;
        // 如果@了bot，就直接回复
        if ((e.atBot && replyAtBot) || Math.random() < Number(chatRate)) {
            answer = await generateAnswerVisual(e);
            if (!e.atBot && !answer.ok) {
                // 如果自主发言失败不提示
            } else {
                await this.handleReply(e, answer.data);
                answer_time = Date.now();
            }
        }
        if (config.autoReply.useContext) {
            // 保存用户消息
            await saveContextVisual(time, e, "user");
            // 保存AI回复
            if (answer.ok) {
                await saveContextVisual(answer_time, e, "assistant");
            }
        }
        return false;
    }

    /**
     * 对已经生成的消息进行发送前处理
     * @param {*} e 
     * @param {*} content 
     */
    async handleReply(e: any, content: string) {
        // 插件功能联动相关
        const voiceBase64 = await transformTextToVoice(e, content);
        if (!Objects.isNull(voiceBase64)) {
            logger.info("[autoReply]语音生成成功，文字内容: " + content);
            await e.reply(segment.record(`base64://${voiceBase64}`));
            return;
        }
        // 如果为连续短句，概率间隔发送，感觉这样更真实一点
        if (content.split(" ").length > 1 && content.split(" ").length < 4 && Math.random() < 0.5) {
            var contentList = content.split(" ");
            for (var i = 0; i < contentList.length; i++) {
                var each = contentList[i];
                await e.reply(each);
                await Thread.sleep((-0.5 + Math.random()) * 2 * 1000 * 4 + 5000);  // 随机延迟，范围(1s,9s)
            }
            return;
        }
        await e.reply(content);
    }
}
