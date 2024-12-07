import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as fs from 'fs';
import * as path from 'path';
import convertapi from 'convertapi';

// 初始化 ConvertAPI
const converter = new convertapi('secret_tZZbgUHdEMJy5b78');

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        console.log('Received data:', data);
        
        // 1. 读取模板文件
        const templatePath = path.join(process.cwd(), 'public', 'word', 'Lulab_invioce.docx');
        console.log('Template path:', templatePath);
        
        if (!fs.existsSync(templatePath)) {
            console.error('Template file not found at:', templatePath);
            return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
        }

        // 读取模板文件
        console.log('Reading template file...');
        const template = fs.readFileSync(templatePath);
        console.log('Template file size:', template.length, 'bytes');
        
        // 2. 生成Word文档
        console.log('Creating PizZip instance...');
        const zip = new PizZip(template);
        
        console.log('Creating Docxtemplater instance...');
        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
        });

        // 准备模板数据
        const templateData = {
            '发放时间_en': data.issuanceDate,
            '详细地址_en': data.address,
            '城市_en': data.city,
            '省份_en': data.state,
            '邮编': data.postalCode,
            '国家_en': data.country,
            '姓名_en': data.name,
            '学生学号': data.studentID,
            '项目名称': data.programName,
            '开始时间_en': data.startDate,
            '结束时间_en': data.endDate,
            '实际价格_美元': data.tuitionFeeUSD
        };

        console.log('Template data:', templateData);

        try {
            // 渲染文档
            console.log('Rendering document...');
            doc.render(templateData);
            console.log('Document rendered successfully');
        } catch (error) {
            console.error('Error rendering document:', error);
            return NextResponse.json({ 
                error: 'Error rendering document',
                details: error instanceof Error ? error.message : String(error)
            }, { status: 500 });
        }

        // 3. 获取生成的Word文档
        console.log('Generating Word document...');
        const wordContent = doc.getZip().generate({
            type: 'nodebuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });
        console.log('Word document size:', wordContent.length, 'bytes');

        try {
            // 4. 转换为PDF
            console.log('Converting to PDF...');
            console.log('Word content type:', typeof wordContent);
            console.log('Word content buffer:', wordContent instanceof Buffer);
            
            // 创建临时文件
            const tempDir = path.join(process.cwd(), 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            const tempDocxPath = path.join(tempDir, `temp_${Date.now()}.docx`);
            fs.writeFileSync(tempDocxPath, wordContent);
            
            console.log('Temporary file created at:', tempDocxPath);

            try {
                const result = await converter.convert('pdf', {
                    File: tempDocxPath
                }, 'docx');

                console.log('PDF conversion result:', result);
                console.log('PDF URL:', result.file.url);

                // 5. 获取PDF内容
                console.log('Fetching PDF from URL...');
                const pdfResponse = await fetch(result.file.url);
                console.log('PDF response status:', pdfResponse.status);
                
                if (!pdfResponse.ok) {
                    const errorText = await pdfResponse.text();
                    throw new Error(`Failed to fetch converted PDF: ${pdfResponse.status} ${pdfResponse.statusText}\nError: ${errorText}`);
                }

                console.log('Converting PDF to array buffer...');
                const pdfBuffer = await pdfResponse.arrayBuffer();
                console.log('PDF size:', pdfBuffer.byteLength, 'bytes');

                // 清理临时文件
                try {
                    fs.unlinkSync(tempDocxPath);
                    console.log('Temporary file cleaned up');
                } catch (cleanupError) {
                    console.error('Error cleaning up temporary file:', cleanupError);
                }

                // 6. 返回PDF文件
                console.log('Sending PDF response...');
                return new NextResponse(pdfBuffer, {
                    headers: {
                        'Content-Type': 'application/pdf',
                        'Content-Disposition': `attachment; filename="Lulab_invoice_${data.name}.pdf"`,
                    },
                });
            } finally {
                // 确保在任何情况下都清理临时文件
                if (fs.existsSync(tempDocxPath)) {
                    try {
                        fs.unlinkSync(tempDocxPath);
                        console.log('Temporary file cleaned up');
                    } catch (cleanupError) {
                        console.error('Error cleaning up temporary file:', cleanupError);
                    }
                }
            }
        } catch (error) {
            console.error('Error in PDF conversion:', error);
            return NextResponse.json({ 
                error: 'Error converting to PDF',
                details: error instanceof Error ? error.message : String(error)
            }, { status: 500 });
        }

    } catch (error) {
        console.error('Detailed error:', error);
        return NextResponse.json({
            error: 'Failed to generate document',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}