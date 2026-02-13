import { DataTypes, Model, Optional } from "sequelize";
import { sequelize } from "../sequelize.js";

/**
 * 示例模型：ExampleRecord
 * 对应数据库表: example
 */

// 1. 定义模型属性接口
export interface ExampleRecordAttributes {
    id: number;
    key: string;
    value: string;
    groupId?: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

// 2. 定义创建时的属性接口 (id, createdAt, updatedAt 等由数据库生成，设为可选)
export interface ExampleRecordCreationAttributes extends Optional<ExampleRecordAttributes, "id" | "createdAt" | "updatedAt"> { }

// 3. 定义模型类
export class ExampleRecord extends Model<ExampleRecordAttributes, ExampleRecordCreationAttributes>
    implements ExampleRecordAttributes {
    declare id: number;
    declare key: string;
    declare value: string;
    declare groupId: string | null;
    declare readonly createdAt: Date;
    declare readonly updatedAt: Date;
}

// 4. 初始化模型
ExampleRecord.init(
    {
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
    },
    {
        sequelize,
        tableName: "example",
    }
);
