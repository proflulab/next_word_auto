import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import convertapi from 'convertapi';

// 初始化 convertapi
const converter = new convertapi('secret_CzjSiF4PTTXN5dhQ');

export async function POST(request: Request): Promise<NextResponse> {
    try {
        const data = await request.json();

        // 1. 生成 DOCX
        const filePath = path.join(process.cwd(), "public", "word", "Lulab_invioce.docx");
        const content = fs.readFileSync(filePath, "binary");

        const zip = new PizZip(content);
        const doc = new Docxtemplater(zip, {
            linebreaks: true,
            paragraphLoop: true,
        });

        doc.render({
            发放时间_en: data.issuanceDate,
            详细地址_en: data.address,
            城市_en: data.city,
            省份_en: data.state,
            邮编: data.postalCode,
            国家_en: data.country,
            姓名_en: data.name,
            学生学号: data.studentID,
            项目名称: data.programName,
            开始时间_en: data.startDate,
            结束时间_en: data.endDate,
            实际价格_美元: data.tuitionFeeUSD
        });

        // 生成 DOCX buffer
        const docBuffer = doc.getZip().generate({
            type: "nodebuffer",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

        // 2. 转换为 PDF
        // 创建临时文件夹（如果不存在）
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir);
        }

        // 保存临时 DOCX 文件
        const tempDocxPath = path.join(tempDir, `temp_${Date.now()}.docx`);
        fs.writeFileSync(tempDocxPath, docBuffer);

        // 转换为 PDF
        const result = await converter.convert('pdf', {
            File: tempDocxPath
        }, 'docx');

        // 获取 PDF 文件
        const pdfBuffer = await fetch(result.file.url).then(res => res.arrayBuffer());

        // 清理临时文件
        fs.unlinkSync(tempDocxPath);

        // 返回 PDF
        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="Lulab_invioce_${data.name}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Error generating document:', error);
        return new NextResponse(JSON.stringify({ error: 'Failed to generate document' }), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }
}