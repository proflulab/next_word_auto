import React, { useState } from 'react';
import { Modal, Spin, Alert, Button } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';

const getFileExtension = (url: string): string => {
    const urlWithoutQuery = url.split('?')[0];
    const parts = urlWithoutQuery.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
};

const getFileType = (url: string): 'office' | 'pdf' | 'image' | 'unknown' => {
    const ext = getFileExtension(url);
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
    if (ext === 'pdf') return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(ext)) return 'image';
    return 'unknown';
};

interface OfficeViewerProps {
    fileUrl: string;
}

const OfficeViewer: React.FC<OfficeViewerProps> = ({ fileUrl }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    
    const getOfficeWebViewerUrl = (url: string): string => {
        const encodedUrl = encodeURIComponent(url);
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
    };

    return (
        <div className="relative h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
                    <Spin size="large" />
                    <p className="mt-4 text-gray-600">正在加载预览...</p>
                </div>
            )}
            {error && <Alert message="预览出错" description={error} type="error" showIcon className="m-4" />}
            <iframe
                src={getOfficeWebViewerUrl(fileUrl)}
                width="100%"
                height="100%"
                onLoad={() => setIsLoading(false)}
                onError={() => { setIsLoading(false); setError('预览加载失败'); }}
                title="Office Document Preview"
                style={{ minHeight: '600px', border: 'none' }}
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
        </div>
    );
};

const PDFViewer: React.FC<{ fileUrl: string }> = ({ fileUrl }) => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    return (
        <div className="relative h-full">
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center z-10">
                    <Spin size="large" />
                </div>
            )}
            <iframe
                src={`${fileUrl}#view=FitH`}
                width="100%"
                height="100%"
                onLoad={() => setIsLoading(false)}
                title="PDF Preview"
                style={{ border: 'none', minHeight: '600px' }}
            />
        </div>
    );
};

const ImageViewer: React.FC<{ fileUrl: string }> = ({ fileUrl }) => {
    const [scale, setScale] = useState<number>(1);
    return (
        <div className="relative h-full flex flex-col bg-gray-100">
            <div className="absolute top-2 right-2 z-20 flex gap-2">
                <Button size="small" onClick={() => setScale(p => Math.max(p - 0.2, 0.5))} icon={<ZoomOutOutlined />}>缩小</Button>
                <Button size="small" onClick={() => setScale(1)}>{Math.round(scale * 100)}%</Button>
                <Button size="small" onClick={() => setScale(p => Math.min(p + 0.2, 3))} icon={<ZoomInOutlined />}>放大</Button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
                <img src={fileUrl} alt="Preview" style={{ transform: `scale(${scale})`, maxWidth: '100%', maxHeight: '100%' }} />
            </div>
        </div>
    );
};

const UniversalViewer: React.FC<{ fileUrl: string }> = ({ fileUrl }) => {
    const fileType = getFileType(fileUrl);
    if (fileType === 'office') return <OfficeViewer fileUrl={fileUrl} />;
    if (fileType === 'pdf') return <PDFViewer fileUrl={fileUrl} />;
    if (fileType === 'image') return <ImageViewer fileUrl={fileUrl} />;
    return (
        <div className="h-full flex items-center justify-center">
            <Alert message="不支持的文件类型" description="支持 Office、PDF 和图片文件" type="warning" showIcon />
        </div>
    );
};

interface TemplatePreviewProps {
    visible: boolean;
    onClose: () => void;
    templateUrl: string;
    templateName: string;
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ visible, onClose, templateUrl, templateName }) => {
    return (
        <Modal
            title={`模板预览 - ${templateName}`}
            open={visible}
            onCancel={onClose}
            footer={[<Button key="close" onClick={onClose}>关闭</Button>]}
            width="50vw"
            centered
            styles={{ body: { height: '70vh', overflow: 'hidden', padding: '0' } }}
        >
            {templateUrl && <UniversalViewer fileUrl={templateUrl} />}
        </Modal>
    );
};

export default TemplatePreview;
