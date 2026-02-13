/**
 * @file handle.js
 * @description: 原始消息处理相关
 */
import { emotionGenerate } from "../bgProcess/jobs.js";
import { config } from "../config/index.js";
import { EMOTION_KEY } from "../model/constant.js";
import { agent } from "../model/map.js";
import { formatDateDetail } from "./date.js";
import { extractUrlContent } from "./helper.js";
import { Objects } from "./kits.js";
import { url2Base64 } from "./net.js";
import { getSourceMessage } from "./message_history.js";
import { ChatHistory } from "../db/models/chat_history.js";
/**
 * 视觉模型版handle：由于会生成插件专属消息处理列表j_msg，该方法必须作为消息处理的第一个函数
 * @param {} e
 */
export async function parseImageVisual(e) {
    if (!e.j_msg)
        e.j_msg = {
            sourceImg: [],
            sourceText: "",
            img: [],
            text: "",
            notProcessed: e.message.slice(),
        };
    for (let i = 0; i < e.j_msg.notProcessed.length; i++) {
        if (e.j_msg.notProcessed[i].type == "image") {
            // 使用视觉AI处理群聊回复的话就直接把img2base64存起来
            var url = e.j_msg.notProcessed[i].url;
            var base64 = await url2Base64(url);
            e.j_msg.img.push(base64);
            e.j_msg.notProcessed.splice(i, 1);
            i--;
        }
    }
}
/**
 * 视觉模型版handle：确保该方法在parseImage之后执行
 * @param {*} e
 * @returns
 */
export async function parseSourceMessageVisual(e) {
    if (!e.j_msg)
        return;
    for (let i = 0; i < e.j_msg.notProcessed.length; i++) {
        if (e.j_msg.notProcessed[i].type === "reply") {
            // 优先从redis中获取引用消息
            var redis_source = await getSourceMessage(e.group_id, e.j_msg.notProcessed[i].id, true);
            if (redis_source != undefined) {
                // TODO 目前只考虑一层回复，多层回复嵌套的情况先不考虑实现
                if (!Objects.isNull(redis_source.content.img)) {
                    redis_source.content.img.forEach((base64) => {
                        e.j_msg.sourceImg.push(base64);
                    });
                }
                if (!Objects.isNull(redis_source.content.text)) {
                    e.j_msg.sourceText = `[引用 ${redis_source.time} - ${redis_source.nickName}：${redis_source.content.text}]`;
                }
                e.j_msg.notProcessed.splice(i, 1);
                i--;
                continue;
            }
            var reply = await e.getReply(e.j_msg.notProcessed[i].id);
            if (reply) {
                let senderTime = undefined; // 存储发送者时间
                let senderNickname = ""; // 存储发送者昵称
                var msg = []; // 收集文本消息
                // 获取发送者昵称和时间
                senderTime = formatDateDetail(reply.time * 1000);
                senderNickname = reply.sender?.card || reply.sender?.nickname;
                for (var val of reply.message) {
                    if (val.type == "image") {
                        // 使用视觉AI处理群聊回复的话就直接把img2base64存起来
                        var url = val.url;
                        var base64 = await url2Base64(url);
                        e.j_msg.sourceImg.push(base64);
                    }
                    else if (val.type == "text") {
                        msg.push(val.text);
                    }
                    else if (val.type == "file") {
                        // 不支持消息中的文件
                        continue;
                    }
                    else if (val.type == "json") {
                        var result = analyseJsonMessage(val.data);
                        if (result) {
                            msg.push(result);
                        }
                    }
                    else if (val.type == "reply") {
                        // TODO 重复嵌套回复暂时跳过不处理，后面可以考虑怎么完善这里的处理
                    }
                }
                var quotedLines;
                if (msg.length <= 0) {
                    quotedLines = "不支持显示的消息内容";
                }
                else {
                    quotedLines = msg.map((line) => `${line}`).join(" ");
                }
                e.j_msg.sourceText = `[引用 ${senderTime} - ${senderNickname}：${quotedLines}]`;
            }
            e.j_msg.notProcessed.splice(i, 1);
            i--;
        }
    }
    return e;
}
/**
 * 确保该方法在parseImage之后执行
 * @param {} e
 * @returns
 */
export async function parseJsonVisual(e) {
    if (!e.j_msg)
        return;
    for (let i = 0; i < e.j_msg.notProcessed.length; i++) {
        if (e.j_msg.notProcessed[i].type === "json") {
            var result = analyseJsonMessage(e.j_msg.notProcessed[i].data);
            if (result) {
                e.j_msg.notProcessed[i] = { text: result, type: "json2text" };
            }
        }
    }
}
function analyseJsonMessage(message) {
    try {
        let data = JSON.parse(message);
        if (data.meta?.detail_1?.title === "哔哩哔哩") {
            return `<分享链接，链接内容的分析结果——${data.prompt}>`;
        }
        else if (data.meta?.news?.tag === "小黑盒") {
            return `<分享链接，链接内容的分析结果——标题：${data.meta?.news?.title}，内容：${data.meta?.news?.desc}>`;
        }
        return null;
    }
    catch (error) {
        logger.error(`[analyseJsonMessage] JSON解析错误: ${error}`);
        return null;
    }
}
/**
 * 确保该方法在parseImage之后执行
 * @param {*} e
 * @returns
 */
