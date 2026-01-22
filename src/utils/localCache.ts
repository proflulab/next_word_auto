/**
 * 本地浏览器缓存文件管理工具
 * 支持文件的增删改查操作，使用 IndexedDB 存储大文件，localStorage 存储元数据
 */

// 缓存文件的元数据接口
export interface CachedFile {
    id: string;
    name: string;
    size: number;
    type: string;
    lastModified: number;
    createdAt: number;
    publicName?: string; // 云端公网文件名（Blob 路径）
}

// IndexedDB 数据库配置
const DB_NAME = 'LocalFileCache';
const DB_VERSION = 1;
const STORE_NAME = 'files';
const METADATA_KEY = 'cached_files_metadata';

/**
 * 初始化 IndexedDB 数据库
 */
function initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * 获取缓存文件的元数据列表
 */
export function getCachedFilesMetadata(): CachedFile[] {
    try {
        const metadata = localStorage.getItem(METADATA_KEY);
        return metadata ? JSON.parse(metadata) : [];
    } catch (error) {
        console.error('获取缓存文件元数据失败:', error);
        return [];
    }
}

/**
 * 更新缓存文件的元数据
 */
function updateCachedFilesMetadata(files: CachedFile[]): void {
    try {
        localStorage.setItem(METADATA_KEY, JSON.stringify(files));
    } catch (error) {
        console.error('更新缓存文件元数据失败:', error);
        throw new Error('存储空间不足或其他存储错误');
    }
}

/**
 * 生成唯一的文件ID
 */
function generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 添加文件到本地缓存
 */
export async function addFileToCache(file: File): Promise<string> {
    try {
        const db = await initDB();
        const fileId = generateFileId();

        // 创建文件元数据
        const metadata: CachedFile = {
            id: fileId,
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
            createdAt: Date.now()
        };

        // 将文件内容转换为 ArrayBuffer
        const arrayBuffer = await file.arrayBuffer();

        // 存储到 IndexedDB
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await new Promise<void>((resolve, reject) => {
            const request = store.add({
                id: fileId,
                data: arrayBuffer,
                metadata
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 更新元数据到 localStorage
        const currentMetadata = getCachedFilesMetadata();
        currentMetadata.push(metadata);
        updateCachedFilesMetadata(currentMetadata);

        return fileId;
    } catch (error) {
        console.error('添加文件到缓存失败:', error);
        throw new Error('添加文件到缓存失败');
    }
}

/**
 * 从本地缓存获取文件
 */
export async function getFileFromCache(fileId: string): Promise<File | null> {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        const result = await new Promise<{ data: ArrayBuffer; metadata: CachedFile } | undefined>((resolve, reject) => {
            const request = store.get(fileId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        if (!result) {
            return null;
        }

        // 从 ArrayBuffer 重建 File 对象
        const { data, metadata } = result;
        const blob = new Blob([data], { type: metadata.type });
        const file = new File([blob], metadata.name, {
            type: metadata.type,
            lastModified: metadata.lastModified
        });

        return file;
    } catch (error) {
        console.error('从缓存获取文件失败:', error);
        return null;
    }
}

/**
 * 更新缓存中的文件
 */
export async function updateFileInCache(fileId: string, newFile: File): Promise<boolean> {
    try {
        const db = await initDB();

        // 更新文件元数据
        const currentMetadata = getCachedFilesMetadata();
        const fileIndex = currentMetadata.findIndex(f => f.id === fileId);

        if (fileIndex === -1) {
            throw new Error('文件不存在');
        }

        const updatedMetadata: CachedFile = {
            ...currentMetadata[fileIndex],
            name: newFile.name,
            size: newFile.size,
            type: newFile.type,
            lastModified: newFile.lastModified
        };

        // 将新文件内容转换为 ArrayBuffer
        const arrayBuffer = await newFile.arrayBuffer();

        // 更新 IndexedDB 中的文件
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await new Promise<void>((resolve, reject) => {
            const request = store.put({
                id: fileId,
                data: arrayBuffer,
                metadata: updatedMetadata
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 更新元数据
        currentMetadata[fileIndex] = updatedMetadata;
        updateCachedFilesMetadata(currentMetadata);

        return true;
    } catch (error) {
        console.error('更新缓存文件失败:', error);
        return false;
    }
}

/**
 * 从本地缓存删除文件
 */
export async function deleteFileFromCache(fileId: string): Promise<boolean> {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // 从 IndexedDB 删除文件
        await new Promise<void>((resolve, reject) => {
            const request = store.delete(fileId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 从元数据中删除
        const currentMetadata = getCachedFilesMetadata();
        const filteredMetadata = currentMetadata.filter(f => f.id !== fileId);
        updateCachedFilesMetadata(filteredMetadata);

        return true;
    } catch (error) {
        console.error('删除缓存文件失败:', error);
        return false;
    }
}

/**
 * 清空所有缓存文件
 */
export async function clearAllCachedFiles(): Promise<boolean> {
    try {
        const db = await initDB();
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // 清空 IndexedDB
        await new Promise<void>((resolve, reject) => {
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 清空元数据
        localStorage.removeItem(METADATA_KEY);

        return true;
    } catch (error) {
        console.error('清空缓存文件失败:', error);
        return false;
    }
}

/**
 * 获取缓存使用情况统计
 */
export function getCacheStats(): { totalFiles: number; totalSize: number } {
    const metadata = getCachedFilesMetadata();
    return {
        totalFiles: metadata.length,
        totalSize: metadata.reduce((total, file) => total + file.size, 0)
    };
}

/**
 * 检查浏览器是否支持所需的存储API
 */
export function isLocalCacheSupported(): boolean {
    return (
        typeof Storage !== 'undefined' &&
        typeof indexedDB !== 'undefined'
    );
}

/**
 * 格式化文件大小显示
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}