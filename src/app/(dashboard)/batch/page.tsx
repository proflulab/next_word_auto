'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message, Popconfirm, Select, Input } from 'antd';
import { CloudOutlined, SettingOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, DeleteOutlined } from '@ant-design/icons';
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
  const [recentlyAddedCount, setRecentlyAddedCount] = useState<number>(0);
  const [fields, setFields] = useState<Array<{ name: string; values: string }>>([]);

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

  const generateTemplates = async () => {
    if (!cloudTemplateName) {
      message.warning('请先选择一个模板');
      return;
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
        
        // 生成字段配置（每个字段一个多行输入框）
        const fieldConfigs = result.fields.map((fieldName: string) => ({
          name: fieldName,
          values: ''
        }));
        
        setFields(fieldConfigs);
        setBatchDataList([]);
        setRecentlyAddedCount(0);
        
        hideLoading();
        message.success({ content: `🎉 成功识别 ${result.fields.length} 个字段！请在下方为每个字段输入多条值（每行一个值）`, duration: 5 });
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

  const generateDataFromFields = () => {
    if (fields.length === 0) {
      message.warning('请先生成字段配置');
      return;
    }

    // 解析每个字段的值（按行分割）
    const fieldValueArrays: Record<string, string[]> = {};
    let maxLength = 0;

    fields.forEach(field => {
      const values = field.values
        .split('\n')
        .map(v => v.trim())
        .filter(v => v !== '');
      fieldValueArrays[field.name] = values;
      maxLength = Math.max(maxLength, values.length);
    });

    if (maxLength === 0) {
      message.warning('请至少为一个字段输入值');
      return;
    }

    // 生成数据列表
    const newDataList: Array<Record<string, string | number | boolean | null | undefined>> = [];
    for (let i = 0; i < maxLength; i++) {
      const record: Record<string, string | number | boolean | null | undefined> = {};
      fields.forEach(field => {
        const values = fieldValueArrays[field.name];
        // 如果某个字段的值不够，使用最后一个值或空字符串
        record[field.name] = values[i] || values[values.length - 1] || '';
      });
      newDataList.push(record);
    }

    setBatchDataList(newDataList);
    setRecentlyAddedCount(newDataList.length);
    message.success(`成功生成 ${newDataList.length} 条数据`);
  };

  const updateFieldValues = (fieldName: string, values: string) => {
    setFields(fields.map(f => f.name === fieldName ? { ...f, values } : f));
    setRecentlyAddedCount(0);
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

          {/* 模板配置与生成 */}
          <Card title="模板配置与生成" className="mb-6">
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
              
              {/* 生成数量选择 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-gray-800">生成字段配置</div>
                  <div className="flex items-center gap-4">
                    <Button 
                      type="primary" 
                      icon={<SettingOutlined />}
                      onClick={generateTemplates} 
                      loading={isAutoConfiguring}
                      disabled={!cloudTemplateName}
                    >
                      {isAutoConfiguring ? '生成中...' : '自动配置字段'}
                    </Button>
                  </div>
                  {recentlyAddedCount > 0 && (
                    <div className="text-xs text-green-600 font-medium">
                      ✅ 已生成 {recentlyAddedCount} 条数据
                    </div>
                  )}
                  {!cloudTemplateName && (
                    <div className="text-xs text-orange-600">
                      💡 请先选择一个模板
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* 字段配置区域 */}
          {fields.length > 0 && (
            <Card title="字段配置" className="mb-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium mb-2">使用说明：</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>💡 为每个字段输入多条值，每行一个值</div>
                      <div>💡 系统会自动组合生成多条数据记录</div>
                      <div>💡 如果某个字段值较少，会自动重复使用最后一个值</div>
                      <div>💡 编辑完成后点击"生成数据"按钮</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {field.name}
                        <span className="text-xs text-gray-500 ml-2">
                          ({field.values.split('\n').filter(v => v.trim()).length} 个值)
                        </span>
                      </label>
                      <Input.TextArea
                        value={field.values}
                        onChange={(e) => updateFieldValues(field.name, e.target.value)}
                        placeholder={`输入${field.name}的值\n每行一个值\n例如：\n张三\n李四\n王五`}
                        rows={6}
                        className="font-mono text-sm"
                      />
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button onClick={() => {
                    setFields([]);
                    setBatchDataList([]);
                    setRecentlyAddedCount(0);
                  }}>
                    清空字段
                  </Button>
                  <Button type="primary" icon={<SettingOutlined />} onClick={generateDataFromFields}>
                    生成数据
                  </Button>
                </div>
              </div>
            </Card>
          )}

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
