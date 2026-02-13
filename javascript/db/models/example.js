import { DataTypes, Model } from "sequelize";
import { sequelize } from "../sequelize.js";
// 3. 定义模型类
export class ExampleRecord extends Model {
}
// 4. 初始化模型
ExampleRecord.init({
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    key: {
        type: DataTypes.STRING(128),
        allowNull: false,
        comment: "配置键名",
    },
    value: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: "配置值",
    },
    groupId: {
        type: DataTypes.STRING(64),
        allowNull: true,
        comment: "群组ID，为空则为全局配置",
    },
}, {
    sequelize,
    tableName: "example",
});
