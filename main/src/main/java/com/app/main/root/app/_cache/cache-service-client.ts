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
    public initUserCache(
        userId: string,
        folderId: string,
        totalFilesCount: number
    ): void {
        const time = Date.now();
        const cacheKey = this.getCacheKey(userId, folderId);

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
        this.selectCache(cacheKey);
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
        page: number = 0,
        forceRefresh: boolean = false
    ): Promise<any[]> {
        const cacheKey = this.getCacheKey(userId, folderId);
        this.selectedCache(cacheKey);
        
        const pageKey = this.getPageKey(folderId, page);
        const reqKey = `${cacheKey}_${page}`;

        if(!forceRefresh && this.isPageLoaded(cacheKey, pageKey)) {
            return this.getCachedPage(cacheKey, page);
        }
        if(this.pendingRequests.has(reqKey)) {
            return this.pendingRequests.get(reqKey)!;
        }

        const reqPromise = this.fetchAndCachePage(userId, folderId, page);
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
        file: any,
        page: number = 0
    ): Promise<void> {
        const fileService = await this.apiClientController.getFileService();
        const totalFiles = await fileService.countFiles(userId);

        const cacheKey = this.getCacheKey(userId, folderId);
        const pageKey = this.getPageKey(folderId, page);
        if(!this.cache.has(cacheKey)) this.initUserCache(userId, folderId, totalFiles);

        const data = this.cache.get(cacheKey)!;
        const time = Date.now();
        const fileId = file.file_id || file.id;
        if(fileId && !data.cachedFiles.has(fileId)) {
            data.cachedFiles.set(fileId, file);
            data.loadedPages.add(pageKey);
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
        const fileService = await this.apiClientController.getFileService();
        const page = await fileService.countPages(userId);

        const cacheKey = this.getCacheKey(userId, folderId);
        const pageKey = this.getPageKey(folderId, page);
        if(!this.cache.has(cacheKey)) this.initUserCache(userId, folderId, page.total);

        const data = this.cache.get(cacheKey)!;
        const time = Date.now();

        const startIndex = (page.current - 1) * this.config.pageSize;
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
        data.loadedPages.add(pageKey);
        data.lastAccessTime = time;
        data.lastUpdated = time;
        data.hasMore = page.hasMore || false;
        data.totalFiles = page.total || Math.max(data.totalFiles, data.fileOrder.length);
        data.isFullyLoaded = !data.hasMore;

        this.selectCache(cacheKey);
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

    private isPageLoaded(cacheKey: string, pageKey: string): boolean {
        const data = this.cache.get(cacheKey);
        return !!data && data.loadedPages.has(pageKey);
    }

    public invalidateFolderCache(userId: string, folderId: string): void {
        const cacheKey = this.getCacheKey(userId, folderId);
        this.cache.delete(cacheKey);
    }

    /**
     * Set Api Client
     */
    public setApiClient(apiClientController: ApiClientController): void {
        this.apiClientController = apiClientController;
    }
}