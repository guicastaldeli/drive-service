import { ApiClientController } from "../main/_api-client/api-client-controller";

export interface CacheConfig {
    pageSize: number;
    maxPages: number;
    preloadPages: number;
    cleanupThreshold: number;
}

export interface UserCacheData {
    loadedPages: Set<string>;
    lastAccessTime: number;
    hasMore: boolean;
    isFullyLoaded: boolean;
    lastUpdated: number;
    totalFiles: number;
    cachedFiles: Map<string, any>;
    fileOrder: string[]
}

export class CacheServiceClient {
    private static instance: CacheServiceClient;
    private apiClientController!: ApiClientController;
    private cache: Map<string, UserCacheData> = new Map();
    private accessQueue: string[] = [];
    private pendingRequests: Map<string, Promise<any>> = new Map();
    private evictionListeners: ((cacheKey: string) => void)[] = [];
    private config: CacheConfig = {
        pageSize: 20,
        maxPages: 100,
        preloadPages: 2,
        cleanupThreshold: 0.8
    }

    public static getInstance(): CacheServiceClient {
        if(!CacheServiceClient.instance) {
            CacheServiceClient.instance = new CacheServiceClient();
        }
        return CacheServiceClient.instance;
    }

    /**
     * Init User Cache
     */
    public async initUserCache(
        userId: string,
        folderId: string,
        totalFilesCount: number
    ): Promise<void> {
        const time = Date.now();
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);

