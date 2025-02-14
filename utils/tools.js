import fs from "fs";
import path from "path";
import https from "https";
import fetch from "node-fetch";
import axios from "axios";
import { DOMParser } from "xmldom";
import puppeteer from "puppeteer";

export async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close(resolve);
        });

        file.on("error", (err) => {
          fs.unlink(dest, () => reject(err));
        });
      })
      .on("error", (err) => {
        fs.unlink(dest, () => reject(err));
      });
  });
}

export async function getRandomUrl(imageUrls) {
  let imageUrl;

  if (Array.isArray(imageUrls)) {
    imageUrl = imageUrls[Math.floor(Math.random() * imageUrls.length)];
  } else {
    imageUrl = imageUrls;
  }

  if (fs.existsSync(imageUrl) && fs.lstatSync(imageUrl).isDirectory()) {
    let imageFiles = await getAllImageFiles(imageUrl);

    if (imageFiles.length > 0) {
      imageUrl = imageFiles[Math.floor(Math.random() * imageFiles.length)];
    }
  }

  logger.info("[tools]图片url：" + imageUrl);
  return imageUrl;
}

async function getAllImageFiles(dirPath, imageFiles = []) {
  let files = fs.readdirSync(dirPath);

  for (let i = 0; i < files.length; i++) {
    let filePath = path.join(dirPath, files[i]);

    if (fs.statSync(filePath).isDirectory()) {
      imageFiles = await getAllImageFiles(filePath, imageFiles);
    } else if (
      [".jpg", ".png", ".gif", ".jpeg", ".webp"].includes(
        path.extname(filePath)
      )
    ) {
      imageFiles.push(filePath);
    }
  }

  return imageFiles;
}

/**
timestamp: Date.now()
*/
export async function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始，需要加1
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * @description: 处理引用消息：获取引用的图片和文本，图片放入e.img，优先级==> e.source.img > e.img，文本放入e.sourceMsg
 * @param {*} e
 * @return {*}处理过后的e: sourceImg-引用图片；sourceMsg-引用文本(markdown格式)；img-图片；msg-文本
 */
export async function parseSourceImg(e) {
  let reply;
  // 添加OneBotv11适配器
  if (e.reply_id) {
    reply = (await e.getReply(e.reply_id)).message;
  }

  if (reply) {
    let i = [];
    let text = []; // 用于存储文本消息
    let senderNickname = ""; // 存储发送者昵称

    // 获取发送者昵称
    if (e.source) {
      if (e.isGroup) {
        try {
          const sender = await e.group.pickMember(e.source.user_id);
          senderNickname = sender.card || sender.nickname;
        } catch (error) {
          logger.error("[tools]获取群成员信息失败:", error);
        }
      } else {
        try {
          const friend = e.bot.fl.get(e.source.user_id);
          senderNickname = friend?.nickname;
        } catch (error) {
          logger.error("[tools]获取好友信息失败:", error);
        }
      }
    }
    // 添加OneBotv11适配器的处理
    else if (e.reply_id) {
      try {
        const reply = await e.getReply(e.reply_id);
        senderNickname = reply.sender?.card || reply.sender?.nickname;
      } catch (error) {
        logger.error("[tools]获取引用消息发送者信息失败:", error);
      }
    }

    for (const val of reply) {
      if (val.type == "image") {
        i.push(val.url);
      }
      if (val.type == "text") {
        text.push(val.text); // 收集文本消息
      }
      if (val.type == "file") {
        e.reply("不支持消息中的文件，请将该文件以图片发送...", true);
        return;
      }
    }
    if (Boolean(i.length)) {
      // 防止消息中的图片被引用图片覆盖
      e.sourceImg = i;
    }
    if (text.length > 0) {
      // 如果有发送者昵称,添加到引用文本前,使用markdown引用格式
      const lines = text.join("\n").split("\n");
      const quotedLines = lines.map((line) => `> ${line}`).join("\n");
      e.sourceMsg = senderNickname
        ? `${senderNickname}：${quotedLines}`
        : quotedLines;
    }
  }
  return e;
}

/**
 * 检查URL是否为不需要提取内容的文件类型
 * @param {string} url URL地址
 * @returns {boolean} 是否为不需要提取的文件类型
 */
