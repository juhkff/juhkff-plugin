import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize.js";
export class ChatHistory extends Model {
}
ChatHistory.init({
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
        type: DataTypes.STRING(64),
        allowNull: false,
        comment: "消息ID",
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
        comment: "消息内容(JSON或文本)",
    },
    type: {
        type: DataTypes.STRING(20),
        defaultValue: 'text',
        comment: "消息类型: text/visual",
    },
    sendTime: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: "发送时间",
    },
}, {
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
            fields: ['userId']
        }
    ]
});