        if(!this.cache.has(cacheKey)) {
            this.cache.set(cacheKey, {
                loadedPages: new Set(),
                lastAccessTime: time,
                hasMore: totalFilesCount > this.config.pageSize,
                isFullyLoaded: false,
                lastUpdated: time,
                totalFiles: totalFilesCount,
                cachedFiles: new Map(),
                fileOrder: []
            });
        }
        this.selectedCache(cacheKey);
    }

    /**
     * Init Cache
     */
    public async initCache(userId: string, folderId: string): Promise<void> {
        if(!userId) {
            throw new Error('NO user id!');
        }

        try {
            this.initUserCache(userId, folderId, 0);
            console.log(`Cache initialized for user: ${userId}`)    
        } catch(err) {
            console.log('Cache initialization failed: ', err);
            throw err;
        }
    }

    /**
     * Get Files
     */
    public async getFiles(
        userId: string,
        folderId: string = "root",
        page: any,
        forceRefresh: boolean = false
    ): Promise<any[]> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);

        this.selectedCache(cacheKey);
        const reqKey = `${cacheKey}_${page}`;

        if(!forceRefresh && this.isPageLoaded(cacheKey)) {
            return this.getCachedPage(cacheKey, page.data);
        }
        if(this.pendingRequests.has(reqKey)) {
            return this.pendingRequests.get(reqKey)!;
        }

        const reqPromise = this.fetchAndCachePage(userId, folderId, page.data);
        this.pendingRequests.set(reqKey, reqPromise);
        try {
            const files = await reqPromise;
            return files;
        } finally {
            this.pendingRequests.delete(reqKey);
        }
    }

    /**
     * Fetch and Cache Page
     */
    private async fetchAndCachePage(
        userId: string,
        folderId: string,
        page: number
    ): Promise<any[]> {
        try {
            if(!this.apiClientController) {
                throw new Error("api client err");
            }

            const fileService = await this.apiClientController.getFileService();
            const res = await fileService.listFiles(userId, folderId);

            const files = res.data?.files || res.files || [];
            this.addFilesPage(
                userId,
                folderId,
                files
            );
            return files;
        } catch(err) {
            console.error(`Failed to fetch page ${page} for folder ${folderId}:`, err);
            throw err;
        }
    }

    /**
     * Add Files
     */
    public async addFile(
        userId: string,
        folderId: string,
        file: any
    ): Promise<void> {
        const fileService = await this.apiClientController.getFileService();
        const totalFiles = await fileService.countFiles(userId);

        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);
        if(!this.cache.has(cacheKey)) this.initUserCache(userId, folderId, totalFiles);

        const data = this.cache.get(cacheKey)!;
        const time = Date.now();
        const fileId = file.file_id || file.id;
        if(fileId && !data.cachedFiles.has(fileId)) {
            data.cachedFiles.set(fileId, file);
            data.loadedPages.add(cacheKey);
            data.lastAccessTime = time;
            data.lastUpdated = time;
            data.totalFiles += 1;
            data.isFullyLoaded = false;
        }

        this.selectedCache(cacheKey);
    }

    public async addFilesPage(
        userId: string,
        folderId: string,
        files: any[]
    ): Promise<void> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);
        if(!this.cache.has(cacheKey)) this.initUserCache(userId, folderId, pageKey.total);

        const data = this.cache.get(cacheKey)!;
        const time = Date.now();

        const startIndex = (pageKey.current - 1) * this.config.pageSize;
        files.forEach((f, i) => {
            const fileId = f.file_id || f.id;
            if(fileId && !data.cachedFiles.has(fileId)) {
                data.cachedFiles.set(fileId, f);
                const insertIndex = startIndex + i;

                while(data.fileOrder.length < insertIndex) {
                    data.fileOrder.push('');
                }
                if(insertIndex >= data.fileOrder.length) {
                    data.fileOrder.push(fileId)
                } else {
                    data.fileOrder[insertIndex] = fileId;
                }
            }
        });

        data.fileOrder = data.fileOrder.filter(id => id && id !== '');
        data.loadedPages.add(cacheKey);
        data.lastAccessTime = time;
        data.lastUpdated = time;
        data.hasMore = pageKey.hasMore || false;
        data.totalFiles = pageKey.total || Math.max(data.totalFiles, data.fileOrder.length);
        data.isFullyLoaded = !data.hasMore;

        this.selectedCache(cacheKey);
    }

    /**
     * Get Cached Page
     */
    private getCachedPage(cacheKey: string, page: number): any[] {
        const data = this.cache.get(cacheKey);
        if(!data) return [];

        const startIndex = (page - 1) * this.config.pageSize;
        const endIndex = Math.min(startIndex + this.config.pageSize, data.fileOrder.length);

        const res: any[] = [];
        for(let i = startIndex; i < endIndex; i++) {
            const fileId = data.fileOrder[i];
            const file = data.cachedFiles.get(fileId);
            if(file) res.push(file);
        }
        return res;
    }

    private isPageLoaded(cacheKey: string): boolean {
        const data = this.cache.get(cacheKey);
        return !!data;
    }

    public async invalidateFolderCache(userId: string, folderId: string): Promise<void> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);

        this.cache.delete(cacheKey);
        this.accessQueue = this.accessQueue.filter(k => k !== cacheKey);
        this.evictionListeners.forEach(l => l(cacheKey));
        console.log(`Cache invalidated for folder ${folderId} (user: ${userId})`)
    }

    public invalidUserCache(userId: string): void {
        const userKeys = Array.from(this.cache.keys())
            .filter(k => k.startsWith(`${userId}`));
        userKeys.forEach(key => {
            this.cache.delete(key);
            this.accessQueue = this.accessQueue.filter(k => k !== key);
            this.evictionListeners.forEach(l => l(key));
        });
        console.log(`Cache invalidated for user ${userId}`);
    }

    /**
     * Get Files in Range
     */
    public async getFilesInRange(
        userId: string,
        folderId: string,
        start: number,
        end: number
    ): Promise<any[]> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);

        const data = this.cache.get(cacheKey);
        if(!data) return [];

        const result: any[] = [];
        const endIndex = Math.min(end, data.fileOrder.length - 1);
        
        for(let i = start; i <= endIndex; i++) {
            const fileId = data.fileOrder[i];
            const file = data.cachedFiles.get(fileId);
            if(file) {
                result.push({ 
                    ...file, 
                    virtualIndex: i 
                });
            }
        }
        
        return result.sort((a, b) => {
            const timeA = a.uploaded_at || a.last_modified || 0;
            const timeB = b.uploaded_at || b.last_modified || 0;
            return new Date(timeB).getTime() - new Date(timeA).getTime();
        });
    }

    public async isFolderCached(userId: string, folderId: string): Promise<boolean> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);
        return this.cache.has(cacheKey);
    }

    /**
     * Has More
     */
    public async hasMoreFiles(userId: string, folderId: string): Promise<boolean> {
        const fileService = await this.apiClientController.getFileService();
        const page = await fileService.countPages(userId, folderId);
        const cacheKey = await fileService.getCacheKey(userId, folderId, page.current);

        const data = this.cache.get(cacheKey);
        if(!data) return true;
        return data.hasMore;
    }

    /**
     * Get Total Files
     */
    public async getTotalFiles(userId: string, folderId: string): Promise<number> {
        const pageKey = await this.getPage(userId, folderId)
        const cacheKey = await this.getCacheKey(userId, folderId, pageKey);

        const data = this.cache.get(cacheKey);
        return data ? data.totalFiles : 0;
    }

    private selectedCache(cacheKey: string): void {
        this.accessQueue = this.accessQueue.filter(k => k !== cacheKey);
        this.accessQueue.push(cacheKey);
    }

    public addEvictionListener(listener: (cacheKey: string) => void): void {
        this.evictionListeners.push(listener);
    }

    public removeEvictionListener(listener: (cacheKey: string) => void): void {
        this.evictionListeners = this.evictionListeners.filter(l => l !== listener);
    }

    public getCachedFolders(userId: string): string[] {
        return Array.from(this.cache.keys())
            .filter(key => key.startsWith(`${userId}_`))
            .map(key => key.split('_')[1]);
    }

    public async preloadFolderData(userId: string, folderId: string): Promise<void> {
        try {
            const pageKey = await this.getPage(userId, folderId)
            const cacheKey = await this.getCacheKey(userId, folderId, pageKey);
            await this.getFiles(userId, folderId, pageKey);
            
            const data = this.cache.get(cacheKey);
            if(data && data.hasMore && this.config.preloadPages > 1) {
                for(let i = 2; i <= this.config.preloadPages; i++) {
                    const pageCacheKey = await this.getCacheKey(userId, folderId, i);
                    if(!data.loadedPages.has(pageCacheKey)) {
                        await this.getFiles(userId, folderId, i);
                        break;
                    }
                }
            }
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    private async getCacheKey(userId: string, folderId: string, page: any): Promise<string> {
        const fileService = await this.apiClientController.getFileService();
        const cacheKey = await fileService.getCacheKey(userId, folderId, page.current);
        return cacheKey;
    }

    private async getPage(userId: string, folderId: string): Promise<{
        data: number,
        current: number, 
        total: number, 
        hasMore: boolean
    }> {
        const fileService = await this.apiClientController.getFileService();
        const page = await fileService.countPages(userId, folderId);
        return {
            data: page,
            current: page.current || 0,
            total: page.total || 0,
            hasMore: page.hasMore || false
        };
    }
    
    public clear(): void {
        this.cache.clear();
        this.accessQueue = [];
        this.pendingRequests.clear();
        console.log('Cache cleared');
    }
    
    /**
     * Set Api Client
     */
    public setApiClient(apiClientController: ApiClientController): void {
        this.apiClientController = apiClientController;
    }
}