export async function parseUrlVisual(e) {
    if (!e.j_msg)
        return;
    // 更新正则表达式以匹配包含中文和空格的URL
    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
    var matches;
    for (let i = 0; i < e.j_msg.notProcessed.length; i++) {
        if (e.j_msg.notProcessed[i].type === "text") {
            let message = e.j_msg.notProcessed[i].text;
            matches = message.match(urlRegex) || [];
            if (matches.length > 0) {
                // 替换原始消息
                for (let url of matches) {
                    // 移除URL末尾的标点符号和中文字符
                    let cleanUrl = url.replace(/[.,!?;:，。！？、；：\s\u4e00-\u9fa5]+$/, "");
                    // 处理URL中的空格和中文字符
                    try {
                        // 尝试解码URL，如果已经是解码状态则保持不变
                        cleanUrl = decodeURIComponent(cleanUrl);
                        // 重新编码空格和特殊字符，但保留中文字符
                        cleanUrl = cleanUrl.replace(/\s+/g, "%20").replace(/[[\](){}|\\^<>]/g, encodeURIComponent);
                    }
                    catch (e) {
                        // 如果解码失败，说明URL可能已经是正确格式
                        logger.warn(`[URL处理]URL解码失败: ${url} => ${cleanUrl}`);
                    }
                    // 跳过不需要提取内容的URL
                    if (isSkippedUrl(cleanUrl)) {
                        logger.info(`[URL处理]跳过URL: ${url} = ${cleanUrl}`);
                        continue;
                    }
                    logger.info(`[URL处理]开始处理URL: ${url} = ${cleanUrl}`);
                    const extractResult = await extractUrlContent(cleanUrl);
                    if (!Objects.isNull(extractResult)) {
                        logger.info(`[URL处理]成功提取URL内容`);
                        // 借助chatApi对提取的内容进行总结
                        var model = config.autoReply.chatModel;
                        // var result = await chatInstance[VisualInterface.toolRequest]({
                        let result = await agent.chat.toolRequest(model, { text: [extractResult.content, "根据从URL抓取的信息，以自然语言简练地总结URL中的主要内容，其中无关信息可以过滤掉"] });
                        e.j_msg.notProcessed[i].text = e.j_msg.notProcessed[i].text.replace(url, `<分享URL，URL内容的分析结果——${result}>`);
                        e.j_msg.notProcessed[i].type = "url2text";
                    }
                }
            }
        }
    }
}
export async function parseTextVisual(e) {
    let msg = "";
    // notProcessed 中的文本提取成一个 text
    if (e.j_msg.notProcessed && e.j_msg.notProcessed.length > 0) {
        for (let i = 0; i < e.j_msg.notProcessed.length; i++) {
            if (e.j_msg.notProcessed[i].hasOwnProperty("text")) {
                msg += e.j_msg.notProcessed[i].text.trim() + " ";
                e.j_msg.notProcessed.splice(i, 1);
                i--;
            }
            else if (e.j_msg.notProcessed[i].type == "at") {
                // 处理@消息
                if (e.j_msg.notProcessed[i].qq == "all") {
                    msg += "@全体成员 ";
                }
                else {
                    const qq = e.j_msg.notProcessed[i].qq;
                    const groupMember = e.bot.pickMember(e.group_id, qq);
                    const memberInfo = await groupMember.getInfo();
                    const memberName = memberInfo?.card || memberInfo?.nickname;
                    msg += `@${memberName} `;
                    e.j_msg.notProcessed.splice(i, 1);
                    i--;
                }
            }
        }
        msg = msg.trim();
    }
    e.j_msg.text = msg;
}
/**
 * 检查URL是否为不需要提取内容的文件类型
 * @param {string} url URL地址
 * @returns {boolean} 是否为不需要提取的文件类型
 */
