/**
 * @file handle.js
 * @description: 原始消息处理相关
 */
import { emotionGenerate } from "../bgProcess/jobs.js";
import { config } from "../config/index.js";
import { EMOTION_KEY } from "../model/constant.js";
import { agent } from "../model/map.js";
import { formatDateDetail } from "./date.js";
import { analyseImage, extractUrlContent } from "./helper.js";
import { Objects } from "./kits.js";
import { getSourceMessage } from "./message_history.js";
import { ChatHistory } from "../db/models/chat_history.js";
/**
 * 由于会生成插件专属消息处理列表j_msg，该方法必须作为消息处理的第一个函数
 * @param {} e
 */
export async function parseImage(e) {
    if (!e.j_msg)
        e.j_msg = [];
    for (let i = 0; i < e.message.length; i++) {
        if (e.message[i].type == "image") {
            if (!config.autoReply.useVisual)
                continue;
            var url = e.message[i].url;
            var result = await analyseImage(url, "该图片是否为表情包，只输出是或否，不要加标点符号");
            logger.info(`[parseImage]图片是否为表情包: ${result}`);
            if (result === "是") {
                // 表情包不加入消息
                continue;
            }
            else {
                var analyseMsg = await analyseImage(url, "提取图中关键信息");
                e.j_msg.push({
                    text: `<发送图片，图片内容的分析结果——${analyseMsg}>`,
                    type: "img2text",
                });
            }
        }
        else {
            // text和json等其他类型的消息在该方法中不做处理
            e.j_msg.push(e.message[i]);
        }
    }
}
/**
 * 确保该方法在parseImage之后执行
 * @param {*} e
 * @returns
 */
export async function parseSourceMessage(e) {
    if (!e.j_msg)
        return;
    for (let i = 0; i < e.j_msg.length; i++) {
        if (e.j_msg[i].type === "reply") {
            // 从db中获取引用消息
            var db_source = await getSourceMessage(e.group_id, e.j_msg[i].id);
            if (db_source != undefined) {
                var msg = `[回复 ${db_source}]`;
                e.j_msg[i] = { text: msg, type: "reply" };
                continue;
            }
            var reply = await e.getReply(e.j_msg[i].id);
            if (reply) {
                let senderTime = undefined; // 存储发送者时间
                let senderNickname = ""; // 存储发送者昵称
                let msg = []; // 存储发送者消息
                // 获取发送者昵称和时间
                senderTime = formatDateDetail(reply.time * 1000);
                senderNickname = reply.sender?.card || reply.sender?.nickname;
                for (var val of reply.message) {
                    if (val.type == "image") {
                        if (!config.autoReply.useVisual)
                            continue;
                        var result = await analyseImage(val.url, "该图片是否为表情包，只输出是或否");
                        logger.info(`[parseSourceMessage]图片是否为表情包: ${result}`);
                        if (result == "是") {
                            // 表情包不加入消息
                            continue;
                        }
                        else {
                            var analyseMsg = await analyseImage(val.url, "提取图中关键信息，以中文的自然语言的形式回答");
                            msg.push(`<发送图片，内容: ${analyseMsg}>`);
                        }
                    }
                    else if (val.type == "text") {
                        msg.push(val.text); // 收集文本消息
                    }
                    else if (val.type == "file") {
                        // 不支持消息中的文件
                        continue;
                    }
                    else if (val.type == "json") {
                        let result = analyseJsonMessage(val.data);
                        if (result)
                            msg.push(result);
                    }
                }
                var quotedLines;
                if (msg.length <= 0) {
                    quotedLines = "不支持显示的消息内容";
                }
                else {
                    quotedLines = msg.map((line) => `${line}`).join(" ");
                }
                e.j_msg[i] = {
                    text: `[回复 ${senderTime} - ${senderNickname}：${quotedLines}]`,
                    type: "reply",
                };
            }
        }
    }
    return e;
}
/**
 * 确保该方法在parseImage之后执行
 * @param {} e
 * @returns
 */
