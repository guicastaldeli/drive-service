import "./__styles/styles.scss";
import React, { Component } from "react";
import { SessionContext, SessionType } from "./_session/session-provider";
import { ApiClientController } from "./_api-client/api-client-controller";
import { SessionManager } from "./_session/session-manager";
import { Main } from "./_main";
import { FileUploader } from "./_file/file-uploader";
import { FileItem } from "./_file/file-item";

interface Props {
    main: Main;
    apiClientController: ApiClientController;
    onLogout?: () => void;
}

interface State {
    userId: string | null;
    userData: any;
    currentSession: SessionType;
    isLoading: boolean;
    allFilesLoaded: boolean;
}

export class Dashboard extends Component<Props, State> {
    private apiClientController: ApiClientController;
    private fileItemRef = React.createRef<FileItem>();
    private main: Main;

    private filesLoadTimeout: NodeJS.Timeout | null = null;
    private socketId!: string;
    private userId!: string;

    constructor(props: Props) {
        super(props);
        this.state = {
            userId: null,
            userData: null,
            currentSession: 'MAIN_DASHBOARD',
            isLoading: true,
            allFilesLoaded: false
        }
        this.main = props.main;
        this.apiClientController = props.apiClientController;
    }

    public async getUserData(sessionId: string, userId: string): Promise<void> {
        this.socketId = sessionId;
        this.userId = userId;
        this.setState({ userId });
    }

    async componentDidMount(): Promise<void> {
        await this.loadUserData();
        this.filesLoadTimeout = setTimeout(() => {
            if(!this.state.allFilesLoaded) {
                console.warn('Files loading timeout reached, proceeding anyway');
                this.setState({ allFilesLoaded: true });
            }
        }, 10000);
    }

    componentWillUnmount(): void {
        if(this.filesLoadTimeout) {
            clearTimeout(this.filesLoadTimeout);
        }
    }

    /**
     * Load User Data
     */
    private async loadUserData() {
        try {
            const sessionData = SessionManager.getCurrentSession();
            if(sessionData) {
                this.setState({ 
                    userData: sessionData,
                    isLoading: false 
                });
            }
        } catch(err) {
            console.error(err);
            this.setState({
                isLoading: false 
            });
        }
    }

    private handleUploadSuccess = (res: any) => {
        console.log('Upload success!', res);
        if(this.fileItemRef.current) {
            this.fileItemRef.current.refreshFiles();
        }
    }

    private handleAllFilesLoaded = (): void => {
        console.log('All files have been loaded!');
        if(this.filesLoadTimeout) {
            clearTimeout(this.filesLoadTimeout);
            this.filesLoadTimeout = null;
        }
        this.setState({ allFilesLoaded: true });
    }

    render() {
        const sessionData = SessionManager.getUserInfo();
        const userId = sessionData?.userId;
        
        if(!userId) {
            return <div>Loading user data...</div>;
        }

        if(this.state.isLoading) {
            return <div>Loading dashboard...</div>;
        }

        return (
            <SessionContext.Consumer>
                {(sessionContext) => {
                    if(!sessionContext || sessionContext.currentSession !== 'MAIN_DASHBOARD') {
                        return null;
                    }

                    return (
                        <>
                            {!this.state.allFilesLoaded && (
                                <div className="files-loading-overlay">
                                    <div className="files-loading-content">
                                        <p>Loading files...</p>
                                        <div className="files-loading-spinner">
                                            <div className="spinner"></div>
                                        </div>
                                        <div className="files-loading-status">
                                            <span>Please wait...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            
                            <div className={`screen main-dashboard ${!this.state.allFilesLoaded ? 'loading' : ''}`}>
                                <div className="upper-bar">
                                    <button id="logout-actn" onClick={() => this.main.auth.logout(sessionContext)}>Logout</button>
                                    <FileUploader
                                        apiClientController={this.apiClientController}
                                        onUploadSuccess={this.handleUploadSuccess}
                                        onUploadError={(err) => {
                                            console.error('Upload failed', err);
                                        }}
                                    />
                                </div>
                                <div id="file-list">
                                    <div style={{ 
                                        opacity: this.state.allFilesLoaded ? 1 : 0,
                                        height: this.state.allFilesLoaded ? 'auto' : '0',
                                        overflow: 'hidden'
                                    }}>
                                        <FileItem
                                            ref={this.fileItemRef}
                                            apiClientController={this.apiClientController}
                                            userId={userId}
                                            parentFolderId="root" 
                                            onAllFilesLoaded={this.handleAllFilesLoaded}
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )
                }}
            </SessionContext.Consumer>
        );
    }
}