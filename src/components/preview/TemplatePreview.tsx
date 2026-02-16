/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-27 20:38:28
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-10 21:14:57
 * @FilePath: /docuflow/src/components/preview/TemplatePreview.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import React, { useState, useEffect } from 'react'
import { Modal, Spin, Alert, Button, Space } from 'antd'
import { ReloadOutlined, DownloadOutlined, ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons'

// OfficeWebViewer 组件使用微软 Office Web Viewer 来预览文档
interface OfficeWebViewerProps {
    fileUrl: string
}

const OfficeWebViewer = (props: OfficeWebViewerProps) => {
    const { fileUrl } = props
    const [isLoading, setIsLoading] = useState<boolean>(true)
    const [error, setError] = useState<string | null>(null)
    const [loadTimeout, setLoadTimeout] = useState<boolean>(false)
    const [scale, setScale] = useState<number>(0.8)
    
    // 构建 Office Web Viewer 的嵌入 URL
    const getOfficeWebViewerUrl = (url: string) => {
        // 确保 URL 是公开可访问的，并且需要进行 URL 编码
        const encodedUrl = encodeURIComponent(url)
        return `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`
    }

    // 设置加载超时
    useEffect(() => {
        const timer = setTimeout(() => {
            if (isLoading) {
                setLoadTimeout(true)
                setError('预览加载超时，请检查网络连接或稍后重试')
            }
        }, 15000) // 15秒超时

        return () => clearTimeout(timer)
    }, [isLoading])

    const handleIframeLoad = () => {
        setIsLoading(false)
        setError(null)
        setLoadTimeout(false)
    }

    const handleIframeError = () => {
        setIsLoading(false)
        setError('预览加载失败，请确保文档 URL 可公开访问')
    }

    const handleRetry = () => {
        setIsLoading(true)
        setError(null)
        setLoadTimeout(false)
    }

    const handleDownload = () => {
        const link = document.createElement('a')
        link.href = fileUrl
        link.download = fileUrl.split('/').pop() || 'document'
        link.style.display = 'none'
        document.body.appendChild(link)
        link.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        document.body.removeChild(link)
    }

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.1, 2))
    }

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.1, 0.5))
    }

    const handleResetZoom = () => {
        setScale(0.8)
    }

    return (
        <div className="relative h-full">
            {error && (
                <Alert
                    message="预览出错"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    action={
                        <Space>
                            <Button size="small" onClick={handleRetry} icon={<ReloadOutlined />}>
                                重试
                            </Button>
                            <Button size="small" onClick={handleDownload} icon={<DownloadOutlined />}>
                                下载
                            </Button>
                        </Space>
                    }
                    className="mb-4"
                />
            )}
            <div className="absolute top-2 right-2 z-20 flex gap-2">
                <Button 
                    size="small" 
                    onClick={handleZoomOut}
                    icon={<ZoomOutOutlined />}
                    disabled={scale <= 0.5}
                >
                    缩小
                </Button>
                <Button 
                    size="small" 
                    onClick={handleResetZoom}
                    disabled={scale === 0.8}
                >
                    {Math.round(scale * 100)}%
                </Button>
                <Button 
                    size="small" 
                    onClick={handleZoomIn}
                    icon={<ZoomInOutlined />}
                    disabled={scale >= 2}
                >
                    放大
                </Button>
            </div>
            {isLoading && !error && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 z-10">
                    <Spin size="large" />
                    <p className="mt-4 text-gray-600">正在加载预览...</p>
                    {loadTimeout && (
                        <p className="mt-2 text-sm text-orange-600">加载时间较长，请耐心等待</p>
                    )}
                </div>
            )}
            <div className="h-full overflow-auto" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%`, height: `${100 / scale}%` }}>
                <iframe
                    src={getOfficeWebViewerUrl(fileUrl)}
                    width="100%"
                    height="100%"
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                    title="Office Document Preview"
                    style={{ minHeight: '750px', border: 'none' }}
                    sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                />
            </div>
        </div>
    )
}

// TemplatePreview 组件用于模板预览弹窗
interface TemplatePreviewProps {
    visible: boolean
    onClose: () => void
    templateUrl: string
    templateName: string
}

const TemplatePreview = (props: TemplatePreviewProps) => {
    const { visible, onClose, templateUrl, templateName } = props

    return (
        <Modal
            title={`模板预览 - ${templateName}`}
            open={visible}
            onCancel={onClose}
            footer={[
                <Button key="close" onClick={onClose}>
                    关闭
                </Button>
            ]}
            width="50vw"
            centered
            styles={{ body: { height: '70vh', overflow: 'hidden', padding: '0' } }}
        >
            {templateUrl && (
                <OfficeWebViewer fileUrl={templateUrl} />
            )}
        </Modal>
    )
}

export default TemplatePreview


