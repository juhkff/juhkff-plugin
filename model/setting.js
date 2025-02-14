import YAML from "yaml";
import fs from "node:fs";
import { _path, pluginResources, pluginRoot } from "#juhkff.path";

class Setting {
  constructor() {
    /** 用户设置 */
    this.configPath = `${pluginRoot}/config/`;
    this.config = {};

    this.dataPath = `${pluginRoot}/data/`;
    this.data = {};
  }

  // 获取对应模块用户配置
  getConfig(app) {
    if (!fs.existsSync(`${this.configPath}${app}.yaml`)) {
      if (!fs.existsSync(`${this.configPath}default/${app}.yaml`)) {
        logger.error(`插件缺失配置文件${app}.yaml`);
        return false;
      } else {
        // 复制 default 内对应的 yaml 文件到 config/*.yaml 中
        fs.copyFileSync(
          `${this.configPath}default/${app}.yaml`,
          `${this.configPath}${app}.yaml`
        );
        logger.info(`已复制 ${app} 默认配置文件`);
      }
    }
    let file = `${this.configPath}${app}.yaml`;
    if (this.config[app]) return this.config[app];

    try {
      this.config[app] = YAML.parse(fs.readFileSync(file, "utf8"));
    } catch (error) {
      logger.error(`[${app}] 格式错误 ${error}`);
      return false;
    }
    return this.config[app];
  }

  // 获取对应模块数据文件
  getData(path, filename) {
    path = `${this.dataPath}${path}/`;
    try {
      if (!fs.existsSync(`${path}${filename}.yaml`)) {
        return false;
      }
      return YAML.parse(fs.readFileSync(`${path}${filename}.yaml`, "utf8"));
    } catch (error) {
      logger.error(`[${filename}] 读取失败 ${error}`);
      return false;
    }
  }
}

export default new Setting();
