import { useEffect, useState } from 'react';

interface ErrorLog {
  timestamp: number;
  message: string;
  details?: any;
}

export function ErrorLogger() {
  const [errors, setErrors] = useState<ErrorLog[]>([]);

  useEffect(() => {
    // 捕获全局错误
    const handleError = (event: ErrorEvent) => {
      const newError = {
        timestamp: Date.now(),
        message: event.message,
        details: event.error
      };
      
      setErrors(prev => [...prev, newError]);
      // 阻止错误消失
      event.preventDefault();
    };

    // 捕获未处理的 Promise 错误
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const newError = {
        timestamp: Date.now(),
        message: event.reason?.message || 'Promise 错误',
        details: event.reason
      };
      
      setErrors(prev => [...prev, newError]);
      event.preventDefault();
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (errors.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 max-w-md w-full bg-white shadow-lg rounded-lg p-4 z-50">
      <h3 className="font-bold mb-2">错误日志</h3>
      <div className="max-h-96 overflow-auto">
        {errors.map((error, index) => (
          <div key={error.timestamp} className="mb-2 p-2 bg-red-50 rounded">
            <div className="text-red-600">{error.message}</div>
            <div className="text-xs text-gray-500">
              {new Date(error.timestamp).toLocaleString()}
            </div>
            {error.details && (
              <pre className="text-xs mt-1 overflow-x-auto">
                {JSON.stringify(error.details, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={() => setErrors([])}
        className="mt-2 px-3 py-1 bg-gray-200 rounded text-sm"
      >
        清除日志
      </button>
    </div>
  );
} 