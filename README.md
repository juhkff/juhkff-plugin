<div align="center">

# JUHKFF-PLUGIN

<img src="./resources/images/icon.jpg" width = 200px height = 200px/>
<br>
<img src="https://img.shields.io/badge/-Node.js-3C873A?style=flat&logo=Node.js&logoColor=white"/>
<img src="https://img.shields.io/badge/Github-综合插件-skyblue?style=flat-square&logo=github"/>
<img src ="https://img.shields.io/github/license/juhkff/juhkff-plugin"/>
<img src ="https://img.shields.io/github/languages/top/juhkff/juhkff-plugin?logo=github"/>

<img src ="https://img.shields.io/badge/v3-null?label=TRSS-Yunzai"/>
<img src="https://img.shields.io/badge/v11-null?label=OneBot">

<img src="https://count.getloli.com/@juhkff-plugin?juhkff-plugin&theme=random&padding=7&offset=0&align=top&scale=1&pixelated=0&darkmode=auto" />
</div>

一个适用于 [TRSS-Yunzai 框架](https://github.com/TimeRainStarSky/Yunzai) 和 [OneBot-v11 标准](https://onebot.dev) 的 **自用** 综合群机器人插件。**除非特意说明，各项配置在锅巴页面保存修改后立即生效，无需重启机器人**

> [!WARNING]
> 由于为自用插件，所以其它协议适配性未知，喵崽框架适配性未知（没运行过）

> [!NOTE]
> 最近几个月现实里有点忙，所以时隔数月后终于是堂堂复活.<br>
> 参考 chatgpt-plugin 大概列了下未来计划
>
> - [ ] 数据库替代 redis 存储
> - [ ] 模板化配置请求体，实现灵活配置，避免模型更新导致失效
> - [ ] 向量化群聊和用户记忆
> - [ ] 知识库接入
> - [ ] 可能会有但大概不会有的私聊支持

<!-- <div style="color:red; font-weight:bold;">
由于群聊接口配置结构发生变动，可能需要重新进行配置
</div> -->

## 安装插件

#### 1. 克隆仓库

- github

```
git clone https://github.com/juhkff/juhkff-plugin.git ./plugins/juhkff-plugin
```

- gitee（国内）

```
git clone https://gitee.com/juhkff/juhkff-plugin.git ./plugins/juhkff-plugin
```

#### 2. 安装依赖

```
pnpm install --filter=juhkff-plugin
```

## API 相关

- SiliconFlow 官网申请 ApiKey: https://cloud.siliconflow.cn/account/ak
- DeepSeek 官网申请 ApiKey: https://platform.deepseek.com/
- 火山方舟 官网申请 ApiKey 和创建应用: https://console.volcengine.com/ark/
- Gemini 官网申请 ApiKey: https://aistudio.google.com/apikey
- Gemini-OpenAI（国内中转）教程: https://github.com/PublicAffairs/openai-gemini
  <details><summary>部署教程</summary>
  （需有一个国内可访问的域名）<br>
  1. 进入openai-gemini仓库<br>
  2. 点击 'Deploy to Cloudflare'<br>
  3. 按提示部署项目（会 fork private 仓库）<br>
  4. 将域名迁移到 Cloudflare: Cloudflare 账户主页 -> 添加域 -> 添加自己的域名 -> 按提示在原DNS提供方官网上将DNS服务器替换为Cloudflare提供的两个服务器 -> 继续按提示完成操作<br>
  5. Cloudflare 账户主页 -> 计算(Workers) -> 部署的openai-gemini -> 设置 -> 添加域和路由 -> 添加自己的域名<br>
  6. 可通过 `https://自定义域名/v1/chat/completions` 访问自己的 openai-gemini 服务，实现国内调用 Gemini
  </details>
- OpenRouter 官网申请 ApiKey: https://openrouter.ai/

### 一点使用经验

火山方舟创建应用时，如果想使用联网搜索，最好将联网内容插件全勾选，不然搜索内容可能过时或质量较差

## 插件配置

> [!WARNING]
> 不建议手动修改配置文件，本插件已兼容 [Guoba-plugin](https://github.com/guoba-yunzai/guoba-plugin) ，请使用锅巴插件对配置项进行修改 <br>
> 若手动修改配置文件，需至少启动一次插件，然后可在 `juhkff-plugin/config/default` 目录下的文件内找到配置项说明，据此修改 `juhkff-plugin/config` 目录下的相应文件，保存后重启机器人。**请勿直接修改 default 目录及其内文件**

## 功能列表

- [x] 主动群聊
  - [x] 支持上下文
  - [x] 锅巴配置页面现已支持多 ApiKey 管理
  - [x] 视觉模型开启时，会对图片提取关键内容加入上下文
  - [x] 视觉模型可以代替聊天模型完全接管主动群聊
  - [x] 可以提取分享的 URL 内容并加入上下文
  - [x] 一定程度上支持对分享链接的解析并加入上下文
  - [x] 添加情感生成，会加入 API 接口调用中辅助生成群聊内容（神必功能，谨慎开启
  - [x] 支持通过 AI 功能实现文本转语音
  - [x] 支持的 API 列表：
    - [x] DeepSeek
    - [x] SiliconFlow
    - [x] 火山方舟
    - [x] Gemini
    - [x] OpenRouter
    - [x] OpenAI 通用格式
- [x] 生成和推送日报
  - [x] 借鉴 [真寻日报](https://github.com/HibiKier/nonebot-plugin-zxreport) 的样式和代码生成日报
- [x] 表情偷取
  - [x] 借鉴 [鸢尾花插件](https://github.com/logier/logier-plugins) 的思路改进实现
  - [x] 同一图片在指定时间长度内被发送两次，则被视为表情并偷取
- [x] 命令预设
  - [x] 使群BOT进入相关预设场景，直到生成特定关键词或用户输入 `#结束` 时退出
- [x] **Pixix 订阅推送(试运行中) (latest update)**
  - [x] Pixiv的请求API使用 [@ibaraki-douji/pixivts](https://www.npmjs.com/package/@ibaraki-douji/pixivts) 的包源码并进行少许改造
  - [x] 在锅巴配置中或群聊中使用`#pixiv订阅 ID`可订阅相应ID用户的最新插画动态推送到群聊中
  - [x] 在锅巴配置中或群聊中使用`#pixiv取消订阅`可取消订阅相应ID用户
  - [ ] R18限制开关制作，日推榜推送等功能 DOING
- [x] 骰子
  - [x] 支持`1d6`格式、特定类型 和 类型组合的骰子，可添加骰子类型
- [x] AI 功能接入中
  - [x] 豆包 AI 部分接入
  - [x] SiliconFlow AI 接入
  - [ ] 其它 AI 接入...
- [x] 调用指令可发送帮助图片
  - [x] 参考 [Miao-Plugin](https://github.com/yoimiya-kokomi/miao-plugin) 和 [TRSS-Yunzai](https://github.com/TimeRainStarSky/Yunzai) 的思路和代码实现
  - [x] 支持手动添加其它命令，如其它插件的命令
  <details>
    <summary>图片效果预览</summary>
    <img src="./resources/images/help-screenshot.png"/>
  </details>
- [x] **小工具 (latest update)**
  - [x] **分享内容解析：当PC端用户无法直接看到分享内容时，可以看BOT发送的解析简单了解，目前支持Bilibili和小黑盒的分享 (latest update)**
- [x] 其它
  - [x] 插件配置页面优化（长期）
- [ ] TODO...

## 主动群聊预览

<details>
  <summary><b>真实情景</b> 可以据此判断是否符合使用预期</summary>
  <img src="./resources/images/preview.jpg"/>
</details>

## 支持与贡献

如果你喜欢这个项目，请不妨点个 Star🌟，这是对开发者最大的动力

**自用插件，不保证问题追踪和改进**

## 许可证

本项目使用 [GNU GPLv3](https://choosealicense.com/licenses/gpl-3.0/) 作为开源许可证。
