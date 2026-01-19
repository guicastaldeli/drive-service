import { ApiClientController } from "../main/_api-client/api-client-controller";
import { CacheServiceClient } from "./cache-service-client";

export class CachePreloaderService {
    private apiClientController: ApiClientController;
    private cacheService: CacheServiceClient;
    private isPreloading: boolean = false;
    private preloadedFolders = new Set<string>();
    private preloadQueue: Array<{ userId: string, folderId: string }> = [];

    constructor(apiClientController: ApiClientController, cacheService: CacheServiceClient) {
        this.apiClientController = apiClientController;
        this.cacheService = cacheService;
        this.setupEventListeners();
    }

    private setupEventListeners(): void {
        if(typeof window === 'undefined') return;
        
        window.addEventListener('folder-navigated', ((e: CustomEvent) => {
            this.schedulePreload(e.detail.userId, e.detail.folderId);
        }) as EventListener);
        window.addEventListener('file-uploaded', ((e: CustomEvent) => {
            this.schedulePreload(e.detail.userId, e.detail.parentFolderId);
        }) as EventListener);
        window.addEventListener('user-authenticated', ((e: CustomEvent) => {
            this.startPreloading(e.detail.userId);
        }) as EventListener);
    }

    /*
    ** Start Preload
    */
    public async startPreloading(userId: string): Promise<void> {
        if(this.isPreloading) return;
        this.isPreloading = true;
        try {
            await this.preloadRecentFolders(userId);
            this.processPreloadQueue();
        } catch(err) {
            console.error('Preloading failed!', err);
        } finally {
            this.isPreloading = false;
        }
    }

    /**
     * Preload Recent Folders
     */
    private async preloadRecentFolders(userId: string): Promise<void> {
        try {
            await this.schedulePreload(userId, "root");
        } catch(err) {
            console.error('Failed to get recent folders:', err);
        }
    }

    private async schedulePreload(userId: string, folderId: string): Promise<void> {
        const isFolderCached = await this.cacheService.isFolderCached(userId, folderId);

        const queueItem = { userId, folderId };
        const key = `${userId}_${folderId}`;

        if(isFolderCached || this.preloadedFolders.has(key)) {
            return;    
        }
        this.preloadQueue.push(queueItem);
        this.preloadedFolders.add(key);
    }

    /*
    ** Process Preload Queue
    */
    private async processPreloadQueue(): Promise<void> {
        while(this.preloadQueue.length > 0) {
            const item = this.preloadQueue.shift();
            if(item) {
                try {
                    await this.preloadFolder(item.userId, item.folderId);
                    await new Promise(res => setTimeout(res, 50));
                } catch(err) {
                    console.error(`Failed to preload folder ${item.folderId}:`, err);
                }
            }
        }
        setTimeout(() => this.processPreloadQueue(), 3000);
    }

    /*
    ** Preload Chat
    */
    private async preloadFolder(userId: string, folderId: string): Promise<void> {
        const isFolderCached = await this.cacheService.isFolderCached(userId, folderId);
        if(isFolderCached) return;
        try {
            const fileService = await this.apiClientController.getFileService();
            const res = await fileService.listFiles(userId, folderId);

            const files = res.data?.files || res.files || [];
            const pagination = res.data?.pagination || res.pagination;
            if(files.length >= 0) {
                this.cacheService.initUserCache(userId, folderId, pagination.total);
                this.cacheService.addFilesPage(userId, folderId, files);
                console.log(`Preloaded ${files.length} files for ${folderId}`);
            }
        } catch(err) {
            console.error(`Preload failed for ${folderId}:`, err);
        }
    }

    private preloadAdjacentFolders(userId: string, currentFolderId: string): void {
       if(currentFolderId !== "root") this.schedulePreload(userId, "root");
    }

    public getPreloadedStats(): { 
        preloaded: number; 
        queued: number;
        folders: string[]
    } {
        return {
            preloaded: this.preloadedFolders.size,
            queued: this.preloadQueue.length,
            folders: Array.from(this.preloadedFolders)
        }
    }
}   