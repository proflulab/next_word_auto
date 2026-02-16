'use client';

import React, { useState, useCallback } from 'react';
import { Button, Card, Space, Typography, message, Popconfirm, Select, Input, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined, CloudOutlined, SettingOutlined, EyeOutlined, DownloadOutlined, FilePdfOutlined, UploadOutlined } from '@ant-design/icons';
import TemplatePreview from '@/components/preview/TemplatePreview';
import { FIELD_TYPES, DEFAULT_FIELDS } from '@/constants/fields';
import { CURRENCY_OPTIONS } from '@/constants/currencies';
import { FieldConfig, CloudTemplate } from '@/types';
import { inferFieldType } from '@/utils/fieldTypeInference';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

const { Title } = Typography;

export default function BatchPage() {
  const [fields, setFields] = useState<FieldConfig[]>(DEFAULT_FIELDS);
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

  const addField = () => {
    const newField: FieldConfig = {
      id: Date.now().toString(),
      name: `field_${Date.now()}`,
      type: 'text',
      value: '',
      required: false,
      format: {},
    };
    setFields([...fields, newField]);
  };

  const deleteField = (id: string) => {
    setFields(fields.filter(field => field.id !== id));
  };

  const updateField = (id: string, updates: Partial<FieldConfig>) => {
    setFields(fields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    ));
  };

  const autoConfigureFields = async () => {
    if (!cloudTemplateName) {
      message.warning('请先选择一个模板');
      return;
    }
    setIsAutoConfiguring(true);
    const hideLoading = message.loading('正在分析模板字段...', 0);
    try {
      const selectedTemplate = cloudTemplates.find((t: CloudTemplate) => t.name === cloudTemplateName);
      if (!selectedTemplate) throw new Error('指定的模板文件不存在');
      const templateResponse = await fetch(selectedTemplate.url);
      const templateBlob = await templateResponse.blob();
      const formData = new FormData();
      formData.append('template', templateBlob, cloudTemplateName);
      const response = await fetch('/api/template-fields', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success && result.fields) {
        const autoFields: FieldConfig[] = result.fields.map((fieldName: string, index: number) => ({
          id: `auto_${Date.now()}_${index}`,
          name: fieldName,
          type: inferFieldType(fieldName),
          value: '',
          required: false,
          format: {},
        }));
        setFields(autoFields);
        hideLoading();
        message.success({ content: `🎉 成功自动配置 ${result.fields.length} 个字段！`, duration: 3 });
      } else {
        hideLoading();
        message.error({ content: result.message || '❌ 获取模板字段失败，请检查模板格式', duration: 4 });
      }
    } catch (error) {
      console.error('自动配置字段失败:', error);
      hideLoading();
      message.error({ content: '❌ 自动配置字段失败，请检查网络连接后重试', duration: 4 });
    } finally {
      setIsAutoConfiguring(false);
    }
  };

  const renderFormatConfig = (field: FieldConfig) => {
    switch (field.type) {
      case 'currency':
        return (
          <div className="flex gap-2">
            <Select value={field.format?.currencySymbol || 'CNY'} onChange={(value) => updateField(field.id, { format: { ...field.format, currencySymbol: value } })} size="small" className="w-20" options={CURRENCY_OPTIONS} />
            <Select value={field.format?.decimalPlaces ?? 2} onChange={(value) => updateField(field.id, { format: { ...field.format, decimalPlaces: value } })} size="small" className="w-20" options={[{ label: '0位', value: 0 }, { label: '1位', value: 1 }, { label: '2位', value: 2 }, { label: '3位', value: 3 }]} />
          </div>
        );
      case 'date':
        return (
          <Select value={field.format?.dateFormat || 'YYYY-MM-DD'} onChange={(value) => updateField(field.id, { format: { ...field.format, dateFormat: value } })} size="small" className="w-full" options={[{ label: '2024-01-01', value: 'YYYY-MM-DD' }, { label: '2024/01/01', value: 'YYYY/MM/DD' }, { label: '01/01/2024', value: 'MM/DD/YYYY' }, { label: '2024年1月1日', value: 'YYYY年M月D日' }]} />
        );
      case 'number':
        return (
          <Select value={field.format?.numberFormat || 'normal'} onChange={(value) => updateField(field.id, { format: { ...field.format, numberFormat: value } })} size="small" className="w-full" options={[{ label: '普通数字', value: 'normal' }, { label: '千分位', value: 'thousand' }, { label: '百分比', value: 'percent' }]} />
        );
      default:
        return <span className="text-xs text-gray-400">无格式选项</span>;
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
      setBatchDataList([...batchDataList, ...newBatchData]);
      setBatchInputText('');
      message.success(`成功添加 ${newBatchData.length} 条数据`);
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
            </div>
          </Card>

          {/* 字段配置 */}
          <Card title={(<div className="flex items-center justify-between"><span>字段配置</span><Space><Button type="primary" size="small" icon={<SettingOutlined />} onClick={autoConfigureFields} disabled={!cloudTemplateName || isAutoConfiguring} loading={isAutoConfiguring}>{isAutoConfiguring ? '配置中...' : '自动配置'}</Button><Popconfirm title="确定要删除所有字段吗？" description="此操作不可撤销，将清空所有字段配置。" onConfirm={() => setFields([])} okText="确定" cancelText="取消" disabled={fields.length === 0}><Button danger size="small" icon={<DeleteOutlined />} disabled={fields.length === 0}>清空所有</Button></Popconfirm></Space></div>)} className="mb-6">
            <div className="space-y-3">
              {fields.length > 0 && (
                <div className="hidden lg:block">
                  <div className="grid grid-cols-12 gap-3 px-4 py-2 bg-gray-50 rounded-lg text-xs font-medium text-gray-600">
                    <div className="col-span-2">字段名称</div>
                    <div className="col-span-2">字段类型</div>
                    <div className="col-span-2">格式</div>
                    <div className="col-span-1">必填</div>
                    <div className="col-span-4">操作</div>
                  </div>
                </div>
              )}
              {fields.map((field) => (
                <div key={field.id} className="grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-12 lg:col-span-2"><Input value={field.name} onChange={(e) => updateField(field.id, { name: e.target.value })} placeholder="字段名称" size="small" /></div>
                  <div className="col-span-12 lg:col-span-2"><Select value={field.type} onChange={(value) => updateField(field.id, { type: value })} className="w-full" size="small" options={FIELD_TYPES} /></div>
                  <div className="col-span-12 lg:col-span-2">{renderFormatConfig(field)}</div>
                  <div className="col-span-12 lg:col-span-1"><Checkbox checked={field.required} onChange={(e) => updateField(field.id, { required: e.target.checked })} /></div>
                  <div className="col-span-12 lg:col-span-4"><Space><Popconfirm title="确定要删除此字段吗？" onConfirm={() => deleteField(field.id)} okText="确定" cancelText="取消"><Button danger size="small" icon={<DeleteOutlined />} type="text" /></Popconfirm></Space></div>
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={addField} className="mt-4">添加字段</Button>
            </div>
          </Card>

          {/* 数据导入 */}
          {fields.length > 0 && (
            <Card title="数据导入" className="mb-6">
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="text-sm text-gray-700">
                    <div className="font-medium mb-2">导入格式说明：</div>
                    <div className="text-xs text-gray-600 space-y-1">
                      <div>💡 每个 {'{}'} 中间为一条数据记录</div>
                      <div>💡 每个字段用 &quot;字段名&quot;: &quot;值&quot; 的格式表示</div>
                      <div>💡 多条数据用逗号分隔或用 {'[]'} 包装</div>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">粘贴JSON数据</label>
                  <Input.TextArea value={batchInputText} onChange={(e) => setBatchInputText(e.target.value)} placeholder={`粘贴JSON格式的数据，例如：\n{"name": "张三", "age": 25},\n{"name": "李四", "age": 30}`} rows={8} />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button onClick={() => setBatchInputText('')}>清空</Button>
                  <Button type="primary" icon={<UploadOutlined />} onClick={parseJsonData}>导入数据</Button>
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