function isSkippedUrl(url) {
    // 检查常见图片后缀
    const imageExtensions = /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|raw|cr2|nef|arw|dng|heif|heic|avif|jfif|psd|ai)$/i;
    // 检查常见视频后缀
    const videoExtensions = /\.(mp4|webm|mkv|flv|avi|mov|wmv|rmvb|m4v|3gp|mpeg|mpg|ts|mts)$/i;
    // 检查可执行文件和二进制文件
    const binaryExtensions = /\.(exe|msi|dll|sys|bin|dat|iso|img|dmg|pkg|deb|rpm|apk|ipa|jar|class|pyc|o|so|dylib)$/i;
    // 检查压缩文件
    const archiveExtensions = /\.(zip|rar|7z|tar|gz|bz2|xz|tgz|tbz|cab|ace|arc)$/i;
    // 检查是否包含媒体或下载相关路径关键词
    const skipKeywords = /\/(images?|photos?|pics?|videos?|medias?|downloads?|uploads?|binaries|assets)\//i;
    // 不跳过的URL类型
    const allowedExtensions = /(\.bilibili.com\/video|b23\.tv)\//i;
    return (!allowedExtensions.test(url) &&
        (imageExtensions.test(url) ||
            videoExtensions.test(url) ||
            binaryExtensions.test(url) ||
            archiveExtensions.test(url) ||
            skipKeywords.test(url)));
}
/**
 *
 * @param e
 * @returns 回复内容
 */
export async function generateAnswerVisual(e) {
    let model = config.autoReply.chatModel;
    if (!model || model == "") {
        logger.error("[handleVisual]请先设置model");
        return { ok: false, error: "[handleVisual]请先设置model" };
    }
    // 获取历史对话
    let historyMessages = [];
    if (config.autoReply.useContext) {
        historyMessages = await loadContextVisual(e.group_id);
        logger.info(`[handleVisual]加载历史对话: ${historyMessages.length} 条`);
    }
    // 如果启用了情感，并且redis中不存在情感，则进行情感生成
    if (config.autoReply.useEmotion && Objects.isNull(await redis.get(EMOTION_KEY))) {
        const emotion = await emotionGenerate();
        if (emotion.ok) {
            redis.set(EMOTION_KEY, emotion.data, { EX: 24 * 60 * 60 });
        }
    }
    const response = await sendChatRequestVisual(e.group_id, e.j_msg, e.sender.card, model, historyMessages);
    if (response.ok) {
        // 将多个空格合并
        response.data = response.data.replace(/\s+/g, " ");
        // 使用正则表达式去掉字符串 content 头尾的换行符
        response.data = response.data.replace(/^\n+|\n+$/g, "");
    }
    return response;
}
/**
 *
 * @param j_msg 插件自定义消息结构体
 * @param nickName 发送者昵称
 * @param model 使用的API模型
 * @param historyMessages 历史消息
 * @param useSystemRole 是否使用system预设
 * @returns
 */
async function sendChatRequestVisual(groupId, j_msg, nickName, model = "", historyMessages = [], useSystemRole = true) {
    if (!agent.chat)
        return { ok: false, error: "[handleVisual]请设置有效的AI接口" };
    const result = await agent.chat.visualRequest(groupId, model, nickName, j_msg, historyMessages, useSystemRole);
    return result;
}
// 保存对话上下文
export async function saveContextVisual(time, date, groupId, message_id = 0, role, nickName, j_msg) {
    try {
        const maxHistory = config.autoReply.maxHistoryLength;
        // 保存新消息
        await ChatHistory.create({
            groupId: String(groupId),
            messageId: String(message_id),
            role: role,
            nickName: nickName,
            dateStr: typeof date === 'string' ? date : JSON.stringify(date),
            content: JSON.stringify(j_msg),
            type: 'visual',
            timestamp: typeof time === 'number' ? time : Date.now()
        });
        // 清理旧消息
        const count = await ChatHistory.count({ where: { groupId: String(groupId), type: 'visual' } });
        if (count > maxHistory) {
            const recordsToDelete = await ChatHistory.findAll({
                where: { groupId: String(groupId), type: 'visual' },
                order: [['timestamp', 'ASC']],
                limit: count - maxHistory,
                attributes: ['id']
            });
            if (recordsToDelete.length > 0) {
                await ChatHistory.destroy({
                    where: {
                        id: recordsToDelete.map(r => r.id)
                    }
                });
            }
        }
        return true;
    }
    catch (error) {
        logger.error("[handleVisual]保存上下文失败:", error);
        return false;
    }
}
// 加载群历史对话
export async function loadContextVisual(groupId) {
    try {
        const maxHistory = config.autoReply.maxHistoryLength;
        // 获取该群的所有消息
        const records = await ChatHistory.findAll({
            where: { groupId: String(groupId), type: 'visual' },
            order: [['timestamp', 'ASC']],
        });
        // 只获取最近的N条消息
        const recentRecords = records.slice(-maxHistory);
        return recentRecords.map(r => {
            let content;
            try {
                content = JSON.parse(r.content);
            }
            catch (e) {
                content = r.content;
            }
            return {
                message_id: r.messageId,
                role: r.role,
                nickName: r.nickName,
                time: r.dateStr,
                content: content
            };
        });
    }
    catch (error) {
        logger.error("[handleVisual]加载上下文失败:", error);
        return [];
    }
}