export async function parseJson(e) {
    if (!e.j_msg)
        return;
    for (let i = 0; i < e.j_msg.length; i++) {
        if (e.j_msg[i].type === "json") {
            var result = analyseJsonMessage(e.j_msg[i].data);
            if (result) {
                e.j_msg[i] = { text: result, type: "json2text" };
            }
        }
    }
}
export async function parseAt(e) {
    if (!e.j_msg)
        return;
    for (let i = 0; i < e.j_msg.length; i++) {
        if (e.j_msg[i].type === "at") {
            // 处理@信息
            if (e.j_msg[i].qq == "all") {
                const memberName = "全体成员";
                e.j_msg[i] = { text: `@${memberName}`, type: "at2text" };
            }
            else {
                const qq = e.j_msg[i].qq;
                const groupMember = e.bot.pickMember(e.group_id, qq);
                const memberInfo = await groupMember.getInfo();
                const memberName = memberInfo?.card || memberInfo?.nickname;
                e.j_msg[i] = { text: `@${memberName}`, type: "at2text" };
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
        logger.error("[analyseJsonMessage] JSON解析错误", error);
        return null;
    }
}
/**
 * 确保该方法在parseImage之后执行
 * @param {*} e
 * @returns
 */
export async function parseUrl(e) {
    if (!e.j_msg)
        return;
    // 更新正则表达式以匹配包含中文和空格的URL
    const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
    var matches;
    for (let i = 0; i < e.j_msg.length; i++) {
        if (e.j_msg[i].type === "text") {
            let message = e.j_msg[i].text;
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
                    if (Objects.isNull(extractResult)) {
                        logger.info(`[URL处理]成功提取URL内容`);
                        // 借助chatApi对提取的内容进行总结
                        var model = config.autoReply.chatModel;
                        const response = await agent.chat.chatRequest(e.group_id, model, "根据从URL抓取的信息，以自然语言简练地总结URL中的主要内容，其中无关信息可以过滤掉", [{ role: "user", content: extractResult.content }], false);
                        if (response.ok) {
                            e.j_msg[i].text = e.j_msg[i].text.replace(url, `<分享URL，URL内容的分析结果——${response.data}>`);
                            e.j_msg[i].type = "url2text";
                        }
                    }
                }
            }
        }
    }
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
 * @param {*} e
 * @param {*} msg 正文消息
 * @param {*} sourceImages 引用图片数组
 * @param {*} currentImages 正文图片数组
 * @returns answer 回复内容
 */
export async function generateAnswer(e, msg) {
    let apiKey = config.autoReply.chatApiKey;
    let model = config.autoReply.chatModel;
    if (!apiKey || apiKey.length == 0) {
        logger.error("[handle]请先设置chatApiKey");
        return { ok: false, error: "[handle]请先设置chatApiKey" };
    }
    if (!model || model == "") {
        logger.error("[handle]请先设置chatModel");
        return { ok: false, error: "[handle]请先设置chatModel" };
    }
    // 获取历史对话
    let historyMessages = [];
    if (config.autoReply.useContext) {
        historyMessages = await loadContext(e.group_id);
        logger.info(`[handle]加载历史对话: ${historyMessages.length} 条`);
    }
    // 如果启用了情感，并且redis中不存在情感，则进行情感生成
    if (config.autoReply.useEmotion && Objects.isNull(await redis.get(EMOTION_KEY))) {
        const emotion = await emotionGenerate();
        if (emotion.ok) {
            redis.set(EMOTION_KEY, emotion.data, { EX: 24 * 60 * 60 });
        }
    }
    const response = await sendChatRequest(e.group_id, e.sender.card + "：" + msg, model, historyMessages);
    if (response.ok) {
        // 使用正则表达式去掉字符串 content 头尾的换行符
        response.data = response.data?.replace(/^\n+|\n+$/g, "");
    }
    return response;
}
/**
 * 发送ChatApi请求
 * @param input
 * @param model
 * @param historyMessages
 * @param useSystemRole 是否使用system预设
 * @returns
 */
export async function sendChatRequest(groupId, input, model = "", historyMessages = [], useSystemRole = true) {
    if (!agent.chat)
        return { ok: false, error: "[handle]请设置有效的AI接口" };
    const response = await agent.chat.chatRequest(groupId, model, input, historyMessages, useSystemRole);
    return response;
}
// 保存对话上下文
export async function saveContext(sendTime, e, role, message) {
    try {
        const maxHistory = config.autoReply.maxHistoryLength;
        // 保存新消息
        await ChatHistory.create({
            groupId: String(e.group_id),
            messageId: role === "assistant" ? null : String(e.message_id),
            role: role,
            userId: role === "assistant" ? null : String(e.user_id),
            nickName: role === "assistant" ? null : e.sender.card,
            content: message,
            type: 'text',
            sendTime: new Date(sendTime),
        });
        // 清理旧消息
        const count = await ChatHistory.count({ where: { groupId: String(e.group_id), type: 'text' } });
        if (count > maxHistory) {
            const recordsToDelete = await ChatHistory.findAll({
                where: { groupId: String(e.group_id), type: 'text' },
                order: [['sendTime', 'ASC']],
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
        logger.error("[handle]保存上下文失败:", error);
        return false;
    }
}
// 加载群历史对话
export async function loadContext(groupId) {
    try {
        const maxHistory = config.autoReply.maxHistoryLength;
        // 获取该群的所有消息
        const records = await ChatHistory.findAll({
            where: { groupId: String(groupId), type: 'text' },
            order: [['sendTime', 'ASC']],
        });
        // 只获取最近的N条消息
        const recentRecords = records.slice(-maxHistory);
        return recentRecords.map(r => ({
            role: r.role,
            content: r.content
        }));
    }
    catch (error) {
        logger.error("[handle]加载上下文失败:", error);
        return [];
    }
}
export async function getImageUniqueId(e) {
    let image = e.message.filter((item) => item.type === "image");
    if (image.length > 0)
        return image[0].url;
    return "";
}
