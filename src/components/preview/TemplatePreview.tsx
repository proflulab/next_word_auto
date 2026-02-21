/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-11-27 20:38:28
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-12-10 21:14:57
 * @FilePath: /docuflow/src/components/preview/TemplatePreview.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import React, { useState, useEffect, useRef } from 'react'
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
    const [scrollLeft, setScrollLeft] = useState<number>(0)
    const containerRef = useRef<HTMLDivElement>(null)
    const isDraggingRef = useRef<boolean>(false)
    const dragStartRef = useRef<number>(0)
    
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

    const handleMouseDown = (e: React.MouseEvent) => {
        isDraggingRef.current = true
        dragStartRef.current = e.clientX + scrollLeft
    }

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDraggingRef.current || !containerRef.current) return
        
        const newScrollLeft = dragStartRef.current - e.clientX
        setScrollLeft(Math.max(0, newScrollLeft))
    }

    const handleMouseUp = () => {
        isDraggingRef.current = false
    }

    const handleScrollBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScrollLeft(Number(e.target.value))
    }

    // 计算滚动条的最大值
    const getMaxScroll = () => {
        if (!containerRef.current) return 100
        const scrollWidth = containerRef.current.scrollWidth
        const clientWidth = containerRef.current.clientWidth
        const max = Math.max(0, scrollWidth - clientWidth)
        return max > 0 ? max : 100
    }

    return (
        <div className="relative h-full flex flex-col">
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
            
            {/* 文档容器 */}
            <div 
                ref={containerRef}
                className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-white"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ 
                    transform: `translateX(-${scrollLeft}px)`,
                    transition: isDraggingRef.current ? 'none' : 'transform 0.1s ease-out'
                }}
            >
                <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: `${100 / scale}%`, height: `${100 / scale}%` }}>
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
            
            {/* 水平滚动条 */}
            <div className="h-5 bg-gray-200 border-t border-gray-400 flex items-center px-0.5">
                <style>{`
                    .doc-scrollbar {
                        width: 100%;
                        height: 8px;
                        -webkit-appearance: none;
                        appearance: none;
                        background: transparent;
                        cursor: pointer;
                    }
                    
                    .doc-scrollbar::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 60px;
                        height: 8px;
                        border-radius: 4px;
                        background: #666;
                        cursor: pointer;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    }
                    
                    .doc-scrollbar::-webkit-slider-thumb:hover {
                        background: #555;
                    }
                    
                    .doc-scrollbar::-webkit-slider-runnable-track {
                        background: #ccc;
                        height: 8px;
                        border-radius: 4px;
                    }
                    
                    .doc-scrollbar::-moz-range-thumb {
                        width: 60px;
                        height: 8px;
                        border-radius: 4px;
                        background: #666;
                        cursor: pointer;
                        border: none;
                        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                    }
                    
                    .doc-scrollbar::-moz-range-thumb:hover {
                        background: #555;
                    }
                    
                    .doc-scrollbar::-moz-range-track {
                        background: #ccc;
                        height: 8px;
                        border-radius: 4px;
                        border: none;
                    }
                `}</style>
                <input
                    type="range"
                    min="0"
                    max={getMaxScroll()}
                    value={scrollLeft}
                    onChange={handleScrollBarChange}
                    className="doc-scrollbar"
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
