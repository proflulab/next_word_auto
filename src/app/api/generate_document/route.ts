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
        发放时间_en: data.issuanceDate,        // 发放时间
        详细地址_en: data.address,              // 详细地址
        城市_en: data.city,                     // 城市
        省份_en: data.state,                    // 省份
        邮编: data.postalCode,                  // 邮编
        国家_en: data.country,                  // 国家
        姓名_en: data.name,                     // 姓名
        学生学号: data.studentID,               // 学生学号
        项目名称: data.programName,             // 项目名称
        开始时间_en: data.startDate,            // 开始时间
        结束时间_en: data.endDate,              // 结束时间
        实际价格_美元: data.tuitionFeeUSD       // 实际价格（美元）
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