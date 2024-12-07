import { NextRequest, NextResponse } from 'next/server';
import convertapi from 'convertapi';

const converter = convertapi('secret_tZZbgUHdEMJy5b78');

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Convert the file to buffer
        const buffer = await file.arrayBuffer();
        
        // Convert to PDF using ConvertAPI
        const result = await converter.convert('pdf', {
            File: {
                data: Buffer.from(buffer),
                filename: file.name
            }
        }, file.name.split('.').pop()?.toLowerCase());

        // Get the PDF file content
        const pdfResponse = await fetch(result.file.url);
        const pdfBuffer = await pdfResponse.arrayBuffer();

        // Return the PDF directly with proper headers
        return new NextResponse(pdfBuffer, {
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="${file.name.split('.')[0]}.pdf"`,
            },
        });

    } catch (error) {
        console.error('Conversion error:', error);
        return NextResponse.json(
            { error: 'Error converting file' },
            { status: 500 }
        );
    }
}
