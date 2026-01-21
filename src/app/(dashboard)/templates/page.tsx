/*
 * @Author: 杨仕明 shiming.y@qq.com
 * @Date: 2025-08-16 03:17:12
 * @LastEditors: 杨仕明 shiming.y@qq.com
 * @LastEditTime: 2025-08-20 13:04:15
 * @FilePath: /next_word_auto/src/app/templates/page.tsx
 * @Description: 模板管理页面 - 提供完整的模板增删改查功能
 * 
 * Copyright (c) 2025 by ${git_name_email}, All Rights Reserved. 
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Upload,
  Table,
  Space,
  message,
  Popconfirm,
  Modal,
  Typography,
  Tag,
  Tooltip,
  Empty,
  Spin,
  Progress
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  CloudUploadOutlined,
  FileTextOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { UploadProps, TableColumnsType } from 'antd';
import {
  getCachedFilesMetadata,
  addFileToCache,
  deleteFileFromCache,
  getFileFromCache,
  formatFileSize,
  isLocalCacheSupported
} from '@/utils/localCache';

const { Title, Text } = Typography;
const { Dragger } = Upload;

// 模板文件接口
interface TemplateFile {
  id: string;
  name: string;
  size: number;
  type: 'cloud' | 'local';
  url?: string;
  uploadedAt: string;
  pathname?: string;
}

export default function TemplatesPage() {
  const [cloudTemplates, setCloudTemplates] = useState<TemplateFile[]>([]);
  const [localTemplates, setLocalTemplates] = useState<TemplateFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewName, setPreviewName] = useState('');
  const [activeTab, setActiveTab] = useState<'cloud' | 'local'>('cloud');

  // 加载云端模板
  const loadCloudTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blob?prefix=templates/&limit=100');
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '获取模板列表失败');
      }

      const { blobs } = result.data;
      const templates: TemplateFile[] = blobs.map((blob: { pathname: string; size: number; uploadedAt: string; url: string }) => ({
        id: blob.pathname,
        name: blob.pathname.replace('templates/', ''),
        size: blob.size,
        type: 'cloud',
        url: blob.url,
        uploadedAt: blob.uploadedAt,
        pathname: blob.pathname
      }));

      setCloudTemplates(templates);
    } catch (error) {
      console.error('加载云端模板失败:', error);
      message.error('加载云端模板失败');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载本地缓存模板
  const loadLocalTemplates = useCallback(() => {
    if (!isLocalCacheSupported()) {
      message.warning('当前浏览器不支持本地缓存功能');
      return;
    }

    try {
      const metadata = getCachedFilesMetadata();
      const templates: TemplateFile[] = metadata.map(file => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: 'local',
        uploadedAt: new Date(file.createdAt).toISOString()
      }));

      setLocalTemplates(templates);
    } catch (error) {
      console.error('加载本地模板失败:', error);
      message.error('加载本地模板失败');
    }
  }, []);

  // 初始化加载
  useEffect(() => {
    loadCloudTemplates();
    loadLocalTemplates();
  }, [loadCloudTemplates, loadLocalTemplates]);

  // 上传文件到云端
  const handleCloudUpload = async (file: File) => {
    try {
      setUploading(true);
      const pathname = `templates/${file.name}`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('pathname', pathname);
      formData.append('addRandomSuffix', 'false');
      formData.append('allowOverwrite', 'true');

      const response = await fetch('/api/blob', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '上传失败');
      }

      message.success('模板上传成功');
      loadCloudTemplates();
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 上传文件到本地缓存
  const handleLocalUpload = async (file: File) => {
    try {
      setUploading(true);
      await addFileToCache(file);
      message.success('模板保存到本地缓存成功');
      loadLocalTemplates();
    } catch (error) {
      console.error('保存到本地失败:', error);
      message.error('保存到本地失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  // 删除云端模板
  const handleDeleteCloud = async (template: TemplateFile) => {
    try {
      const response = await fetch(`/api/blob?pathname=${encodeURIComponent(template.pathname!)}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || '删除失败');
      }

      message.success('模板删除成功');
      loadCloudTemplates();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败，请重试');
    }
  };

  // 删除本地模板
  const handleDeleteLocal = async (template: TemplateFile) => {
    try {
      await deleteFileFromCache(template.id);
      message.success('模板删除成功');
      loadLocalTemplates();
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败，请重试');
    }
  };

  // 预览模板
  const handlePreview = (template: TemplateFile) => {
    if (template.type === 'cloud' && template.url) {
      setPreviewUrl(template.url);
      setPreviewName(template.name);
      setPreviewVisible(true);
    } else {
      message.info('本地模板暂不支持在线预览');
    }
  };

  // 下载本地模板
  const handleDownloadLocal = async (template: TemplateFile) => {
    try {
      const file = await getFileFromCache(template.id);
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        message.error('文件不存在');
      }
    } catch (error) {
      console.error('下载失败:', error);
      message.error('下载失败');
    }
  };

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: false,
    accept: '.docx',
    beforeUpload: (file) => {
      const isDocx = file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx');
      if (!isDocx) {
        message.error('只支持上传 .docx 格式的文件');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      if (activeTab === 'cloud') {
        handleCloudUpload(file);
      } else {
        handleLocalUpload(file);
      }

      return false; // 阻止自动上传
    },
    showUploadList: false
  };

  // 表格列配置
  const columns: TableColumnsType<TemplateFile> = [
    {
      title: '模板名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <Space>
          <FileTextOutlined className="text-blue-500" />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: '文件大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
      width: 120
    },
    {
      title: '存储位置',
      dataIndex: 'type',
      key: 'type',
      render: (type: 'cloud' | 'local') => (
        <Tag color={type === 'cloud' ? 'blue' : 'green'}>
          {type === 'cloud' ? '云端存储' : '本地缓存'}
        </Tag>
      ),
      width: 100
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
      width: 180
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="预览">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
              disabled={record.type === 'local'}
            />
          </Tooltip>
          {record.type === 'local' && (
            <Tooltip title="下载">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={() => handleDownloadLocal(record)}
              />
            </Tooltip>
          )}
          <Popconfirm
            title="确定要删除这个模板吗？"
            onConfirm={() => {
              if (record.type === 'cloud') {
                handleDeleteCloud(record);
              } else {
                handleDeleteLocal(record);
              }
            }}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      width: 120
    }
  ];

  const currentTemplates = activeTab === 'cloud' ? cloudTemplates : localTemplates;


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <Title level={2} className="text-center mb-2">
            📁 模板管理系统
          </Title>
          <Text className="block text-center text-gray-600">
            管理您的文档模板，支持云端存储和本地缓存两种模式
          </Text>
        </div>

        <Card className="shadow-lg">
          {/* 标签页切换 */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
              <Button
                type={activeTab === 'cloud' ? 'primary' : 'text'}
                onClick={() => setActiveTab('cloud')}
                icon={<CloudUploadOutlined />}
                className={activeTab === 'cloud' ? '' : 'text-gray-600'}
              >
                云端模板 ({cloudTemplates.length})
              </Button>
              <Button
                type={activeTab === 'local' ? 'primary' : 'text'}
                onClick={() => setActiveTab('local')}
                icon={<FileTextOutlined />}
                className={activeTab === 'local' ? '' : 'text-gray-600'}
              >
                本地缓存 ({localTemplates.length})
              </Button>
            </div>
          </div>

          {/* 上传区域 */}
          <Card
            title={
              <Space>
                <UploadOutlined />
                上传模板到{activeTab === 'cloud' ? '云端存储' : '本地缓存'}
              </Space>
            }
            className="mb-6"
            size="small"
          >
            <Dragger {...uploadProps} className="border-dashed border-2 border-gray-300 hover:border-blue-400">
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined className="text-4xl text-blue-500" />
              </p>
              <p className="ant-upload-text text-lg font-medium">
                点击或拖拽文件到此区域上传
              </p>
              <p className="ant-upload-hint text-gray-500">
                支持 .docx 格式的模板文件，文件大小不超过 10MB
              </p>
              {uploading && (
                <div className="mt-4">
                  <Progress percent={100} status="active" showInfo={false} />
                  <Text className="text-blue-500">正在上传...</Text>
                </div>
              )}
            </Dragger>
          </Card>

          {/* 模板列表 */}
          <Card
            title={
              <Space>
                <FileTextOutlined />
                {activeTab === 'cloud' ? '云端模板列表' : '本地缓存列表'}
                <Button
                  type="text"
                  icon={<ReloadOutlined />}
                  onClick={activeTab === 'cloud' ? loadCloudTemplates : loadLocalTemplates}
                  loading={loading}
                  size="small"
                >
                  刷新
                </Button>
              </Space>
            }
            size="small"
          >
            <Spin spinning={loading}>
              {currentTemplates.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    <span>
                      暂无{activeTab === 'cloud' ? '云端' : '本地'}模板
                      <br />
                      <Text type="secondary">请上传 .docx 格式的模板文件</Text>
                    </span>
                  }
                />
              ) : (
                <Table
                  columns={columns}
                  dataSource={currentTemplates}
                  rowKey="id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 个模板`
                  }}
                  scroll={{ x: 800 }}
                />
              )}
            </Spin>
          </Card>
        </Card>

        {/* 预览模态框 */}
        <Modal
          title={`预览模板: ${previewName}`}
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              关闭
            </Button>
          ]}
          width={800}
        >
          {previewUrl && (
            <div className="text-center">
              <Text type="secondary">模板文件预览</Text>
              <div className="mt-4 p-4 bg-gray-50 rounded">
                <Text>文件 URL: </Text>
                <Text code copyable>{previewUrl}</Text>
              </div>
            </div>
          )}
        </Modal>
      </main>
    </div>
  );
}