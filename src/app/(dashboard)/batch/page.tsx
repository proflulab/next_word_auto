import Link from "next/link";

export default function BatchPage() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">

      {/* 主要内容 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <div className="text-6xl mb-6">⚡</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            批量处理功能
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            此功能正在开发中，敬请期待！
          </p>
          <div className="space-y-4 text-left max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-800">即将推出的功能：</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                Excel/CSV 数据导入
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                批量生成证书文档
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                进度跟踪和状态监控
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                批量下载和打包
              </li>
              <li className="flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                错误处理和重试机制
              </li>
            </ul>
          </div>
          <div className="mt-8">
            <Link
              href="/certificate"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-md transition-colors"
            >
              体验单个证书生成
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}