function isSkippedUrl(url) {
  // 检查常见图片后缀
  const imageExtensions =
    /\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff|tif|raw|cr2|nef|arw|dng|heif|heic|avif|jfif|psd|ai)$/i;

  // 检查常见视频后缀
  const videoExtensions =
    /\.(mp4|webm|mkv|flv|avi|mov|wmv|rmvb|m4v|3gp|mpeg|mpg|ts|mts)$/i;

  // 检查可执行文件和二进制文件
  const binaryExtensions =
    /\.(exe|msi|dll|sys|bin|dat|iso|img|dmg|pkg|deb|rpm|apk|ipa|jar|class|pyc|o|so|dylib)$/i;

  // 检查压缩文件
  const archiveExtensions =
    /\.(zip|rar|7z|tar|gz|bz2|xz|tgz|tbz|cab|ace|arc)$/i;

  // 检查是否包含媒体或下载相关路径关键词
  const skipKeywords =
    /\/(images?|photos?|pics?|videos?|medias?|downloads?|uploads?|binaries|assets)\//i;

  // 不跳过的URL类型
  const allowedExtensions = /(\.bilibili.com\/video|b23\.tv)\//i;

  return (
    !allowedExtensions.test(url) &&
    (imageExtensions.test(url) ||
      videoExtensions.test(url) ||
      binaryExtensions.test(url) ||
      archiveExtensions.test(url) ||
      skipKeywords.test(url))
  );
}

/**
 * 从文本中提取URL
 * @param {string} text 需要提取URL的文本
 * @returns {string[]} URL数组
 */
function extractUrls(text) {
  // 更新正则表达式以匹配包含中文和空格的URL
  const urlRegex = /https?:\/\/[^\s/$.?#].[^\s]*/gi;
  const matches = text.match(urlRegex) || [];

  // 清理URL并进行解码
  return matches.map((url) => {
    // 移除URL末尾的标点符号和中文字符
    let cleanUrl = url.replace(/[.,!?;:，。！？、；：\s\u4e00-\u9fa5]+$/, "");
    // 处理URL中的空格和中文字符
    try {
      // 尝试解码URL，如果已经是解码状态则保持不变
      cleanUrl = decodeURIComponent(cleanUrl);
      // 重新编码空格和特殊字符，但保留中文字符
      cleanUrl = cleanUrl
        .replace(/\s+/g, "%20")
        .replace(/[[\](){}|\\^<>]/g, encodeURIComponent);
    } catch (e) {
      // 如果解码失败，说明URL可能已经是正确格式，直接返回
      return cleanUrl;
    }
    return cleanUrl;
  });
}

/**
 * 处理消息中的URL并提取内容
 * @param {string} message 用户消息
 * @param {boolean} attachUrlAnalysis 是否将提取的内容附加到消息中，默认为true
 * @returns {Promise<{message: string, extractedContent: string}>} 处理后的消息和提取的内容
 */
export async function processMessageWithUrls(
  message,
  attachUrlAnalysis = false
) {
  const urls = extractUrls(message);
  if (!attachUrlAnalysis || urls.length === 0) {
    return { message, extractedContent: "" };
  }

  logger.info(`[URL处理]从消息中提取到${urls.length}个URL`);
  let processedMessage = message;
  let extractedContent = "";

  for (const url of urls) {
    // 跳过不需要提取内容的URL
    if (isSkippedUrl(url)) {
      logger.info(`[URL处理]跳过URL: ${url}`);
      continue;
    }

    logger.info(`[URL处理]开始处理URL: ${url}`);
    const content = await extractUrlContent(url);
    if (content) {
      logger.info(`[URL处理]成功提取URL内容: ${url}`);
      const urlContent = `\n\n提取的URL内容(${url}):\n${content.content}`;
      extractedContent += urlContent;
      processedMessage += urlContent;
    }
  }

  return { message: processedMessage, extractedContent };
}

/**
 * 从URL提取内容
 * @param {string} url 需要提取内容的URL
 * @returns {Promise<Object>} 提取的内容
 */
async function extractUrlContent(url) {
  // 如果是需要跳过的URL类型，直接返回null
  if (isSkippedUrl(url)) {
    logger.info(`[URL提取]跳过不需要处理的URL类型: ${url}`);
    return null;
  }

  try {
    logger.info(`[URL提取]开始从URL获取内容: ${url}`);
    const response = await fetch(
      `https://lbl.news/api/extract?url=${encodeURIComponent(url)}`
    );
    if (!response.ok) {
      throw new Error(`提取内容失败: ${response.statusText}`);
    }
    const data = await response.json();
    logger.info(`[URL提取]成功获取URL内容: ${url}`);
    return data;
  } catch (error) {
    logger.error(`[URL提取]提取内容失败: ${error.message}, URL: ${url}`);
    return null;
  }
}

export async function url2Base64(url, isReturnBuffer = false) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 60000, // 设置超时时间为60秒
    });

    const contentLength =
      response.headers?.["content-length"] || response.headers?.get("size");
    const maxSizeInBytes = 10 * 1024 * 1024; // 10MB in bytes

    if (contentLength && parseInt(contentLength) > maxSizeInBytes) {
      logger.error("[tools]图片大小超过10MB，请使用大小合适的图片");
      return null;
    }
    // 返回 Buffer
    if (isReturnBuffer) return Buffer.from(response.data, "binary");

    return Buffer.from(response.data, "binary").toString("base64");
  } catch (error) {
    logger.error(
      `[tools]下载引用图片错误，可能是图片链接已失效，使用的图片链接：\n` + url
    );
    return null;
  }
}

