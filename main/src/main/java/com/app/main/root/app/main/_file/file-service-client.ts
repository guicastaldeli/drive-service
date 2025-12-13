export class FileServiceClient {
    private url: string | undefined;
    
    constructor(url: string | undefined) {
        this.url = url;
    }

    /**
     * Upload File
     */
    public async uploadFile(
        file: File, 
        userId: string, 
        parentFolderId: string = "root"
    ): Promise<any> {
        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch(`${this.url}/api/files/upload/${userId}/${parentFolderId}`, {
                method: 'POST',
                body: formData
            });
            if(!res.ok) {
                throw new Error(`Upload failed!: ${res.statusText}`);
            }
            return await res.json();
        } catch(err) {
            console.log(err);
            throw err;
        }
    }

    /**
     * Download File
     */
    public async downloadFile(fileId: string, userId: string): Promise<any> {
        try {
            const res = await fetch(`${this.url}/api/files/download/${userId}/${fileId}`);
            return res.json();
        } catch(err) {  
            console.error(err);
            throw err;
        }
    }

    /**
     * Delete File
     */
    public async deleteFile(fileId: string, userId: string): Promise<any> {
        try {
            const res = await fetch(`${this.url}/api/files/delete/${userId}/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application-json',
                    'userId': userId
                }
            });
            if(!res.ok) {
                throw new Error(`Failed to delete file: ${res.statusText}`);
            }
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * List Files
     */
    public async listFiles(userId: string, parentFolderId: string): Promise<any> {
        try {
            const params = new URLSearchParams({ userId, parentFolderId });

            const res = await fetch(`${this.url}/api/files/list?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!res.ok) {
                throw new Error(`Failed to list files: ${res.statusText}`);
            }
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Get Storage Usage
     */
    public async getStorageUsage(userId: string): Promise<any> {
        try {
            const res = await fetch(`${this.url}/api/files/storage/${userId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!res.ok) {
                throw new Error(`Failed to get storage usage: ${res.statusText}`);
            }
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Get File Info
     */
    public async getFileInfo(fileId: string, userId: string): Promise<any> {
        try {
            const res = await fetch(`${this.url}/api/files/info/${userId}/${fileId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!res.ok) {
                throw new Error(`Failed top get file info: ${res.statusText}`);
            }
            return await res.json();
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Count Files
     */
    public async countFiles(userId: string, folderId: string = "root"): Promise<any> {
        try {
            const params = new URLSearchParams({ userId, folderId });
            const res = await fetch(`${this.url}/api/files/count?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!res.ok) {
                throw new Error(`Failed to count files: ${res.statusText}`);
            }
            return await res.json(); 
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Count Pages
     */
    public async countPages(userId: string, folderId: string = "root"): Promise<any> {
        try {
            const params = new URLSearchParams({ 
                userId, 
                folderId
            });
            const res = await fetch(`${this.url}/api/files/count-pages?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if(!res.ok) {
                throw new Error(`Failed to count files: ${res.statusText}`);
            }
            const data = await res.json();
            return {
                success: data.success,
                current: data.current || 0,
                total: data.total || 0,
                hasMore: data.hasMore || false,
                pageSize: data.pageSize || 20,
                totalFiles: data.totalFiles || 0
            }; 
        } catch(err) {
            console.error(err);
            throw err;
        }
    }

    /**
     * Get Cache Key
     */
    public async getCacheKey(
        userId: string, 
        folderId: string = "root", 
        page: number
    ): Promise<any> {
        try {
            const params = new URLSearchParams({ 
                userId, 
                folderId, 
                page: page.toString() 
            });

            const res = await fetch(`${this.url}/api/files/cache-key?${params}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to get cache key: ${res.statusText}`);
            }
            return await res.json();
        } catch (err) {
            console.error(err);
            throw err;
        }
    }
}