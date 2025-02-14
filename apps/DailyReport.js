import { get, getXML, templateToPic } from "#juhkff.tools";
import { getFestivalsDates, formatDate } from "#juhkff.lunar";
import setting from "#juhkff.setting";
import { pluginResources } from "#juhkff.path";
import path from "path";
import fs from "fs";

export class DailyReport extends plugin {
  constructor() {
    super({
      name: "[扎克芙芙]推送日报",
      dsc: "推送日报",
      event: "message",
      priority: 9999,
      rule: [
        {
          reg: "^#日报$",
          fnc: "dailyReport",
        },
      ],
    });
    this.task = Object.defineProperties(
      {},
      {
        cron: { value: this.Config.DailyReportTime, writable: false },
        name: { value: "推送日报", writable: false },
        fnc: { value: () => this.dailyReport(), writable: false },
        log: { get: () => false },
      }
    );
  }

  hitokoto_url = "https://v1.hitokoto.cn/?c=a";
  alapi_url = "https://v2.alapi.cn/api/zaobao";
  six_url = "https://60s-api.viki.moe/v2/60s";
  game_url = "https://www.4gamers.com.tw/rss/latest-news";
  bili_url = "https://s.search.bilibili.com/main/hotword";
  it_url = "https://www.ithome.com/rss/";
  anime_url = "https://api.bgm.tv/calendar";
  week = {
    0: "日",
    1: "一",
    2: "二",
    3: "三",
    4: "四",
    5: "五",
    6: "六",
  };

  get Config() {
    return setting.getConfig("DailyReport");
  }

  async dailyReport(e) {
    if (!e) {
      logger.info("推送日报");
    }
    var hitokotoResp = await get(this.hitokoto_url);
    var hitokoto;
    var sixResp, six;
    var biliResp = await get(this.bili_url);
    var bili = [];
    var itResp = await getXML(this.it_url);
    var it = [];
    var animeResp = await get(this.anime_url);
    var anime = [];

    hitokoto = hitokotoResp.hitokoto;

    if (this.Config.AlapiToken) {
      // todo 使用 alapitoken 获取数据
      // var alapi = await get(this.alapi_url);
    } else {
      sixResp = await get(this.six_url);
      six = sixResp.data.news;
      if (six.length > 11) {
        six = six.slice(0, 11);
      }
    }
    for (var each in biliResp.list) {
      if (biliResp.list.hasOwnProperty(each)) {
        bili.push({
          keyword: biliResp.list[each].keyword,
          icon: biliResp.list[each].icon,
        });
      }
    }
    // 获取所有 <item> 元素
    var items = itResp.getElementsByTagName("item");
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var title =
        item.getElementsByTagName("title")[0]?.textContent || "无标题";
      it.push(title);
      if (it.length >= 11) break;
    }
    const currentDay = this.getCurrentWeekDay(); // 获取当前星期几
    for (var day of animeResp) {
      if (day.weekday.cn === currentDay) {
        var i = 0;
        for (var item of day.items) {
          if (item.name_cn) {
            anime.push({
              name: item.name_cn,
              image: item.images.large ? item.images.large : item.images.common,
            });
          } else {
            anime.push({
              name: item.name,
              image: item.images.large ? item.images.large : item.images.common,
            });
          }
          i++;
          if (i >= 8) break;
        }
        break;
      }
    }
    var data = {
      data_hitokoto: hitokoto,
      data_six: six,
      data_bili: bili,
      data_it: it,
      data_anime: anime,
      week: this.week[new Date().getDay()],
      date: await formatDate(Date.now()),
      zh_date: await formatDate(Date.now(), "zh"),
      full_show: this.Config.DailyReportFullShow,
      data_festival: await getFestivalsDates(),
    };
    // 定义模板路径和名称
    const templatePath = path.join(
      pluginResources,
      "daily_report",
      "main.html"
    );
    // 定义页面设置
    const viewport = {
      width: 578,
      height: 1885,
      deviceScaleFactor: 5,
    };

    // 生成图片
    var image = await templateToPic(templatePath, data, viewport);
    var imageBuffer = Buffer.from(image);
    /*
    // 确保保存路径的目录存在
    const savePath = path.join(
      pluginResources,
      "daily_report",
      "dailyReport.png"
    );
    const dirPath = path.dirname(savePath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // 将 Buffer 写入文件
    await fs.promises.writeFile(savePath, imageBuffer);
    e.reply([segment.image(savePath)]);
    */
    if (e) {
      e.reply([segment.image(imageBuffer)]);
      return false;
    } else {
      for (let i = 0; i < this.Config.PushGroupList.length; i++) {
        // 添加延迟以防止消息发送过快
        setTimeout(async () => {
          const group = Bot.pickGroup(this.Config.PushGroupList[i]);
          logger.info(`正在向群组 ${group} 推送新闻。`);
          await group.sendMsg([segment.image(imageBuffer)]);
        }, i * 1000);
      }
    }
  }

  getCurrentWeekDay() {
    const today = new Date();
    const dayIndex = today.getDay();
    return `星期${this.week[dayIndex]}`;
  }
}