export async function get(url) {
  var response;
  for (var i = 0; i < 3; i++) {
    try {
      var response = await fetch(url, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      break;
    } catch (e) {
      logger.error(e);
      continue;
    }
  }
  return response.json();
}

export async function getXML(url) {
  try {
    var response = await fetch(url, {
      method: "GET",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // 获取响应的 XML 字符串
    var xmlText = await response.text();

    // 使用 DOMParser 解析 XML 字符串
    var parser = new DOMParser();
    var xmlDoc = parser.parseFromString(xmlText, "text/xml");
    return xmlDoc; // 返回解析后的 XML DOM 对象
  } catch (error) {
    console.error("Error fetching XML:", error);
    return null;
  }
}

export async function templateToPic(templatePath, data, viewport) {
  // 启动浏览器
  const browser = await puppeteer.launch({ args: ["--no-sandbox"] });
  const page = await browser.newPage();

  // 设置视口大小
  await page.setViewport(viewport);

  // 设置基础 URL
  await page.goto(`file://${templatePath}`, { waitUntil: "networkidle2" });

  // 将数据注入到页面中
  await page.evaluate((data) => {
    // 使用 JavaScript 将数据插入到 HTML 中
    document.querySelector(".top-date-week").textContent = data.week;
    document.querySelector(".top-date-date").textContent = data.date;
    document.querySelector(".top-date-cn").textContent = data.zh_date;

    // 渲染节日信息
    const festivalContainer = document.querySelector(".moyu-border");
    festivalContainer.innerHTML = `      <div class="moyu-title"><img src="./res/icon/fish.png" class="title-img">摸鱼日历</div>
      ${data.data_festival
        .map(
          (fes) =>
            `<p class="moyu-inner">距离<span class="moyu-day-name">${fes[1]}</span>还剩<span class="moyu-day">${fes[0]}</span>天</p>`
        )
        .join("")}    `;

    // 渲染 B站热点
    const biliContainer = document.querySelector(".bili-border");
    biliContainer.innerHTML = `      <div class="moyu-title" style="left: 128px;"><img src="./res/icon/bilibili.png" class="title-img">B站热点</div>
      ${data.data_bili
        .map((s) =>
          s.icon
            ? `<p class="bili-text"><img class="hot-img" src="${s.icon}" />${s.keyword}</p>`
            : `<p class="bili-text"><img class="hot-img" style="margin-right: 0;" />${s.keyword}</p>`
        )
        .join("")}    `;

    // 渲染今日新番
    const animeContainer = document.querySelector(".two-border-border");
    animeContainer.innerHTML = `      ${data.data_anime
      .map(
        (s) =>
          `<div class="anime-border"><img src="${s.image}" class="anime-img"><p class="anime-text">${s.name}</p></div>`
      )
      .join("")}    `;

    // 渲染60S读世界
    const sixContainer = document.querySelector(".three-border ul");
    sixContainer.innerHTML = `      ${data.data_six
      .map(
        (s) =>
          `<li class="${
            data.full_show ? "full-show-text" : "normal-text"
          }">${s}</li>`
      )
      .join("")}    `;

    // 渲染IT资讯
    const itContainer = document.querySelector(".four-border ul");
    itContainer.innerHTML = `      ${data.data_it
      .map(
        (s) =>
          `<li class="${
            data.full_show ? "full-show-text" : "normal-text"
          }">${s}</li>`
      )
      .join("")}    `;

    // 渲染今日一言
    document.querySelector(
      ".five-border p"
    ).textContent = `“${data.data_hitokoto}”`;
  }, data);
  // 等待图片加载完成
  await page.waitForSelector(".anime-img", { timeout: 50000 });
  await page.waitForNetworkIdle({ idleTime: 5000, timeout: 50000 });

  // 截图
  const imageBuffer = await page.screenshot({
    type: "png",
    fullPage: true,
  });

  // 关闭浏览器
  await browser.close();

  return imageBuffer;
}
