import "./__styles/styles.scss";
import React, { Component } from "react";
import { SessionContext, SessionType } from "./_session/session-provider";
import { ApiClient } from "./_api-client/api-client";
import { SessionManager } from "./_session/session-manager";

interface Props {
    apiClient: ApiClient;
    onLogout?: () => void;
}

interface State {
    userData: any;
    currentSession: SessionType;
    isLoading: boolean;
}

export class Dashboard extends Component<Props, State> {
    private apiClient: ApiClient;
    private socketId!: string;
    private userId!: string;

    constructor(props: Props) {
        super(props);
        this.state = {
            userData: null,
            currentSession: 'MAIN_DASHBOARD',
            isLoading: true
        }
        this.apiClient = props.apiClient;
    }

    public async getUserData(sessionId: string, userId: string): Promise<void> {
        this.socketId = sessionId;
        this.userId = userId;
    }

    async componentDidMount(): Promise<void> {
        await this.loadUserData();
    }

    componentWillUnmount(): void {
    }

    componentDidUpdate(prevProps: Props): void {
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

    private setSession = (session: SessionType): void => {
        this.setState({ currentSession: session });
    }

    render() {
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
                            {sessionContext && sessionContext.currentSession === 'MAIN_DASHBOARD' && (
                                <div className="screen main-dashboard">
                                    <div className="sidebar">
                                    </div>
                                    <div className="container-upload-file">
                                        <input type="file" id="upload-file" />
                                        <label htmlFor="upload-file">Upload</label>
                                    </div>
                                </div>
                            )}
                        </>
                    )
                }}
            </SessionContext.Consumer>
        );
    }
}