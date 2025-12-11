export class FileServiceClient {
    private url: string | undefined;
    
    constructor(url: string | undefined) {
        this.url = "http://localhost:3001/main";
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
            console.log('Uploading file:', file.name, file.size, file.type);
            console.log('User ID:', userId);
            console.log('Parent Folder ID:', parentFolderId);

            // Validate file
            if (!file || file.size === 0) {
                throw new Error('Invalid file: file is empty or undefined');
            }

            const formData = new FormData();
            formData.append('file', file);
            formData.append('userId', userId);
            formData.append('parentFolderId', parentFolderId);

            // Debug FormData contents
            console.log('FormData entries:');
            for (const [key, value] of formData.entries()) {
                console.log(`${key}:`, value);
            }

            const res = await fetch(`${this.url}/api/files/upload`, {
                method: 'POST',
                body: formData
                // Don't set Content-Type header - let browser set it automatically for FormData
            });
            
            if(!res.ok) {
                const errorText = await res.text();
                console.error('Server response error:', res.status, errorText);
                throw new Error(`Upload failed! Status: ${res.status} - ${errorText}`);
            }
            
            const result = await res.json();
            console.log('Upload successful:', result);
            return result;
        } catch(err) {
            console.error('Upload error details:', err);
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