'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message, Popconfirm, Select, Input } from 'antd';
import { CloudOutlined, SettingOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import TemplatePreview from '@/components/preview/TemplatePreview';
import { CloudTemplate } from '@/types';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

const { Title } = Typography;

export default function BatchPage() {
  const [batchDataList, setBatchDataList] = useState<Array<Record<string, string | number | boolean | null | undefined>>>([]);
  const [cloudTemplateName, setCloudTemplateName] = useState<string>('');
  const [cloudTemplates, setCloudTemplates] = useState<CloudTemplate[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [isAutoConfiguring, setIsAutoConfiguring] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewTemplateUrl, setPreviewTemplateUrl] = useState<string>('');
  const [templateSource, setTemplateSource] = useState<string>('blob');
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [batchInputText, setBatchInputText] = useState<string>('');
  const [showCountSelector, setShowCountSelector] = useState(false);
  const [templateCount, setTemplateCount] = useState<number>(1);
  const [customCount, setCustomCount] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');

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

  const autoConfigureFields = async () => {
    if (!cloudTemplateName) {
      message.warning('请先选择一个模板');
      return;
    }
    setShowCountSelector(true);
  };

  const generateTemplates = async () => {
    // 确定实际要生成的数量
    let actualCount = templateCount;
    if (templateCount === 0) {
      const parsed = parseInt(customCount);
      if (isNaN(parsed) || parsed < 1 || parsed > 1000) {
        message.error('请输入有效的数量（1-1000）');
        return;
      }
      actualCount = parsed;
    }

    setIsAutoConfiguring(true);
    const hideLoading = message.loading('正在分析模板字段...', 0);
    try {
      const selectedTemplate = cloudTemplates.find((t: CloudTemplate) => t.name === cloudTemplateName);
      if (!selectedTemplate) throw new Error('指定的模板文件不存在');
      
      // 验证模板URL
      console.log('模板信息:', {
        name: selectedTemplate.name,
        url: selectedTemplate.url,
        size: selectedTemplate.size
      });
      
      const templateResponse = await fetch(selectedTemplate.url);
      if (!templateResponse.ok) {
        throw new Error(`获取模板失败: ${templateResponse.status} ${templateResponse.statusText}`);
      }
      
      const templateBlob = await templateResponse.blob();
      console.log('模板Blob信息:', {
        size: templateBlob.size,
        type: templateBlob.type
      });
      
      // 验证是否是有效的docx文件
      if (templateBlob.size === 0) {
        throw new Error('模板文件为空');
      }
      
      if (!templateBlob.type.includes('wordprocessingml') && 
          !templateBlob.type.includes('officedocument') &&
          !templateBlob.type.includes('octet-stream')) {
        console.warn('模板文件类型可能不正确:', templateBlob.type);
      }
      
      const formData = new FormData();
      formData.append('template', templateBlob, cloudTemplateName);
      
      const response = await fetch('/api/template-fields', { method: 'POST', body: formData });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API响应错误:', errorText);
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('API返回结果:', result);
      
      if (result.success && result.fields) {
        if (result.fields.length === 0) {
          hideLoading();
          message.warning('模板中没有找到任何字段，请确保模板使用了 {字段名} 格式的占位符');
          return;
        }
        
        // 生成对应数量的模板数据
        const templates: Array<Record<string, string | number | boolean | null | undefined>> = [];
        for (let i = 0; i < actualCount; i++) {
          const template: Record<string, string | number | boolean | null | undefined> = {};
          result.fields.forEach((fieldName: string) => {
            template[fieldName] = '';
          });
          templates.push(template);
        }
        
        // 将模板转换为格式化的JSON字符串（用于显示）
        const jsonTemplates = templates.map((template) => 
          JSON.stringify(template, null, 2)
        ).join(',\n');
        
        setBatchInputText(jsonTemplates);
        
        // 自动将模板添加到数据列表中
        setBatchDataList([...batchDataList, ...templates]);
        
        setShowCountSelector(false);
        setTemplateCount(1);
        setCustomCount('');
        
        hideLoading();
        message.success({ content: `🎉 成功生成 ${actualCount} 个配置模板！已添加到数据列表，可在JSON区域编辑后点击"更新数据"`, duration: 5 });
      } else {
        hideLoading();
        message.error({ 
          content: result.message || '❌ 获取模板字段失败，请检查模板格式', 
          duration: 6 
        });
        
        // 提供更详细的错误信息
        if (result.error) {
          console.error('详细错误:', result.error);
          message.info({
            content: `提示：请确保模板是有效的.docx文件，并使用 {字段名} 格式的占位符`,
            duration: 8
          });
        }
      }
    } catch (error) {
      console.error('自动配置字段失败:', error);
      hideLoading();
      
      let errorMessage = '❌ 自动配置字段失败';
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      
      message.error({ content: errorMessage, duration: 6 });
      
      // 提供故障排除建议
      message.info({
        content: '故障排除：1) 确认模板文件可访问 2) 检查模板是否为有效的.docx格式 3) 确保使用了 {字段名} 占位符',
        duration: 10
      });
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  const parseJsonData = () => {
    if (!batchInputText.trim()) {
      message.warning('请输入数据');
      return;
    }
    try {
      let data: Record<string, unknown>[] | Record<string, unknown>;
      let trimmedText = batchInputText.trim();
      trimmedText = trimmedText.replace(/'/g, '"').replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":');
      try {
        if (trimmedText.startsWith('[')) {
          data = JSON.parse(trimmedText);
        } else {
          data = JSON.parse(`[${trimmedText}]`);
        }
      } catch {
        const objectMatches = trimmedText.match(/\{[^{}]*\}/g);
        if (objectMatches && objectMatches.length > 0) {
          data = objectMatches.map(obj => JSON.parse(obj));
        } else {
          throw new Error('无法解析JSON格式，请检查数据格式');
        }
      }
      if (!Array.isArray(data)) data = [data];
      const newBatchData: Array<Record<string, string | number | boolean | null | undefined>> = [];
      data.forEach((item: Record<string, unknown>, index: number) => {
        if (typeof item !== 'object' || item === null) throw new Error(`第 ${index + 1} 项不是有效的对象`);
        const record: Record<string, string | number | boolean | null | undefined> = {};
        Object.entries(item).forEach(([key, value]) => {
          record[key] = value as string | number | boolean | null | undefined;
        });
        newBatchData.push(record);
      });
      if (newBatchData.length === 0) {
        message.warning('没有有效的数据');
        return;
      }
      // 根据导入模式决定是替换还是追加
      if (importMode === 'replace') {
        setBatchDataList(newBatchData);
        message.success(`成功导入 ${newBatchData.length} 条数据（已替换原有数据）`);
      } else {
        setBatchDataList([...batchDataList, ...newBatchData]);
        message.success(`成功追加 ${newBatchData.length} 条数据（总计 ${batchDataList.length + newBatchData.length} 条）`);
      }
      setBatchInputText('');
    } catch (error) {
      console.error('JSON解析错误:', error);
      message.error('数据格式错误，请检查JSON格式。支持单引号和双引号，以及未引用的属性名');
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
          console.log(`生成文档 ${i + 1}/${batchDataList.length}`);
          const formDataToSend = new FormData();
          formDataToSend.append('data', JSON.stringify(data));
          formDataToSend.append('template', templateFile);
          formDataToSend.append('format', format);
          const response = await fetch('/api/document', { method: 'POST', body: formDataToSend });
          if (!response.ok) throw new Error(`生成文档失败: ${response.statusText}`);
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

          {/* 模板配置 */}
          <Card title="模板配置" className="mb-6">
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
              <div className="flex justify-end">
                <Button type="primary" icon={<SettingOutlined />} onClick={autoConfigureFields} disabled={!cloudTemplateName || isAutoConfiguring} loading={isAutoConfiguring}>
                  {isAutoConfiguring ? '配置中...' : '自动配置'}
                </Button>
              </div>
            </div>
          </Card>

          {/* 生成数量选择器 */}
          {showCountSelector && (
            <Card className="mb-6 border-2 border-blue-400 shadow-lg">
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-800 mb-4">选择需要生成的文档数量</div>
                  <div className="flex items-center justify-center gap-4">
                    <label className="text-sm font-medium text-gray-700">数量：</label>
                    <Select
                      value={templateCount === 0 ? 'custom' : templateCount}
                      onChange={(value) => {
                        if (value === 'custom') {
                          setTemplateCount(0);
                        } else {
                          setTemplateCount(value as number);
                          setCustomCount('');
                        }
                      }}
                      className="w-32"
                      options={[
                        { label: '1 个', value: 1 },
                        { label: '2 个', value: 2 },
                        { label: '3 个', value: 3 },
                        { label: '5 个', value: 5 },
                        { label: '10 个', value: 10 },
                        { label: '20 个', value: 20 },
                        { label: '50 个', value: 50 },
                        { label: '自定义', value: 'custom' },
                      ]}
                    />
                    {templateCount === 0 && (
                      <Input
                        type="number"
                        min={1}
                        max={1000}
                        value={customCount}
                        onChange={(e) => setCustomCount(e.target.value)}
                        placeholder="输入数量"
                        className="w-32"
                      />
                    )}
                  </div>
                </div>
                <div className="flex justify-center gap-3">
                  <Button onClick={() => {
                    setShowCountSelector(false);
                    setTemplateCount(1);
                    setCustomCount('');
                  }}>取消</Button>
                  <Button 
                    type="primary" 
                    onClick={generateTemplates} 
                    loading={isAutoConfiguring}
                    disabled={templateCount === 0 && !customCount}
                  >
                    生成配置模板
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* 数据导入与编辑 */}
          <Card title="数据导入与编辑" className="mb-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium mb-2">使用说明：</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>💡 点击&quot;自动配置&quot;后会自动生成模板并显示在下方</div>
                      <div>💡 在JSON区域编辑数据，填写各字段的值</div>
                      <div>💡 编辑完成后点击&quot;更新数据&quot;应用修改</div>
                      <div>💡 每个 {'{}'} 为一条记录，字段格式：&quot;字段名&quot;: &quot;值&quot;</div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    编辑JSON数据 {batchDataList.length > 0 && <span className="text-blue-600">（当前已有 {batchDataList.length} 条数据）</span>}
                  </label>
                  <Input.TextArea value={batchInputText} onChange={(e) => setBatchInputText(e.target.value)} placeholder={`粘贴或编辑JSON格式的数据，例如：\n{"name": "张三", "age": 25},\n{"name": "李四", "age": 30}`} rows={8} />
                </div>
                <div className="flex gap-2 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">导入模式：</span>
                    <Select
                      value={importMode}
                      onChange={(value) => setImportMode(value)}
                      className="w-32"
                      size="small"
                      options={[
                        { label: '替换数据', value: 'replace' },
                        { label: '追加数据', value: 'append' },
                      ]}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => setBatchInputText('')}>清空编辑区</Button>
                    <Button type="primary" icon={<UploadOutlined />} onClick={parseJsonData}>
                      {importMode === 'replace' ? '更新数据' : '追加数据'}
                    </Button>
                  </div>
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
                <Button type="primary" size="large" icon={<DownloadOutlined />} loading={isGeneratingDocx} onClick={() => generateDocument('docx')}>生成DOCX文档</Button>
                <Button type="primary" size="large" icon={<FilePdfOutlined />} loading={isGeneratingPdf} onClick={() => generateDocument('pdf')} style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}>生成PDF文档</Button>
              </Space>
            </div>
          </Card>

          {previewVisible && <TemplatePreview templateUrl={previewTemplateUrl} templateName={cloudTemplateName} visible={previewVisible} onClose={() => setPreviewVisible(false)} />}
        </Card>
      </div>
    </div>
  );
}
