import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

/**
 * 群聊历史记录模型
 * 用于替代 Redis 存储的聊天上下文
 */

/** extra 数组中的单个附加项 */
export interface ExtraItem {
    type: string;         // 类型标识，如 "image" | "audio" | "video" | "file" 等
    [key: string]: any;   // 不同类型各有不同字段，如 image_url, url 等
}

export interface ChatHistoryAttributes {
    id: number;
    groupId: string;
    messageId: number;
    replyId: number; // 引用消息的ID
    role: "user" | "assistant";
    userId: string; // 用户ID
    nickName: string; // 发送者昵称 (Visual模式用到)
    content: string; // 消息内容 (文本内容)
    extra: ExtraItem[] | null; // 附加内容(图片、音频等)，JSON数组
    sendTime: Date; // 发送时间
    createdAt?: Date;
    updatedAt?: Date;
}

export interface ChatHistoryCreationAttributes extends Optional<ChatHistoryAttributes, "messageId" | "replyId" | "userId" | "id" | "createdAt" | "updatedAt" | "nickName" | "extra"> { }

export class ChatHistory extends Model<ChatHistoryAttributes, ChatHistoryCreationAttributes> implements ChatHistoryAttributes {
    declare id: number;
    declare groupId: string;
    declare messageId: number;
    declare replyId: number;
    declare role: "user" | "assistant";
    declare userId: string;
    declare nickName: string;
    declare content: string;
    declare extra: ExtraItem[] | null;
    declare sendTime: Date;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

ChatHistory.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        groupId: {
            type: DataTypes.STRING(64),
            allowNull: false,
            comment: "群组ID",
        },
        messageId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "消息ID",
        },
        replyId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: "引用消息的ID",
        },
        role: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: "角色: user/assistant",
        },
        userId: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: "发送者ID",
        },
        nickName: {
            type: DataTypes.STRING(128),
            allowNull: true,
            comment: "发送者昵称",
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: "消息内容(文本)",
        },
        extra: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: null,
            comment: "附加内容(图片、音频等)，JSON格式",
        },
        sendTime: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: "发送时间",
        },
    },
    {
        sequelize,
        tableName: "chat_history",
        indexes: [
            {
                fields: ['groupId', 'sendTime'] // 联合索引，加速查询
            },
            {
                fields: ['messageId']
            },
            {
                fields: ['replyId']
            },
            {
                fields: ['userId']
            }
        ]
    }
);
