import { HttpsProxyAgent } from "https-proxy-agent";
import { Job } from "node-schedule";

export type ConfigSchemaType = {
    field?: string,
    label?: string,
    bottomHelpMessage?: string,
    /** 随用随加 */
    component:
    "SOFT_GROUP_BEGIN" | "Divider" | "Switch" | "Input" | "InputTextArea" | "Select" | "AutoComplete" | "GSubForm" |
    "InputNumber" | "InputPassword" | "GColorPicker" | "EasyCron" | "GSelectGroup"
    componentProps?: {
        type?: string,
        style?: { [key: string]: string | number },
        orientation?: string,
        plain?: boolean,
        multiple?: boolean,
        modalProps?: { [key: string]: string | number },
        schemas?: ConfigSchemaType[],
        defaultValue?: any,
        placeholder?: string,
        rows?: number,
        min?: number,
        max?: number,
        step?: number,
        options?: {
            label: string,
            value: any,
        }[],
    },
    required?: boolean,
}

export type CronExpression = string;

export type RequestBody = Record<string, any>;

export type RequestOptions = {
    method: "POST" | "GET" | "PUT" | "DELETE";
    headers?: Record<string, string>;
    agent?: HttpsProxyAgent<string>;
    body?: RequestBody | string;
} & Record<string, any>;

export type Request = {
    url: string;
    options: RequestOptions;
};

export type Role = "user" | "assistant" | "system";

export type SimpleJMsg = {
    replyId?: number,
    id?: number,
    text?: string,
    data?: string,
    qq?: string,
    type: string,
} & Record<string, any>;

export type HistorySimpleJMsg = {
    message_id?: number | string,
    role: Role,
    content: string
};

export type ComplexJMsg = {
    // sourceImg?: string[],
    // sourceText?: string,
    replyId?: number,
    img?: string[],
    text?: string,
    notProcessed?: (SimpleJMsg & { url?: string })[],
}

export type HistoryComplexJMsg = {
    message_id: number | string,
    role: Role,
    nickName: string,
    time: string,
    content: ComplexJMsg
};

export type RequestMsg = {
    texts: string,
    images: string[],
    content: { type: string, text?: string, url?: string }[],
}

export type HelpType = {
    name?: string,
    type: "active" | "passive" | "group" | "sub",
    command?: string,
    dsc?: string,
    enable?: boolean,
    subMenu?: {
        name?: string,
        type: "sub",
        command?: string,
        dsc?: string,
        enable?: boolean,
    }[]
}

export type JobDict = Record<string, Job>;