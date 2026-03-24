/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-08-18 02:17:07
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-19 19:09:58
 * @FilePath: /next_word_auto/src/app/api/document/route.ts
 * @Description: 
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */

import { NextResponse } from "next/server";
import { convertDocxToPdf } from "@/services/pdfConverter";
import { convertDocxToImage } from "@/services/imageConverter";
import { generateDocxBuffer, type DocumentData } from "@/services/docxTemplateService";
import formidable from "formidable";
import { Readable } from "stream";
import fs from "fs";
import { put } from "@vercel/blob"; // 【新增】

// 定义支持的格式类型
type SupportedFormat = 'docx' | 'pdf' | 'png' | 'jpg' | 'jpeg';

// 格式处理器接口
interface FormatHandler {
    contentType: string;
    fileExtension: string;
    process: (docBuffer: Buffer) => Promise<Buffer>;
}

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const buffer = await request.arrayBuffer();
        const readable = Readable.from(Buffer.from(buffer));

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
        }) as unknown as import('http').IncomingMessage;

        const form = formidable({
            multiples: false,
            keepExtensions: true,
            maxFileSize: 10 * 1024 * 1024, // 10MB
        });

        const [fields, files] = await form.parse(mockRequest);

        const format = Array.isArray(fields.format) ? fields.format[0] : fields.format || 'docx';

        const dataString = Array.isArray(fields.data) ? fields.data[0] : fields.data;
        if (!dataString) {
            return new NextResponse(JSON.stringify({ error: "缺少 data 参数" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        let data: DocumentData;
        try {
            data = JSON.parse(dataString);
        } catch {
            return new NextResponse(JSON.stringify({ error: "data 参数格式错误，必须是有效的 JSON" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const templateFile = Array.isArray(files.template) ? files.template[0] : files.template;
        if (!templateFile) {
            return new NextResponse(JSON.stringify({ error: "缺少模板文件" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const templateBuffer = await fs.promises.readFile(templateFile.filepath);

        const docBuffer = await generateDocxBuffer(data, templateBuffer, 'buffer');

        const normalizedFormat = format.toLowerCase() as SupportedFormat;

        if (!formatHandlers[normalizedFormat]) {
            return new NextResponse(
                JSON.stringify({
                    error: `不支持的格式: ${format}`,
                    supportedFormats: Object.keys(formatHandlers)
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const handler = formatHandlers[normalizedFormat];

        try {
            const processedBuffer = await handler.process(docBuffer);

            // 【新增：上传到云】
            const token = process.env.BLOB_READ_WRITE_TOKEN;
            if (!token) {
                return new NextResponse(JSON.stringify({ error: "缺少 BLOB_READ_WRITE_TOKEN" }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                });
            }

            const fileName = `document_${Date.now()}.${handler.fileExtension}`;

            const blob = await put(fileName, processedBuffer, {
                access: "public",
                contentType: handler.contentType,
                token,
            });

            // 【替换：原来这里是返回文件流，现在改成返回URL】
            return NextResponse.json({
                file_url: blob.url,
            });

        } catch (error) {
            console.error(`${format.toUpperCase()} 转换失败:`, error);
            return new NextResponse(
                JSON.stringify({ error: `${format.toUpperCase()} 转换失败` }),
                {
                    status: 500,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
    } catch (error) {
        console.error("文档生成失败:", error);
        return new NextResponse(JSON.stringify({ error: "文档生成失败" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}



// 格式处理器映射
const formatHandlers: Record<SupportedFormat, FormatHandler> = {
    docx: {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileExtension: 'docx',
        process: async (docBuffer: Buffer) => docBuffer,
    },
    pdf: {
        contentType: 'application/pdf',
        fileExtension: 'pdf',
        process: async (docBuffer: Buffer) => {
            try {
                return await convertDocxToPdf(docBuffer);
            } catch (error) {
                console.error('PDF 转换失败:', error);
                throw new Error('PDF 转换失败');
            }
        },
    },
    png: {
        contentType: 'image/png',
        fileExtension: 'png',
        process: async (docBuffer: Buffer) => {
            try {
                return await convertDocxToImage(docBuffer, 'png');
            } catch (error) {
                console.error('PNG 转换失败:', error);
                throw new Error('PNG 转换失败');
            }
        },
    },
    jpg: {
        contentType: 'image/jpeg',
        fileExtension: 'jpg',
        process: async (docBuffer: Buffer) => {
            try {
                return await convertDocxToImage(docBuffer, 'jpg');
            } catch (error) {
                console.error('JPG 转换失败:', error);
                throw new Error('JPG 转换失败');
            }
        },
    },
    jpeg: {
        contentType: 'image/jpeg',
        fileExtension: 'jpeg',
        process: async (docBuffer: Buffer) => {
            try {
                return await convertDocxToImage(docBuffer, 'jpeg');
            } catch (error) {
                console.error('JPEG 转换失败:', error);
                throw new Error('JPEG 转换失败');
            }
        },
    },
};