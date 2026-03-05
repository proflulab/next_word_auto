'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message, Select, Upload } from 'antd';
import { CloudOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, UploadOutlined } from '@ant-design/icons';
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
      // 使用 cellDates: true 让 xlsx 自动将日期序列号转换为 Date 对象
      const workbook = XLSX.read(data, { 
        cellDates: true,
        cellNF: false,
        cellText: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // 先获取原始单元格数据以便调试
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      console.log('Excel范围:', worksheet['!ref']);
      
      // 获取数据，保留原始格式
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        raw: false,
        defval: '',
        dateNF: 'yyyy/mm/dd'
      }) as Array<Record<string, unknown>>;
      
      if (jsonData.length === 0) {
        message.error('Excel文件中没有数据');
        return false;
      }
      
      console.log('原始Excel数据（前2行）:', jsonData.slice(0, 2));
      
      // 处理数据，特别是日期格式
      const processedData = jsonData.map((row, rowIndex) => {
        const processedRow: Record<string, string | number | boolean | null | undefined> = {};
        
        Object.keys(row).forEach(key => {
          const value = row[key];
          
          // 调试：打印原始值类型
          if (rowIndex === 0) {
            console.log(`字段 "${key}" 的值类型:`, typeof value, '值:', value);
          }
          
          // 处理日期类型
          if (value instanceof Date && !isNaN(value.getTime())) {
            // 使用 UTC 方法避免时区问题
            const year = value.getUTCFullYear();
            const month = String(value.getUTCMonth() + 1).padStart(2, '0');
            const day = String(value.getUTCDate()).padStart(2, '0');
            processedRow[key] = `${year}/${month}/${day}`;
            if (rowIndex === 0) {
              console.log(`日期转换: ${value} -> ${processedRow[key]}`);
            }
          }
          // 处理可能是日期序列号的数字（Excel日期范围：1900-01-01 到 2099-12-31）
          else if (typeof value === 'number' && value > 1 && value < 73050) {
            // Excel日期序列号转换
            // Excel的日期系统从1900年1月1日开始，但有个bug认为1900年是闰年
            // 所以对于1900年3月1日之后的日期需要减1天
            const excelEpoch = new Date(Date.UTC(1899, 11, 30)); // 1899年12月30日 UTC
            const milliseconds = value * 86400000; // 转换为毫秒
            const date = new Date(excelEpoch.getTime() + milliseconds);
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            processedRow[key] = `${year}/${month}/${day}`;
            if (rowIndex === 0) {
              console.log(`Excel序列号转换: ${value} -> ${processedRow[key]}`);
            }
          }
          // 处理字符串日期格式
          else if (typeof value === 'string' && value.trim()) {
            // 尝试匹配各种日期格式
            const datePatterns = [
              /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // yyyy-mm-dd 或 yyyy/mm/dd
              /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/, // mm-dd-yyyy 或 dd-mm-yyyy
            ];
            
            let matched = false;
            for (const pattern of datePatterns) {
              const dateMatch = value.match(pattern);
              if (dateMatch) {
                if (pattern === datePatterns[0]) {
                  // yyyy-mm-dd 格式
                  const [, year, month, day] = dateMatch;
                  processedRow[key] = `${year}/${month.padStart(2, '0')}/${day.padStart(2, '0')}`;
                } else {
                  // 尝试解析为日期对象
                  const parsedDate = new Date(value);
                  if (!isNaN(parsedDate.getTime())) {
                    const year = parsedDate.getFullYear();
                    const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
                    const day = String(parsedDate.getDate()).padStart(2, '0');
                    processedRow[key] = `${year}/${month}/${day}`;
                  } else {
                    processedRow[key] = value;
                  }
                }
                matched = true;
                if (rowIndex === 0) {
                  console.log(`字符串日期转换: ${value} -> ${processedRow[key]}`);
                }
                break;
              }
            }
            
            if (!matched) {
              processedRow[key] = value;
            }
          }
          // 处理布尔值
          else if (typeof value === 'boolean') {
            processedRow[key] = value;
          }
          // 处理数字
          else if (typeof value === 'number') {
            processedRow[key] = value;
          }
          // 处理 null 和 undefined
          else if (value === null || value === undefined) {
            processedRow[key] = value;
          }
          // 其他情况转为字符串
          else {
            processedRow[key] = String(value);
          }
        });
        
        return processedRow;
      });
      
      console.log('处理后的数据（前2行）:', processedData.slice(0, 2));
      setBatchDataList(processedData);
      message.success(`成功从Excel导入 ${processedData.length} 条数据`);
      return false;
    } catch (error) {
      console.error('解析Excel失败:', error);
      message.error('解析Excel文件失败，请确保文件格式正确');
      return false;
    }
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
      
      // 获取模板文件
      const templateResponse = await fetch(selectedTemplate.url);
      if (!templateResponse.ok) throw new Error(`获取模板失败: ${templateResponse.statusText}`);
      const templateBlob = await templateResponse.blob();
      const templateFile = new File([templateBlob], cloudTemplateName, { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      });
      
      // 使用前端循环调用 /api/document（与动态文档生成器相同的方式）
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
          
          // 使用与动态文档生成器相同的 API 调用方式
          const response = await fetch(`/api/document?format=${format}`, {
            method: 'POST',
            body: formDataToSend
          });
          
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
      
      // 打包并下载
      const zipBuffer = await zip.generateAsync({ type: 'blob' });
      const fileName = `batch_documents_${timestamp}.zip`;
      saveAs(zipBuffer, fileName);
      
      const formatName = format.toUpperCase();
      message.success(`${formatName}文档批量生成成功！成功生成 ${successCount}/${batchDataList.length} 个文档，已自动下载`);
    } catch (error) {
      console.error('批量生成文档失败:', error);
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
              {batchDataList.length > 0 && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="text-sm text-green-700">
                    ✅ 已成功导入 <span className="font-semibold">{batchDataList.length}</span> 条数据
                  </div>
                </div>
              )}
            </div>
          </Card>

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
