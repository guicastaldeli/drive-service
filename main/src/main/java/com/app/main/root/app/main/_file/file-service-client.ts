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
            formData.append('userId', userId);
            formData.append('parentFolderId', parentFolderId);

            const res = await fetch(`${this.url}/api/files/upload`, {
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
            const res = await fetch(`${this.url}/api/files/download/${fileId}`);
            return res.json();
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

            const res = await fetch(`${this.url}/files/list?${params}`, {
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
            const res = await fetch(`${this.url}/api/files/delete/${fileId}`, {
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
}