# 文档自动化平台

一个基于 Next.js 14 构建的现代化文档生成平台，专注于提供一站式文档生成解决方案。支持各种专业文档和证书的自动化生成，包括录取通知书、培训证书、发票等。

## ✨ 核心功能

### 🎯 智能证书生成器

- **动态字段配置**: 支持多种字段类型（文本、邮箱、电话、货币、日期、国家选择等）
- **实时表单验证**: 基于 Zod 的强类型校验，确保数据准确性
- **多格式输出**: 支持 DOCX 和 PDF 两种格式的文档生成
- **模板灵活切换**: 支持本地模板和云端模板（Vercel Blob）两种模式
- **字段自动识别**: 智能解析模板文件中的占位符，自动生成对应的表单字段

### 📁 模板管理系统

- **云端存储**: 基于 Vercel Blob 的模板文件管理
- **模板列表**: 实时获取和展示可用的文档模板
- **模板预览**: 支持模板文件的基本信息查看
- **动态加载**: 根据选择的模板自动调整表单字段

### 🔄 批量处理功能

- **Excel批量导入**: 支持上传Excel文件，自动解析数据
- **横向格式**: 第一行为字段名，每行为一个文档的数据
- **字段自动匹配**: Excel字段名与Word模板占位符自动对应
- **批量生成**: 一次性生成多个文档（支持DOCX和PDF格式）
- **进度跟踪**: 实时显示批量处理进度
- **结果打包**: 自动打包生成的文档为ZIP文件供下载

### 🎨 现代化用户界面

- **响应式设计**: 完美适配桌面端和移动端
- **Ant Design 组件**: 使用专业的 UI 组件库
- **Tailwind CSS**: 现代化的样式系统
- **渐变背景**: 美观的视觉效果和用户体验

## 🚀 技术栈

- **框架**: Next.js 15.4.6 (React 19)
- **UI 组件**: Ant Design 5.27.0
- **样式**: Tailwind CSS 4
- **类型检查**: TypeScript 5
- **数据验证**: Zod 4.0.17
- **文档处理**: docxtemplater 3.51.2
- **Excel处理**: xlsx (SheetJS)
- **云存储**: Vercel Blob
- **文件处理**: JSZip, file-saver

## 📦 快速开始

### 环境要求

- Node.js 18+
- npm/yarn/pnpm/bun

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
# 或
bun install
```

### 启动开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
# 或
bun dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm run start
```

## 📖 使用指南

### 证书生成器使用

#### 使用本地模板

1. 选择「使用本地模板文件」选项
2. 配置字段信息
3. 点击生成文档

#### 使用云端模板

1. 选择「使用云端模板 (Vercel Blob)」选项
2. 在「云端模板名称」输入框中输入模板文件名（如：`template.docx`）
3. 配置字段信息
4. 点击生成文档

### 批量文档生成使用

#### Excel批量导入

1. 选择Word模板
2. 准备Excel文件：
   - 第一行为字段名
   - 从第二行开始，每行为一个文档的数据
3. 上传Excel文件
4. 系统自动解析数据
5. 选择生成DOCX或PDF格式
6. 下载生成的ZIP文件（包含所有文档）

Excel格式示例：
```
| 颁发机构 | 证书编号 | 颁发时间   | 姓名 | 开始时间   | 结束时间   |
|----------|----------|------------|------|------------|------------|
| 1        | 1        | 2025/12/1  | 加   | 2025/12/1  | 2025/12/1  |
| 2        | 12       | 2025/12/1  | 额   | 2025/12/1  | 2025/12/1  |
| 3        | 3        | 2025/12/1  | 发   | 2025/12/1  | 2025/12/1  |
```

详细说明请查看 [Excel批量生成文档功能说明](./doc/README_EXCEL_BATCH.md)

### API 使用

#### 文档生成 API

```javascript
// 使用本地模板生成 DOCX
fetch('/api/document?format=docx&source=local', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});

// 使用云端模板生成 PDF
fetch('/api/document?format=pdf&source=cloud&template=my-template.docx', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

#### 请求参数

- **format**: 输出格式，可选值为 `docx` 或 `pdf`，默认为 `docx`
- **source**: 模板来源，可选值为 `local` 或 `cloud`，默认为 `local`
- **template**: 可选参数，当 source 为 `cloud` 时指定云端模板文件名

## 🏗️ 项目结构

```text
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/             # API 路由
│   │   ├── certificate/     # 证书生成页面
│   │   ├── batch/           # 批量处理页面
│   │   └── templates/       # 模板管理页面
│   ├── components/          # React 组件
│   │   ├── CertificateGenerator.tsx
│   │   ├── HomePage.tsx
│   │   └── Navigation.tsx
│   ├── constants/           # 常量定义
│   └── utils/               # 工具函数
├── public/
│   └── word/                # 本地模板文件
├── doc/                     # 项目文档
│   ├── PROJECT_INTRODUCTION.md
│   ├── README_BLOB_USAGE.md
│   └── README_CERTIFICATE_GENERATOR.md
└── ...
```

## 🔧 配置说明

### 环境变量

创建 `.env.local` 文件并配置以下变量：

```env
# Vercel Blob 配置（可选）
BLOB_READ_WRITE_TOKEN=your_blob_token
```

### 模板文件

- **本地模板**: 放置在 `public/word/` 目录下
- **云端模板**: 上传到 Vercel Blob 存储
- **模板格式**: 支持 `.docx` 格式，使用 `{{字段名}}` 作为占位符

## 🎯 技术创新点

### 混合模板架构

- **双模式支持**: 同时支持本地模板和云端模板，提供灵活的部署选择
- **智能回退机制**: 云端模板获取失败时自动回退到本地模板
- **动态模板解析**: 实时解析模板文件中的占位符，自动生成表单

### 类型安全的数据处理

- **Zod 校验**: 强类型的数据验证，确保数据完整性
- **TypeScript 全覆盖**: 端到端的类型安全保障
- **动态表单生成**: 根据模板字段动态生成验证规则

## 📚 详细文档

- [项目详细介绍](./doc/PROJECT_INTRODUCTION.md)
- [Vercel Blob 使用说明](./doc/README_BLOB_USAGE.md)
- [证书生成器组件说明](./doc/README_CERTIFICATE_GENERATOR.md)
- [Excel批量生成文档功能说明](./doc/README_EXCEL_BATCH.md)

## 🚀 部署

### Vercel 部署

最简单的部署方式是使用 [Vercel 平台](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme)。

查看 [Next.js 部署文档](https://nextjs.org/docs/app/building-your-application/deploying) 了解更多详情。

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 📄 许可证

本项目采用 MIT 许可证。

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Ant Design 文档](https://ant.design/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Vercel Blob 文档](https://vercel.com/docs/storage/vercel-blob)
