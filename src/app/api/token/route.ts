import { NextResponse } from "next/server";

// 定义飞书API返回的数据结构
interface FeishuRecordValue {
    text?: string;
    value?: Array<{ text: string }> | string[];
}

interface FeishuRecord {
    fields: {
        [key: string]: FeishuRecordValue | number | Array<{ text: string }>;
    };
}

interface FeishuSearchResponse {
    data?: {
        items?: FeishuRecord[];
    };
}

export async function POST(request: Request) {
    try {
        // 检查请求体是否为空
        const requestText = await request.text();

        if (!requestText) {
            return NextResponse.json(
                { error: "请求体不能为空" },
                { status: 400 }
            );
        }

        // 尝试解析请求体
        let requestData;
        try {
            requestData = JSON.parse(requestText);
        } catch (error) {
            return NextResponse.json(
                { error: "无效的 JSON 格式" },
                { status: 400 }
            );
        }

        // 验证记录ID是否存在
        const { recordId } = requestData;
        if (!recordId) {
            return NextResponse.json(
                { error: "缺少记录ID" },
                { status: 400 }
            );
        }

        // 获取访问令牌
        const tokenResponse = await fetch("https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal", {
            method: "POST",
            headers: {
                "Content-Type": "application/json; charset=utf-8"
            },
            body: JSON.stringify({
                "app_id": process.env.FEISHU_APP_ID,
                "app_secret": process.env.FEISHU_APP_SECRET
            })
        });

        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.tenant_access_token;

        if (!accessToken) {
            throw new Error("Failed to get access token");
        }

        // 使用访问令牌调用多维表格搜索接口
        const FEISHU_BITABLE_API = process.env.FEISHU_BITABLE_API;
        if (!FEISHU_BITABLE_API) {
            throw new Error("FEISHU_BITABLE_API environment variable is not set");
        }

        const searchResponse = await fetch(
            FEISHU_BITABLE_API,
            {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "filter": {
                        "conjunction": "and",
                        "operator": "or",
                        "conditions": [
                            {
                                "field_name": "记录 ID",
                                "operator": "is",
                                "value": [recordId]
                            }
                        ]
                    },
                    "automatic_fields": true,
                    "page_size": 20
                })
            }
        );

        const searchData = await searchResponse.json();
        return NextResponse.json(searchData);

    } catch (error) {
        return NextResponse.json(
            { error: "搜索记录失败" },
            { status: 500 }
        );
    }
}