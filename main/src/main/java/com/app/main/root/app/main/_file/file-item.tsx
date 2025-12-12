import { Component } from "react";
import { ApiClientController } from "../_api-client/api-client-controller";

type FileType =
    'image' |
    'video' |
    'document' |
    'other';

type SortType =
    'name' | 
    'date' | 
    'size' | 
    'type';

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

interface Props {
    apiClientController: ApiClientController;
    userId: string;
    parentFolderId?: string;
    onFileSelect?: (file: Item) => void;
    onFileDelete?: (fileId: string) => void;
    onRefresh?: () => void;
}

interface State {
    files: Item[];
    isLoading: boolean;
    error: string | null;
    currentPage: number;
    totalFiles: number;
    selectedFiles: Set<string>
    viewMode: 'grid' | 'list';
    sortBy: SortType;
    sortOrder: 'asc' | 'desc';
}

export class FileItem extends Component<Props, State> {
    private apiClientController: ApiClientController;
    
    constructor(props: Props) {
        super(props);
        this.state = {
            files: [],
            isLoading: false,
            error: null,
            currentPage: 0,
            totalFiles: 0,
            selectedFiles: new Set(),
            viewMode: 'grid',
            sortBy: 'date',
            sortOrder: 'desc'
        }
        this.apiClientController = this.props.apiClientController;
    }

    async componentDidMount() {
        await this.loadFiles();
    }

    async componentDidUpdate(prevProps: Props): Promise<void> {
        if(prevProps.parentFolderId !== this.props.parentFolderId ||
            prevProps.userId !== this.props.userId
        ) {
            await this.loadFiles();
        }
    }

    /**
     * Load Files
     */
    private async loadFiles() {
        this.setState({ isLoading: false, error: null });
        try {
            const fileService = await this.apiClientController.getFileService();
            const res = await fileService.listFiles(
                this.props.userId,
                this.props.parentFolderId || 'root',
            );

            if(res.success) {
                const files = this.sortFiles(res.data);
                this.setState({
                    files,
                    isLoading: false,
                    totalFiles: res.total || files.length
                });
            } else {
                throw new Error(res.error || 'Failed to load files!');
            } 
        } catch(err: any) {
            this.setState({
                error: err.message,
                isLoading: false
            });
            console.error('Error loading files', err);
        }
    }

    private sortFiles(files: Item[]): Item[] {
        return [...files].sort((a, b) => {
            let comparison = 0;
            switch(this.state.sortBy) {
                case 'name':
                    comparison = a.originalFileName.localeCompare(b.originalFileName);
                    break;
                case 'date':
                    comparison = 
                        new Date(a.uploadedAt).getTime() - 
                        new Date(b.uploadedAt).getTime();
                    break;
                case 'size':
                    comparison = a.fileSize - b.fileSize;
                    break;
                case 'type':
                    comparison = a.fileType.localeCompare(b.fileType);
                    break;
            }

            return this.state.sortOrder === 'asc' ? comparison : -comparison;
        });
    }

