import { Sequelize } from "sequelize";
import { DB_PATH } from "../model/path.js";
// 假设数据库文件存放在插件根目录的 data 文件夹下
// 注意：实际路径可能需要根据你的 Yunzai 目录结构调整
export const sequelize = new Sequelize({
    dialect: "sqlite",
    storage: DB_PATH,
    logging: false, // 是否打印 SQL 日志
    define: {
        freezeTableName: true, // 保持表名与模型名一致，不自动变复数
        timestamps: true,
    },
});
