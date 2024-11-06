import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export async function POST(request: Request): Promise<NextResponse> {
    const data = await request.json(); // 从请求体中获取渲染数据

    // 使用 public 文件夹下的路径
    const filePath = path.join(process.cwd(), "public", "word", "Lulab_invioce.docx");
    const content = fs.readFileSync(filePath, "binary");

    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
        linebreaks: true,
        paragraphLoop: true,
    });

    // 渲染模板的变量，使用请求传入的数据
    doc.render({
        发放时间_en: data.发放时间_en,
        详细地址_en: data.详细地址_en,
        城市_en: data.城市_en,
        省份_en: data.省份_en,
        邮编: data.邮编,
        国家_en: data.国家_en,
        姓名_en: data.姓名_en,
        学生学号: data.学生学号,
        项目名称: data.项目名称,
        开始时间_en: data.开始时间_en,
        结束时间_en: data.结束时间_en,
        实际价格_美元: data.实际价格_美元,
    });

    // 生成文档为 buffer
    const docBuffer = doc.getZip().generate({
        type: "nodebuffer",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });

    // 设置响应头并返回文档
    return new NextResponse(docBuffer, {
        headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "Content-Disposition": 'attachment; filename="offer_letter.docx"',
        },
    });
}