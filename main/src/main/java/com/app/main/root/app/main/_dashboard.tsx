import "./__styles/styles.scss";
import React, { Component } from "react";
import { SessionContext, SessionType } from "./_session/session-provider";
import { ApiClient } from "./_api-client/api-client";

interface Props {
    apiClient: ApiClient;
    onChatListUpdate?: (chatList: any[]) => void;
}

interface State {
    currentSession: SessionType;
}

export class Dashboard extends Component<Props, State> {
    private apiClient: ApiClient;

    private socketId!: string;
    private userId!: string;

    constructor(props: Props) {
        super(props);
        this.state = {
            currentSession: 'MAIN_DASHBOARD'
        }
        this.apiClient = props.apiClient;
    }

    public async getUserData(sessionId: string, userId: string): Promise<void> {
        this.socketId = sessionId;
        this.userId = userId;
    }

    async componentDidMount(): Promise<void> {
        this.setSession('MAIN_DASHBOARD');
    }

    componentWillUnmount(): void {
    }

    componentDidUpdate(prevProps: Props): void {
    }

    private setSession = (session: SessionType): void => {
        this.setState({ currentSession: session });
    }

    render() {
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
                                </div>
                            )}
                        </>
                    )
                }}
            </SessionContext.Consumer>
        );
    }
}