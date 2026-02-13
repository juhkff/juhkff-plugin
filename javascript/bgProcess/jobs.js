import fs from "fs";
import { config } from "../config/index.js";
import { DAILY_REPORT_SAVE_PATH, dailyReport } from "../apps/dailyReport.js";
import { sendChatRequest } from "../utils/handle.js";
import { Thread } from "../utils/kits.js";
import { deleteJob, upsertJobFromConfig } from "../utils/job.js";
import { EVENT_UPDATE_DAILY_REPORT_PUSH_TIME, DAILY_REPORT_GENERATE, EVENT_UPDATE_DAILY_REPORT_GENERATE_TIME, DAILY_REPORT_PUSH, EMOTION_GENERATE, EVENT_UPDATE_EMOTION_GENERATE_TIME, EMOTION_KEY } from "../model/constant.js";
import { dailyReportDict } from "../cache/global.js";
export async function pushDailyReport() {
    logger.info("推送日报");
    let imageBuffer = null;
    if (config.dailyReport.preHandle) {
        if (!fs.existsSync(DAILY_REPORT_SAVE_PATH)) {
            await dailyReport.generateAndSaveDailyReport();
            if (dailyReportDict["error"]) {
                await Bot.sendMasterMsg(dailyReportDict["error"]);
                return;
            }
        }
        imageBuffer = fs.readFileSync(DAILY_REPORT_SAVE_PATH);
    }
    else {
        imageBuffer = await dailyReport.generateDailyReport();
        if (dailyReportDict["error"]) {
            imageBuffer = dailyReportDict["error"];
            await Bot.sendMasterMsg(imageBuffer);
            return;
        }
    }
    for (let i = 0; i < config.dailyReport.pushGroupList.length; i++) {
        // 添加延迟以防止消息发送过快
        setTimeout(async () => {
            const group = Bot.pickGroup(config.dailyReport.pushGroupList[i]);
            logger.info(`正在向群组 ${group.group_id} 推送新闻。`);
            await group.sendMsg([segment.image(imageBuffer)]);
        }, i * 1000);
    }
}
export async function autoSaveDailyReport() {
    logger.info("[JUHKFF-PLUGIN] 预处理 -> 生成日报");
    let doOnce = false;
    while (true) {
        try {
            await dailyReport.generateAndSaveDailyReport();
            doOnce = true;
            break;
        }
        catch (e) {
            if (!doOnce) {
                logger.error(e);
                doOnce = true;
            }
            // 休眠后循环执行
            await Thread.sleep(config.dailyReport.preHandleRetryInterval * 1000);
        }
    }
    logger.info("[JUHKFF-PLUGIN] 预处理 -> 生成日报成功");
}
export async function emotionGenerate() {
    let model = config.autoReply.chatModel;
    const emotion = await sendChatRequest(null, config.autoReply.emotionGeneratePrompt, model, [], false);
    logger.info(`[JUHKFF-PLUGIN] 情感生成: ${emotion}`);
    return emotion;
}
export async function autoSaveEmotion() {
    const emotion = await emotionGenerate();
    if (!emotion.ok)
        return;
    redis.set(EMOTION_KEY, emotion.data, { EX: 24 * 60 * 60 });
}
if (config.dailyReport.useDailyReport && config.dailyReport.push)
    upsertJobFromConfig(DAILY_REPORT_PUSH, config.dailyReport.dailyReportTime, pushDailyReport);
if (config.dailyReport.useDailyReport && config.dailyReport.preHandle)
    upsertJobFromConfig(DAILY_REPORT_GENERATE, config.dailyReport.preHandleTime, autoSaveDailyReport);
if (config.autoReply.useAutoReply && config.autoReply.useEmotion)
    upsertJobFromConfig(EMOTION_GENERATE, config.autoReply.emotionGenerateTime, autoSaveEmotion);
Bot.on(EVENT_UPDATE_DAILY_REPORT_PUSH_TIME, () => {
    if (config.dailyReport.push) {
        upsertJobFromConfig(DAILY_REPORT_PUSH, config.dailyReport.dailyReportTime, pushDailyReport);
    }
    else {
        deleteJob(DAILY_REPORT_PUSH);
    }
}).on(EVENT_UPDATE_DAILY_REPORT_GENERATE_TIME, () => {
    if (config.dailyReport.preHandle) {
        upsertJobFromConfig(DAILY_REPORT_GENERATE, config.dailyReport.preHandleTime, autoSaveDailyReport);
    }
    else {
        deleteJob(DAILY_REPORT_GENERATE);
    }
}).on(EVENT_UPDATE_EMOTION_GENERATE_TIME, () => {
    if (config.autoReply.useEmotion) {
        upsertJobFromConfig(EMOTION_GENERATE, config.autoReply.emotionGenerateTime, autoSaveEmotion);
    }
    else {
        deleteJob(EMOTION_GENERATE);
    }
});
