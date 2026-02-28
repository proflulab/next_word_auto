'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message, Popconfirm, Select, Upload } from 'antd';
import { CloudOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, DeleteOutlined, UploadOutlined, FileExcelOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import TemplatePreview from '@/components/preview/TemplatePreview';
import { CloudTemplate } from '@/types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';

const { Title } = Typography;

export default function BatchPage() {
  const [batchDataList, setBatchDataList] = useState<Array<Record<string, string | number | boolean | null | undefined>>>([]);
  const [cloudTemplateName, setCloudTemplateName] = useState<string>('');
  const [cloudTemplates, setCloudTemplates] = useState<CloudTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplateUrl, setPreviewTemplateUrl] = useState<string>('');
  const [templateSource, setTemplateSource] = useState<string>('blob');
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [excelFileList, setExcelFileList] = useState<UploadFile[]>([]);

  const fetchCloudTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const response = await fetch('/api/templates');
      const result = await response.json();
      if (result.success) {
        setCloudTemplates(result.templates);
        if (cloudTemplateName && !result.templates.some((t: CloudTemplate) => t.name === cloudTemplateName)) {
          setCloudTemplateName('');
        }
      } else {
        message.error(result.message || '获取云端模板列表失败');
        setCloudTemplates([]);
      }
    } catch (error) {
      console.error('获取云端模板列表失败:', error);
      message.error('获取云端模板列表失败');
      setCloudTemplates([]);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [cloudTemplateName]);

  React.useEffect(() => {
    const initializeComponent = async () => {
      try {
        await fetchCloudTemplates();
      } catch (error) {
        console.error('Failed to fetch cloud templates:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    initializeComponent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExcelUpload = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 横向格式解析（第一行为字段名，后续行为数据）
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Array<Record<string, string | number | boolean | null | undefined>>;
      
      if (jsonData.length === 0) {
        message.error('Excel文件中没有数据');
        return false;
      }
      
      console.log('解析的数据:', jsonData);
      setBatchDataList(jsonData);
      message.success(`成功从Excel导入 ${jsonData.length} 条数据`);
      return false;
    } catch (error) {
      console.error('解析Excel失败:', error);
      message.error('解析Excel文件失败，请确保文件格式正确');
      return false;
    }
  };

  const deleteBatchData = (index: number) => {
    setBatchDataList(batchDataList.filter((_, i) => i !== index));
    message.success('数据已删除');
  };

  const generateDocument = async (format: 'docx' | 'pdf') => {
    const isDocx = format === 'docx';
    const setLoading = isDocx ? setIsGeneratingDocx : setIsGeneratingPdf;
    setLoading(true);
    try {
      if (!cloudTemplateName.trim()) throw new Error('请先选择模板');
      if (batchDataList.length === 0) throw new Error('请先添加至少一条数据');
      
      console.log('批量数据列表:', batchDataList);
      
      const selectedTemplate = cloudTemplates.find(t => t.name === cloudTemplateName);
      if (!selectedTemplate) throw new Error('模板不存在');
      const templateResponse = await fetch(selectedTemplate.url);
      if (!templateResponse.ok) throw new Error(`获取模板失败: ${templateResponse.statusText}`);
      const templateBlob = await templateResponse.blob();
      const templateFile = new File([templateBlob], cloudTemplateName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      const zip = new JSZip();
      const timestamp = Date.now();
      let successCount = 0;
      for (let i = 0; i < batchDataList.length; i++) {
        const data = batchDataList[i];
        try {
          console.log(`生成文档 ${i + 1}/${batchDataList.length}，数据:`, data);
          const formDataToSend = new FormData();
          formDataToSend.append('data', JSON.stringify(data));
          formDataToSend.append('template', templateFile);
          formDataToSend.append('format', format);
          const response = await fetch('/api/document', { method: 'POST', body: formDataToSend });
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API错误响应:`, errorText);
            throw new Error(`生成文档失败: ${response.statusText}`);
          }
          const blob = await response.blob();
          const fileExtension = format === 'pdf' ? 'pdf' : 'docx';
          const fileName = `document_${timestamp}_${String(i + 1).padStart(4, '0')}.${fileExtension}`;
          zip.file(fileName, blob);
          successCount++;
        } catch (error) {
          console.error(`生成文档 ${i + 1} 失败:`, error);
          message.warning(`文档 ${i + 1} 生成失败，继续处理其他文档`);
        }
      }
      if (successCount === 0) throw new Error('所有文档生成都失败了');
      const zipBuffer = await zip.generateAsync({ type: 'blob' });
      const fileName = `batch_documents_${timestamp}.zip`;
      saveAs(zipBuffer, fileName);
      const formatName = format.toUpperCase();
      message.success(`${formatName}文档生成成功！成功生成 ${successCount}/${batchDataList.length} 个文档，已自动下载`);
    } catch (error) {
      console.error('Error generating documents:', error);
      message.error(error instanceof Error ? error.message : '文档生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <Card>
            <Title level={2} className="text-center mb-8">批量文档生成</Title>
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">正在加载模板...</span>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <Card>
          <Title level={2} className="text-center mb-8">批量文档生成</Title>

          {/* 模板选择 */}
          <Card title="模板选择" className="mb-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">模板来源</label>
                <Select value={templateSource} onChange={(value) => setTemplateSource(value)} className="w-full" options={[{ label: (<div className="flex items-center"><CloudOutlined className="mr-2 text-blue-600" /><span>Vercel Blob</span></div>), value: 'blob' }]} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择模板</label>
                <div className="flex gap-2">
                  <Select placeholder="请选择云端模板文件" value={cloudTemplateName || undefined} onChange={(value) => setCloudTemplateName(value)} className="flex-1" loading={isLoadingTemplates} showSearch filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())} options={cloudTemplates.map(template => ({ label: (<div className="flex justify-between items-center"><span>{template.name}</span><span className="text-xs text-gray-400">{(template.size / 1024).toFixed(1)}KB</span></div>), value: template.name }))} notFoundContent={isLoadingTemplates ? '加载中...' : '暂无可用模板'} />
                  <Button icon={<EyeOutlined />} onClick={() => { if (cloudTemplateName) { const selectedTemplate = cloudTemplates.find(t => t.name === cloudTemplateName); if (selectedTemplate) { setPreviewTemplateUrl(selectedTemplate.url); setPreviewVisible(true); } } else { message.warning('请先选择一个模板'); } }} disabled={!cloudTemplateName || isLoadingTemplates} title="预览模板">预览</Button>
                </div>
              </div>
            </div>
          </Card>

          {/* Excel导入区域 */}
          <Card title="Excel批量导入" className="mb-6">
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="text-sm text-gray-700">
                  <div className="font-medium mb-2">使用说明：</div>
                  <div className="text-xs text-gray-600 space-y-1">
                    <div>💡 Excel格式：第一行为字段名，后续行为数据（每行一个文档）</div>
                    <div>💡 字段名必须与Word模板中的占位符一致（如 {'{颁发机构}'}, {'{证书编号}'}）</div>
                    <div>💡 支持 .xlsx 和 .xls 格式</div>
                    <div>💡 上传后系统会自动解析并显示数据条数</div>
                  </div>
                </div>
              </div>

              <Upload
                accept=".xlsx,.xls"
                fileList={excelFileList}
                beforeUpload={(file) => {
                  handleExcelUpload(file);
                  setExcelFileList([file as UploadFile]);
                  return false;
                }}
                onRemove={() => {
                  setExcelFileList([]);
                  setBatchDataList([]);
                  return true;
                }}
                maxCount={1}
              >
                <Button icon={<UploadOutlined />} size="large" type="primary">上传Excel文件</Button>
              </Upload>
              <div className="text-xs text-gray-500">
                第一行为字段名，后续行为数据。每行代表一个文档。确保字段名与模板占位符完全一致。
              </div>
            </div>
          </Card>

          {/* 数据列表 */}
          {batchDataList.length > 0 && (
            <Card title={`已添加数据 (${batchDataList.length} 条)`} className="mb-6">
              <div className="space-y-2">
                {batchDataList.map((data, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">数据 #{index + 1}</div>
                      <div className="text-xs text-gray-500 mt-1">{Object.entries(data).slice(0, 3).map(([key, value]) => `${key}: ${value}`).join(' | ')}{Object.keys(data).length > 3 && '...'}</div>
                    </div>
                    <Popconfirm title="确定要删除此数据吗？" onConfirm={() => deleteBatchData(index)} okText="确定" cancelText="取消"><Button danger size="small" icon={<DeleteOutlined />} type="text" /></Popconfirm>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 生成按钮 */}
          <Card>
            <div className="text-center">
              <Space>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<DownloadOutlined />} 
                  loading={isGeneratingDocx} 
                  onClick={() => generateDocument('docx')}
                  disabled={batchDataList.length === 0}
                >
                  生成DOCX文档
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<FilePdfOutlined />} 
                  loading={isGeneratingPdf} 
                  onClick={() => generateDocument('pdf')} 
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  disabled={batchDataList.length === 0}
                >
                  生成PDF文档
                </Button>
              </Space>
              {batchDataList.length === 0 && (
                <div className="text-xs text-gray-500 mt-3">
                  请先上传Excel文件
                </div>
              )}
            </div>
          </Card>

          {previewVisible && <TemplatePreview templateUrl={previewTemplateUrl} templateName={cloudTemplateName} visible={previewVisible} onClose={() => setPreviewVisible(false)} />}
        </Card>
      </div>
    </div>
  );
}
