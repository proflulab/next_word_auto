import { NextRequest, NextResponse } from 'next/server';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as fs from 'fs';
import * as path from 'path';
import convertapi from 'convertapi';

const converter = new convertapi('secret_tZZbgUHdEMJy5b78');

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();
        const format = request.nextUrl.searchParams.get('format') || 'pdf';

        // Check if the data contains any unexpected or special characters
        console.log('Received data:', data);

        // Read template file
        const templatePath = path.join(process.cwd(), 'public', 'word', 'Lulab_invioce.docx');
        if (!fs.existsSync(templatePath)) {
            return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
        }

        const template = fs.readFileSync(templatePath);
        const zip = new PizZip(template);
        const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

        // Fill template data
        try {
            doc.render(data);
        } catch (error) {
            console.error("Error during template rendering:", error);
            return NextResponse.json({ error: 'Template rendering failed' }, { status: 500 });
        }

        const wordContent = doc.getZip().generate({
            type: 'nodebuffer',
            mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        });

        if (format === 'word') {
            return new NextResponse(wordContent, {
                headers: {
                    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'Content-Disposition': 'attachment; filename="Generated_Document.docx"',
                },
            });
        }

        // Convert to PDF
        const tempDocxPath = path.join(process.cwd(), 'temp', `temp_${Date.now()}.docx`);
        fs.writeFileSync(tempDocxPath, wordContent);

        try {
            const result = await converter.convert('pdf', { File: tempDocxPath }, 'docx');
            const pdfResponse = await fetch(result.file.url);
            const pdfBuffer = await pdfResponse.arrayBuffer();

            // Clean up temp file
            fs.unlinkSync(tempDocxPath);

            return new NextResponse(pdfBuffer, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': 'attachment; filename="Generated_Document.pdf"',
                },
            });
        } catch (err) {
            fs.unlinkSync(tempDocxPath);
            console.error("Error during PDF conversion:", err);
            return NextResponse.json({ error: 'PDF conversion failed' }, { status: 500 });
        }
    } catch (error) {
        console.error("General error:", error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    }
}
