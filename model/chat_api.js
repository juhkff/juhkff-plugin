import setting from "#juhkff.setting";
import fetch from "node-fetch";

function getConfig() {
  return setting.getConfig("AutoReply");
}

export const ChatInterface = {
  generateRequest: Symbol("generateRequest"),
};

/**
 *
 * @param {*} apiKey apiKey
 * @param {*} apiBaseUrl 使用的API地址
 * @param {*} model 使用的API模型
 * @param {*} input 当前聊天输入
 * @param {*} historyMessages 聊天历史记录
 * @param {*} image_list 图片列表
 * @param {*} image_type 是否可传入图片
 */
ChatInterface.generateRequest = async function (
  apiKey,
  apiBaseUrl = "",
  model = "",
  input,
  historyMessages = [],
  image_list = {},
  image_type = false
) {};

export class DefaultChatRequest {
  async [ChatInterface.generateRequest](
    apiKey,
    apiBaseUrl,
    model,
    input,
    historyMessages,
    image_list = {},
    image_type = false
  ) {
    // 构造请求体
    const requestBody = {
      model: model || getConfig().ChatModel,
      messages: [
        {
          role: "system",
          content:
            getConfig().ChatPrompt ||
            "You are a helpful assistant, you prefer to speak Chinese. Now you are in a chat group, and the following is chat history",
        },
      ],
      stream: false,
      temperature: 1.5,
    };

    // 添加历史对话
    if (historyMessages && historyMessages.length > 0) {
      historyMessages.forEach((msg) => {
        // 不是图片时添加
        if (!msg.imageBase64) {
          if (msg.role === "system") {
            requestBody.messages.push({
              role: "system",
              content: msg.content,
            });
          }
          if (msg.role === "user") {
            requestBody.messages.push({
              role: "user",
              content: msg.content,
            });
          } else if (msg.role === "assistant") {
            requestBody.messages.push({
              role: "assistant",
              content: msg.content,
            });
          }
        }
      });
    }

    // 构造当前消息
    // 当前消息作为统一的一个message放入requestBody.messages
    try {
      // 构造消息内容数组
      let allContent = [];
      // 添加\引用的和当前的图片
      if (
        image_type &&
        image_list.sourceImages &&
        image_list.sourceImages.length > 0
      ) {
        image_list.sourceImages.forEach((image) => {
          allContent.push({
            type: "text",
            text: "引用消息包含的图片:\n",
          });
          allContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          });
        });
      }
      if (
        image_type &&
        image_list.currentImages &&
        image_list.currentImages.length > 0
      ) {
        allContent.push({
          type: "text",
          text: "消息正文包含的图片:\n",
        });
        image_list.currentImages.forEach((image) => {
          allContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          });
        });
      }
      allContent.push({
        type: "text",
        text: input,
      });

      // 添加历史图片
      if (
        image_type &&
        image_list.historyImages &&
        image_list.historyImages.length > 0
      ) {
        allContent.push({
          type: "text",
          text: "\n历史对话包含的图片:",
        });
        image_list.historyImages.forEach((image) => {
          allContent.push({
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${image}`,
            },
          });
        });
      }
      if (image_type) {
        // 兼容带图片的消息格式
        requestBody.messages.push({
          role: "user",
          content: allContent,
        });
      } else {
        requestBody.messages.push({
          role: "user",
          content: input,
        });
      }
    } catch (error) {
      logger.error("[AutoReply]消息处理失败\n", error);
      // 如果处理失败，至少保留用户输入
      requestBody.messages.push({
        role: "user",
        content: input,
      });
    }

    logger.mark(
      `\n[AutoReply]API调用，请求内容：${JSON.stringify(
        requestBody.messages,
        null,
        2
      )}`
    );
    var response;
    try {
      response = await fetch(`${apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        logger.error("[AutoReply]API调用失败：", JSON.stringify(data, null, 2));
        return "[AutoReply]API调用失败，详情请查阅控制台。";
      }
    } catch (error) {
      logger.error(
        `[AutoReply]API调用失败, 请求返回结果：${JSON.stringify(response)}\n`,
        error
      );
      return "[AutoReply]API调用失败，详情请查阅控制台。";
    }
  }
}

export class DeepSeek {
  constructor() {
    // 模型映射
    this.modelMap = {
      "deepseek-chat": this.deepseek_chat.bind(this),
      "deepseek-reasoner": this.deepseek_reasoner.bind(this),
    };
  }

  async [ChatInterface.generateRequest](
    apiKey,
    apiBaseUrl,
    model,
    input,
    historyMessages,
    image_list = {},
    image_type = false
  ) {
    if (!this.modelMap[model]) {
      logger.error("[AutoReply]不支持的模型：" + model);
      return "[AutoReply]不支持的模型：" + model;
    }
    var request = {
      url: `${apiBaseUrl}/chat/completions`,
      options: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: {
          model: model,
          messages: [],
          stream: false,
          temperature: 1.5,
        },
      },
    };

    var response = await this.modelMap[model](
      JSON.parse(JSON.stringify(request)),
      input,
      historyMessages,
      image_list,
      image_type
    );
    // 如果 DeepSeek-R1 失败，尝试使用 DeepSeek-V3

    if (
      typeof response === "string" &&
      response.startsWith("[AutoReply]DeepSeek-R1调用失败")
    ) {
      request.options.body.model = "deepseek-chat";
      response = await this.deepseek_chat(
        JSON.parse(JSON.stringify(request)),
        input,
        historyMessages,
        image_list,
        image_type
      );
    }
    return response;
  }

  async deepseek_chat(
    request,
    input,
    historyMessages,
    image_list = {},
    image_type = false
  ) {
    // 添加消息内容
    request.options.body.messages.push({
      role: "system",
      content:
        getConfig().ChatPrompt ||
        "You are a helpful assistant, you prefer to speak Chinese. Now you are in a chat group, and the following is chat history",
    });
    // 添加历史对话
    if (historyMessages && historyMessages.length > 0) {
      historyMessages.forEach((msg) => {
        // 不是图片时添加
        if (!msg.imageBase64) {
          if (msg.role === "system") {
            request.options.body.messages.push({
              role: "system",
              content: msg.content,
            });
          }
          if (msg.role === "user") {
            request.options.body.messages.push({
              role: "user",
              content: msg.content,
            });
          } else if (msg.role === "assistant") {
            request.options.body.messages.push({
              role: "assistant",
              content: msg.content,
            });
          }
        }
      });
      // 添加当前对话
      request.options.body.messages.push({
        role: "user",
        content: input,
      });
    }
    logger.mark(
      `\n[AutoReply]DeepSeek-V3 API调用，请求内容：${JSON.stringify(
        request,
        null,
        2
      )}`
    );
    var response;
    try {
      request.options.body = JSON.stringify(request.options.body);
      response = await fetch(request.url, request.options);

      const data = await response.json();

      if (data?.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      } else {
        logger.error(
          "[AutoReply]DeepSeek-V3调用失败：",
          JSON.stringify(data, null, 2)
        );
        return "[AutoReply]DeepSeek-V3调用失败，详情请查阅控制台。";
      }
    } catch (error) {
      logger.error(
        `[AutoReply]DeepSeek-V3调用失败, 请求返回结果：${JSON.stringify(
          response
        )}\n`,
        error
      );
      return "[AutoReply]DeepSeek-V3调用失败，详情请查阅控制台。";
    }
  }

  async deepseek_reasoner(
    request,
    input,
    historyMessages,
    image_list = {},
    image_type = false
  ) {
    // 添加消息内容
    request.options.body.messages.push({
      role: "system",
      content:
        getConfig().ChatPrompt ||
        "You are a helpful assistant, you prefer to speak Chinese. Now you are in a chat group, and the following is chat history",
    });
    // 添加历史对话
    var content = "";
    if (historyMessages && historyMessages.length > 0) {
      historyMessages.forEach((msg) => {
        // 不是图片时添加
        if (!msg.imageBase64) {
          content +=
            '"role": "' + msg.role + '"  "content":' + msg.content + '"\n';
        }
      });
    }
    content += '"role": "user"  "content":' + input + '"\n';
    request.options.body.messages.push({
      role: "user",
      content: content,
    });

    logger.mark(
      `\n[AutoReply]DeepSeek-R1 API调用，请求内容：${JSON.stringify(
        request,
        null,
        2
      )}`
    );
    var response;
    try {
      request.options.body = JSON.stringify(request.options.body);
      response = await fetch(request.url, request.options);

      const data = await response.json();

      if (data?.choices?.[0]?.message?.content) {
        // 测试成功频率
        return data.choices[0].message.content + "\n ";
      } else {
        logger.error(
          "[AutoReply]DeepSeek-R1调用失败：",
          JSON.stringify(data, null, 2)
        );
        return "[AutoReply]DeepSeek-R1调用失败，详情请查阅控制台。";
      }
    } catch (error) {
      logger.error(
        `[AutoReply]DeepSeek-R1调用失败, 请求返回结果：${JSON.stringify(
          response
        )}\n`,
        error
      );
      return "[AutoReply]DeepSeek-R1调用失败，详情请查阅控制台。";
    }
  }
}

export const chatMap = {
  default: DefaultChatRequest,
  deepseek: DeepSeek,
};
