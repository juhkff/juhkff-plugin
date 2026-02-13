import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
// const _path = process.cwd().replace(/\\/g, "/");
const _filename = fileURLToPath(import.meta.url);
/**
 * 插件根目录（如 /project/plugins/juhkff-plugin）
 */
const PLUGIN_ROOT_DIR = path.resolve(_filename, '..', '..', '..');
/**
 * 插件名称（从路径中提取）
 */
const PLUGIN_NAME = path.basename(PLUGIN_ROOT_DIR);
/**
 * 插件apps文件夹目录
 */
const PLUGIN_APP_DIR = path.join(PLUGIN_ROOT_DIR, "javascript", "apps");
/**
 * 插件资源目录路径
 */
const PLUGIN_RESOURCES_DIR = path.join(PLUGIN_ROOT_DIR, "resources");
/**
 * 插件配置目录路径
 */
const PLUGIN_CONFIG_DIR = path.join(PLUGIN_ROOT_DIR, "config");
/**
 * 插件默认配置目录路径
 */
const PLUGIN_DEFAULT_CONFIG_DIR = path.join(PLUGIN_ROOT_DIR, "config", "default");
/**
 * 插件数据目录路径
 */
const PLUGIN_DATA_DIR = path.join(PLUGIN_ROOT_DIR, "data");
/**
 * 插件本地 SQLite 数据库路径
 */
const DB_PATH = path.join(PLUGIN_DATA_DIR, "juhkff.db");
/**
 * Pixiv 初始化文件锁路径
 */
const PIXIV_INIT_LOCK_PATH = path.join(PLUGIN_DATA_DIR, "pixiv.init.lock");
// 确保数据目录存在
if (!fs.existsSync(PLUGIN_DATA_DIR))
    fs.mkdirSync(PLUGIN_DATA_DIR, { recursive: true });
if (!fs.existsSync(path.dirname(PIXIV_INIT_LOCK_PATH)))
    fs.mkdirSync(path.dirname(PIXIV_INIT_LOCK_PATH), { recursive: true });
if (!fs.existsSync(PIXIV_INIT_LOCK_PATH))
    fs.closeSync(fs.openSync(PIXIV_INIT_LOCK_PATH, 'w')); // 创建空文件占位
export { PLUGIN_NAME, PLUGIN_APP_DIR, PLUGIN_ROOT_DIR, PLUGIN_RESOURCES_DIR, PLUGIN_CONFIG_DIR, PLUGIN_DEFAULT_CONFIG_DIR, PLUGIN_DATA_DIR, PIXIV_INIT_LOCK_PATH, DB_PATH, };
