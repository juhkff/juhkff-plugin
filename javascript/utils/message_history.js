import { ChatHistory } from "../db/models/chat_history.js";
export async function getSourceMessage(groupId, message_id, returnFullMessage = false) {
    try {
        const record = await ChatHistory.findOne({
            where: {
                groupId: String(groupId),
                messageId: String(message_id)
            }
        });
        if (!record)
            return null;
        let content = record.content;
        // 如果是 visual 类型，content 是 JSON 字符串，需要解析
        if (record.type === 'visual') {
            try {
                content = JSON.parse(record.content);
            }
            catch (e) {
                // 解析失败，保持原样
            }
        }
        // 构造返回对象，模仿之前的 Redis 存储结构
        const msg = {
            message_id: record.messageId,
            role: record.role,
            content: content,
            nickName: record.nickName,
            time: record.dateStr // Visual 模式需要这个
        };
        if (returnFullMessage)
            return msg;
        else
            return msg.content;
    }
    catch (error) {
        throw new Error(`[db]获取消息失败: ${error}`);
    }
}