    /**
     * 
     * Format
     * 
     */
    private formatFileSize(bytes: number): string {
        if(bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    private formatDate(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    private getFileIcon(fileType: string, mimeType: string): string {
        switch(fileType) {
            case 'image':
                return 'IMG';
            case 'video':
                return 'VID';
            case 'audio':
                return 'AUD';
            case 'document':
                if(mimeType.includes('pdf')) return 'PDF';
                if(mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
                return 'DOC';
            default:
                return 'DOC';
        }
    }

    /**
     * Handle File Select
     */
    private handleFileSelect(file: Item): void {
        if(this.props.onFileSelect) {
            this.props.onFileSelect(file);
        }
    }

    /**
     * Handle File Delete
     */
    private async handleFileDelete(fileId: string, e: React.MouseEvent): Promise<void> {
        e.stopPropagation();
        if(!confirm('Delete??')) return;

        try {
            const fileService = await this.apiClientController.getFileService();
            const res = await fileService.deleteFile(fileId, this.props.userId);
            if(res.success) {
                const updatedFiles = this.state.files.filter(f => f.fileId !== fileId);
                this.setState({ files: updatedFiles });

                if(this.props.onFileDelete) this.props.onFileDelete(fileId);
                if(this.props.onRefresh) this.props.onRefresh();
            }
        } catch(err) {
            console.error('Error deleting file', err);
            throw err;
        }
    }

    /**
     * Handle Checkbox
     */
    private handleFileCheckbox = (fileId: string, checked: boolean) => {
        const newSelected = new Set(this.state.selectedFiles);
        if(checked) {
            newSelected.add(fileId);
        } else {
            newSelected.delete(fileId);
        }
        this.setState({ selectedFiles: newSelected });
    }

    /**
     * Handle Select All
     */
    private handleSelectAll = () => {
        const allFilesIds = this.state.files.map(f => f.fileId);
        const newSelected = new Set<string>();
        
        if(this.state.selectedFiles.size !== allFilesIds.length) {
            allFilesIds.forEach(id => newSelected.add(id));
        }
        this.setState({ selectedFiles: newSelected });
    }

    private changeSort(sortBy: SortType) {
        const newSortOrder = 
            this.state.sortBy === sortBy && 
            this.state.sortOrder === 'desc' ? 'asc' : 'desc';
        
        this.setState({
            sortBy,
            sortOrder: newSortOrder
        }, () => {
            const sortedFiles = this.sortFiles(this.state.files);
            this.setState({ files: sortedFiles });
        });
    }

    render() {
        const { 
            isLoading,
            error,
            files,
            viewMode,
            selectedFiles
        } = this.state;

        if(isLoading) {
           return (
                <div className="file-list-loading">
                    <div className="spinner"></div>
                    <p>Loading files...</p>
                </div>
            );
        }
        if(error) {
            return (
                <div className="file-list-error">
                    <p>Error: {error}</p>
                    <button onClick={() => this.loadFiles()}>Retry</button>
                </div>
            );
        }
        if(files.length === 0) {
            return (
                <div className="file-list-empty">
                    <div className="empty-icon">EMPTY</div>
                    <h3>No files yet</h3>
                    <p>Upload your first file to get started!</p>
                </div>
            );
        }

        return (
            <div className="file-list-container">
                {/* Toolbar */}
                <div className="file-list-toolbar">
                    <div className="toolbar-left">
                        <input 
                            type="checkbox"
                            checked={selectedFiles.size === files.length && files.length > 0}
                            onChange={this.handleSelectAll}
                            className="select-all-checkbox"
                        />
                        <span>{selectedFiles.size} selected</span>
                    </div>
                    
                    <div className="toolbar-right">
                        <div className="view-toggle">
                            <button 
                                className={viewMode === 'grid' ? 'active' : ''}
                                onClick={() => this.setState({ viewMode: 'grid' })}
                            >
                                Grid
                            </button>
                            <button 
                                className={viewMode === 'list' ? 'active' : ''}
                                onClick={() => this.setState({ viewMode: 'list' })}
                            >
                                List
                            </button>
                        </div>
                        
                        <div className="sort-options">
                            <span>Sort by:</span>
                            <select 
                                value={this.state.sortBy}
                                onChange={(e) => this.changeSort(e.target.value as any)}
                            >
                                <option value="name">Name</option>
                                <option value="date">Date</option>
                                <option value="size">Size</option>
                                <option value="type">Type</option>
                            </select>
                            <button 
                                onClick={() => this.setState({ 
                                    sortOrder: this.state.sortOrder === 'asc' ? 'desc' : 'asc' 
                                }, () => {
                                    const sortedFiles = this.sortFiles(this.state.files);
                                    this.setState({ files: sortedFiles });
                                })}
                            >
                                {this.state.sortOrder === 'asc' ? '↑' : '↓'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* File List */}
                <div className={`file-list ${viewMode}`}>
                    {files.map(file => (
                        <div 
                            key={file.fileId}
                            className={`file-item ${selectedFiles.has(file.fileId) ? 'selected' : ''}`}
                            onClick={() => this.handleFileSelect(file)}
                        >
                            <div className="file-item-checkbox">
                                <input 
                                    type="checkbox"
                                    checked={selectedFiles.has(file.fileId)}
                                    onChange={(e) => {
                                        e.stopPropagation();
                                        this.handleFileCheckbox(file.fileId, e.target.checked);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                />
                            </div>
                            
                            <div className="file-item-icon">
                                {this.getFileIcon(file.fileType, file.mimeType)}
                            </div>
                            
                            <div className="file-item-info">
                                <div className="file-name">{file.originalFileName}</div>
                                <div className="file-details">
                                    <span className="file-size">{this.formatFileSize(file.fileSize)}</span>
                                    <span className="file-date">{this.formatDate(file.uploadedAt)}</span>
                                    <span className="file-type">{file.fileType}</span>
                                </div>
                            </div>
                            
                            <div className="file-item-actions">
                                <button 
                                    className="action-btn download-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log('Download', file.fileId);
                                    }}
                                    title="Download"
                                >
                                    Download
                                </button>
                                <button 
                                    className="action-btn delete-btn"
                                    onClick={(e) => this.handleFileDelete(file.fileId, e)}
                                    title="Delete"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
 }