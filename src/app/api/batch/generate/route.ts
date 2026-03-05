import { NextResponse } from 'next/server';
import { generateDocxBuffer, type DocumentData } from '@/services/docxTemplateService';
import { convertDocxToPdf } from '@/services/pdfConverter';
import JSZip from 'jszip';
import formidable from 'formidable';
import { Readable } from 'stream';
import fs from 'fs';

interface BatchItem {
  id: string;
  data: Record<string, string | number | boolean | null | undefined>;
}

export async function POST(request: Request) {
  try {
    console.log('批量生成API收到请求');
    
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
      maxFileSize: 10 * 1024 * 1024,
    });

    const [fields, files] = await form.parse(mockRequest);
    console.log('表单解析完成');

    const format = (Array.isArray(fields.format) ? fields.format[0] : fields.format) || 'docx';
    const itemsString = Array.isArray(fields.items) ? fields.items[0] : fields.items;
    
    if (!itemsString) {
      return NextResponse.json({ error: '缺少 items 参数' }, { status: 400 });
    }

    let items: BatchItem[];
    try {
      items = JSON.parse(itemsString);
    } catch {
      return NextResponse.json({ error: 'items 参数格式错误' }, { status: 400 });
    }

    const templateFile = Array.isArray(files.template) ? files.template[0] : files.template;
    if (!templateFile) {
      return NextResponse.json({ error: '缺少模板文件' }, { status: 400 });
    }

    const templateBuffer = await fs.promises.readFile(templateFile.filepath);
    console.log('模板文件读取完成，大小:', templateBuffer.length);

    const zip = new JSZip();
    const timestamp = Date.now();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        console.log(`生成文档 ${i + 1}/${items.length}`);
        
        let docBuffer = await generateDocxBuffer(
          item.data as DocumentData,
          templateBuffer,
          'buffer'
        );

        if (format === 'pdf') {
          try {
            docBuffer = await convertDocxToPdf(docBuffer);
          } catch (pdfError) {
            console.error(`PDF转换失败:`, pdfError);
            const fileName = `document_${timestamp}_${String(i + 1).padStart(4, '0')}.docx`;
            zip.file(fileName, docBuffer);
            continue;
          }
        }

        const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
        const fileName = `document_${timestamp}_${String(i + 1).padStart(4, '0')}.${fileExtension}`;
        zip.file(fileName, docBuffer);
      } catch (error) {
        console.error(`生成文档失败:`, error);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    console.log('ZIP文件生成完成，大小:', zipBuffer.length);

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="batch_documents_${timestamp}.zip"`,
      },
    });
  } catch (error) {
    console.error('批量生成失败:', error);
    return NextResponse.json(
      { error: '批量生成失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
