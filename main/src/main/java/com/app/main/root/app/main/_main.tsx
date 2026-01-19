import './__styles/styles.scss';
import React from 'react';
import { Component } from 'react';
import { ApiClientController } from './_api-client/api-client-controller';
import { SocketClientConnect } from './socket-client-connect';
import { CacheServiceClient } from '../_cache/cache-service-client';
import { CachePreloaderService } from '../_cache/cache-preloader-service';
import { Dashboard } from './_dashboard';
import { SessionProvider, SessionType, SessionContext } from './_session/session-provider';
import { SessionManager } from './_session/session-manager';
import { CookieService } from './_session/cookie-service';
import { Auth } from './auth';
import { Renderer } from './renderer/renderer';
import { PasswordResetController } from './password-reset-controller';

interface State {
    cacheService: CacheServiceClient | null;
    cachePreloader: CachePreloaderService | null;
    currentSession: SessionType;
    userId: string | null;
    username: string | null;
    isLoading: boolean;
    rememberUser: boolean;
    showPasswordReset: boolean;
    passwordResetToken?: string;
    renderer: Renderer | null;
    activeTab: 'login' | 'register';
}

export class Main extends Component<any, State> {
    private socketClientConnect: SocketClientConnect;
    private apiClientController: ApiClientController;
    private cacheService: CacheServiceClient;
    private cachePreloader: CachePreloaderService;
    public auth: Auth;

    private renderer: Renderer | null = null;
    private canvasRef = React.createRef<HTMLCanvasElement>();
    private appContainerRef = React.createRef<HTMLDivElement>();
    private dashboardInstance: Dashboard | null = null;

    constructor(props: any) {
        super(props);
        this.socketClientConnect = SocketClientConnect.getInstance();
        this.apiClientController = new ApiClientController(this.socketClientConnect);
        this.cacheService = CacheServiceClient.getInstance();
        this.cachePreloader = new CachePreloaderService(this.apiClientController, this.cacheService);
        this.cacheService.setApiClient(this.apiClientController);
        this.auth = new Auth(
            this,
            this.apiClientController,
            this.socketClientConnect,
            this.cacheService,
            this.cachePreloader,
            this.appContainerRef,
            this.dashboardInstance!
        )

        const rememberUserCookie = 
            typeof window !== 'undefined' ?
            CookieService.getValue(SessionManager.REMEMBER_USER) === 'true' :
            false;
            
        this.state = {
            cacheService: null,
            cachePreloader: null,
            currentSession: 'LOGIN',
            userId: null,
            username: null,
            isLoading: true,
            showPasswordReset: false,
            passwordResetToken: undefined,
            rememberUser: rememberUserCookie,
            renderer: null,
            activeTab: 'login'
        }
    }

    async componentDidMount(): Promise<void> {
        try {
            await this.connect();
            const rememberUser = CookieService.getValue(SessionManager.REMEMBER_USER) === 'true';
            console.log('Remember user from cookie:', rememberUser);
            
            this.setState({ 
                isLoading: false,
                rememberUser: rememberUser
            });
        } catch(err) {
            console.error('Error in componentDidMount:', err);
            this.setState({ isLoading: false });
        }
    }
        
    private async connect(): Promise<void> {
        if(!this.socketClientConnect) return;
        await this.socketClientConnect.connect();
    }

    private setDashboardRef = (instance: Dashboard | null): void => {
        this.dashboardInstance = instance;
        if(instance && this.auth.state.userId && this.auth.state.username) {
            this.socketClientConnect.getSocketId().then((sessionId) => {
                if(sessionId) {
                    instance.getUserData(
                        sessionId,
                        this.auth.state.userId!
                    );
                }
            });
        }
    }

    /**
     * 
     * Renderer
     * 
     */
    public async initRenderer(): Promise<void> {
        try {
            if(!this.canvasRef.current) {
                console.warn('Canvas ref not available');
                return;
            }

            this.renderer = new Renderer();
            await this.renderer.setup(this.canvasRef.current.id);
            await this.renderer.run();
            await this.renderer.update();

            this.setState({ renderer: this.renderer });
        } catch(err) {
            console.error('Renderer err', err);
        }
    }

    private switchTab = (tab: 'login' | 'register'): void => {
        this.setState({ activeTab: tab });
    }

    render() {
        return (
            <div className='app' ref={this.appContainerRef}>
                <SessionProvider 
                    apiClientController={this.apiClientController} 
                    initialSession='LOGIN'
                >
                    <SessionContext.Consumer>
                        {(sessionContext) => {
                            if(!sessionContext) {
                                return <div>Loading...</div>
                            }
                            if(sessionContext.isLoading) {
                                return <div>Loading session...</div>
                            }
                            
                            return (
                                <>
                                    {sessionContext && sessionContext.currentSession === 'LOGIN' && (
                                        <div className='screen join-screen'>
                                            <div className='form'>
                                                {/* Login Form */}
                                                <div className="form-input">
                                                    <h2>Login</h2>
                                                    <label>Email</label>
                                                    <input 
                                                        type="email" 
                                                        ref={this.auth.loginEmailRef}
                                                    />
                                                    <label>Password</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.auth.loginPasswordRef}
                                                    />
                                                    <div className='form-input'>
                                                        <button 
                                                            onClick={() => this.auth.join(sessionContext, false)}
                                                        >
                                                            Login
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {/* Create Account Form */}
                                                <div className="form-input">
                                                    <h2>Create Account</h2>
                                                    <label>Email</label>
                                                    <input 
                                                        type="email" 
                                                        ref={this.auth.createEmailRef}
                                                    />
                                                    <label>Username</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.auth.createUsernameRef}
                                                    />
                                                    <label>Password</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.auth.createPasswordRef}
                                                    />
                                                    <div className='form-input'>
                                                        <button 
                                                            onClick={() => this.auth.join(sessionContext, true)}
                                                        >
                                                            Create Account
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {sessionContext.currentSession === 'PASSWORD_RESET' && (
                                        <div className="app-password-reset">
                                            <PasswordResetController
                                                apiClientController={this.apiClientController}
                                                socketClientConnect={this.socketClientConnect}
                                                onBackToLogin={() => this.auth.handleBackToLogin(sessionContext)}
                                                token={this.state.passwordResetToken}
                                            />
                                        </div>
                                    )}
                                    {sessionContext && sessionContext.currentSession === 'MAIN_DASHBOARD' && (
                                        <Dashboard 
                                            ref={this.setDashboardRef}
                                            main={this}
                                            apiClientController={this.apiClientController}
                                        />
                                    )}
                                </>
                            );
                        }}
                    </SessionContext.Consumer>
                </SessionProvider>
            </div>
        );
    }
}