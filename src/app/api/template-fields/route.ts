/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-08-16 12:31:18
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-20 16:50:24
 * @FilePath: /next_word_auto/src/app/api/template-fields/route.ts
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */

import { NextResponse } from "next/server";
import { getTemplateFields } from "@/services/docxTemplateService";
import formidable from "formidable";
import { Readable } from "stream";
import fs from "fs";

export async function POST(request: Request): Promise<NextResponse> {
    try {
        // 创建一个可读流来模拟 IncomingMessage
        const buffer = await request.arrayBuffer();
        const readable = Readable.from(Buffer.from(buffer));

        // 添加必要的属性来模拟 IncomingMessage
        const mockRequest = Object.assign(readable, {
            headers: Object.fromEntries(request.headers.entries()),
            method: request.method,
            url: request.url,
            httpVersion: '1.1',
            httpVersionMajor: 1,
            httpVersionMinor: 1,
            complete: true,
            connection: null,
            socket: null,
            aborted: false,
        });

        // 使用 formidable 解析表单数据
        const form = formidable({
            multiples: false,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
        });

        const [, files] = await form.parse(mockRequest as unknown as Parameters<typeof form.parse>[0]);

        // 获取上传的模板文件
        const templateFile = Array.isArray(files.template) ? files.template[0] : files.template;
        if (!templateFile) {
            return NextResponse.json(
                {
                    success: false,
                    error: "缺少模板文件",
                    message: "请上传一个有效的.docx模板文件"
                },
                { status: 400 }
            );
        }

        console.log('收到模板文件:', {
            originalFilename: templateFile.originalFilename,
            size: templateFile.size,
            mimetype: templateFile.mimetype
        });

        // 验证文件大小
        if (templateFile.size === 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: "模板文件为空",
                    message: "上传的模板文件大小为0，请检查文件是否正确"
                },
                { status: 400 }
            );
        }

        // 验证文件扩展名
        const filename = templateFile.originalFilename || '';
        if (!filename.toLowerCase().endsWith('.docx')) {
            return NextResponse.json(
                {
                    success: false,
                    error: "文件格式错误",
                    message: "只支持.docx格式的Word文档模板"
                },
                { status: 400 }
            );
        }

        // 读取模板文件内容
        const templateBuffer = await fs.promises.readFile(templateFile.filepath);
        
        console.log('模板文件读取成功，大小:', templateBuffer.length);

        // 解析模板字段
        try {
            const templateFields = await getTemplateFields(templateBuffer, 'buffer');
            
            console.log('成功解析模板字段:', templateFields);

            if (!templateFields || templateFields.length === 0) {
                return NextResponse.json({
                    success: true,
                    fields: [],
                    message: '模板中没有找到字段占位符。请确保使用 {字段名} 格式的占位符。'
                });
            }

            return NextResponse.json({
                success: true,
                fields: templateFields,
                message: `成功识别 ${templateFields.length} 个字段`
            });
        } catch (parseError) {
            console.error('解析模板字段时出错:', parseError);
            return NextResponse.json(
                {
                    success: false,
                    error: '模板解析失败',
                    message: parseError instanceof Error ? parseError.message : '模板格式可能不正确，请确保是有效的.docx文件',
                    details: parseError instanceof Error ? parseError.stack : undefined
                },
                { status: 500 }
            );
        }
    } catch (error) {
        console.error('获取模板字段失败:', error);
        return NextResponse.json(
            {
                success: false,
                error: '获取模板字段失败',
                message: error instanceof Error ? error.message : '未知错误',
                details: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        );
    }
}