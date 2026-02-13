import { sequelize } from "./sequelize.js";
import "./models/example.js";
import "./models/chat_history.js";
/**
 * 数据库统一入口
 * 负责初始化数据库连接和同步模型
 */
// 初始化数据库
await (async () => {
    try {
        await sequelize.authenticate();
        // 确保所有模型都已加载（通过上面的 import）后再同步
        await sequelize.sync({ alter: true });
        logger.info(logger.cyan(`- [JUHKFF-PLUGIN] 数据库连接成功`));
    }
    catch (error) {
        logger.error(logger.red(`- [JUHKFF-PLUGIN] 数据库连接失败: ${error?.message ?? error}`));
    }
})();
export { sequelize };
// 模型导出
export * from "./models/example.js";
export * from "./models/chat_history.js";
