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
            const res = await fetch(`${this.url}/api/files/upload`);
            return res.json();
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
}