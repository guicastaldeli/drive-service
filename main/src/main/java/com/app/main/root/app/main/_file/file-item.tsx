type FileType =
    'image' |
    'video' |
    'document' |
    'other';

export interface Item {
    fileId: string;
    originalFileName: string;
    fileSize: number;
    mimeType: string;
    fileType: FileType;
    parentFolderId: string;
    uploadedAt: string;
    lastModified: string;
    isDeleted?: boolean; 
}

export interface Response {
    success: boolean;
    data: Item[];
    total?: number;
    page?: number;
    pageSize?: number;
}

