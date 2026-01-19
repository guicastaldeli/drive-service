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
            await new Promise(resolve => setTimeout(resolve, 0));
            setTimeout(() => {
                if(this.canvasRef.current) {
                    this.initRenderer();
                }
            }, 100);

            await this.connect();

            const userInfo = SessionManager.getUserInfo();
            console.log('Loaded user info from cookies:', userInfo);
            if(userInfo) {
                try {
                    const authService = await this.apiClientController.getAuthService();
                    const validation = await authService.validateSession();
                    
                    if(validation.user && validation.user.userId !== userInfo.userId) {
                        console.error('Session user mismatch!');
                        console.error('Cookie userId:', userInfo.userId);
                        console.error('Server userId:', validation.user.userId);
                        SessionManager.clearSession();
                        this.setState({ isLoading: false });
                        return;
                    }
                } catch(err) {
                    console.error('Session validation failed:', err);
                    SessionManager.clearSession();
                    this.setState({ isLoading: false });
                    return;
                }
                this.auth.setState({
                    userId: userInfo.userId,
                    sessionId: userInfo.sessionId,
                    username: userInfo.username
                });
            
                const rememberUser = CookieService.getValue(SessionManager.REMEMBER_USER) === 'true';
                console.log('Remember user from cookie:', rememberUser);
    
                if(userInfo?.userId) {
                    try {
                        const data = {
                            sessionId: userInfo.sessionId,
                            userId: userInfo.userId,
                            username: userInfo.username
                        };
                        await this.socketClientConnect.sendToDestination(
                            '/app/new-user',
                            data,
                            '/topic/user'
                        );
                        
                    } catch(err) {
                        console.error('Failed to load chat items:', err);
                    }
                }
                
                const activeChat = localStorage.getItem('active-chat');
                console.log('Found active chat from storage:', activeChat);
                let activeChatId = null;
                if(activeChat) {
                    try {
                        const chatObj = JSON.parse(activeChat);
                        activeChatId = chatObj.id || chatObj.chatId;
                        console.log(`Extracted active chat ID: ${activeChatId}`);
                    } catch(err) {
                        console.warn('Failed to parse active chat, using as-is:', activeChat);
                        activeChatId = activeChat;
                    }
                }

                if(userInfo.userId) {
                    console.log('Initializing cache for user:', userInfo.userId);
                    
                    await this.cacheService.initCache(userInfo.userId, 'root');
                }
                this.setState({ 
                    isLoading: false,
                    rememberUser: rememberUser
                });
            }
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
        const { activeTab, isLoading } = this.state;
        const LOGO_PATH = './data/resource/img/logo.png';
        const REPO_LINK = 'https://github.com/guicastaldeli/drive-service';

        return (
            <div className='app' ref={this.appContainerRef}>
                <SessionProvider 
                    apiClientController={this.apiClientController} 
                    initialSession='LOGIN'
                >
                    <SessionContext.Consumer>
                        {(sessionContext) => {
                            if(!sessionContext) {
                                return (
                                    <div className="session-loading-overlay">
                                        <div className="session-loading-content">
                                            <div>Loading session...</div>
                                            <div className="session-loading-status">
                                                <span>Initializing application</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <>
                                    <div className="app-main">
                                        {sessionContext.currentSession === 'LOGIN' && (
                                            <>
                                                <header id='main-header'>
                                                    <div id="header-content">
                                                        <img 
                                                            src={LOGO_PATH} 
                                                            alt="drive service"
                                                            onClick={() => window.location.href = ''} 
                                                            title='Home'
                                                        />
                                                        <a href={REPO_LINK} target='_blank'>Repository</a>
                                                    </div>
                                                </header>
                                                <div className='renderer'>
                                                    <canvas 
                                                        id='ctx'
                                                        ref={this.canvasRef}
                                                    >
                                                    </canvas>
                                                </div>
                                                <div className="screen join-screen container">
                                                    <div className='screen join-screen'>
                                                        <div className='form'>
                                                            <div className="tab-container">
                                                                {/* Tab Headers */}
                                                                <div className="tab-headers">
                                                                    <div 
                                                                        className={`tab-header ${activeTab === 'login' ? 'active' : ''}`}
                                                                        onClick={() => this.switchTab('login')}
                                                                    >
                                                                        Login
                                                                    </div>
                                                                    <div 
                                                                        className={`tab-header ${activeTab === 'register' ? 'active' : ''}`}
                                                                        onClick={() => this.switchTab('register')}
                                                                    >
                                                                        Register
                                                                    </div>
                                                                </div>
                                                                        
                                                                {/* Tab Content */}
                                                                <div className="tab-content">
                                                                    {/* Login Tab */}
                                                                    <div className={`tab-panel ${activeTab === 'login' ? 'active' : ''}`}>
                                                                        <div className="form-input">
                                                                            <h2>Login</h2>
                                                                            <label>Email</label>
                                                                            <input 
                                                                                type="email" 
                                                                                ref={this.auth.loginEmailRef}
                                                                                placeholder="Enter your email"
                                                                            />
                                                                            <label>Password</label>
                                                                            <input 
                                                                                type="password"
                                                                                ref={this.auth.loginPasswordRef}
                                                                                placeholder="Enter your password"
                                                                            />
                                                                            <div className="login-input">
                                                                                <button 
                                                                                    onClick={() => this.auth.join(sessionContext, false)}
                                                                                >
                                                                                    Login
                                                                                </button>
                                                                                <button 
                                                                                    type="button"
                                                                                    className="forgot-password-btn"
                                                                                    onClick={() => this.auth.handlePasswordReset(sessionContext)}
                                                                                >
                                                                                    Forgot Password?
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                            
                                                                    {/* Register Tab */}
                                                                    <div className={`tab-panel ${activeTab === 'register' ? 'active' : ''}`}>
                                                                        <div className="form-input">
                                                                            <h2>Create Account</h2>
                                                                            <label>Email</label>
                                                                            <input 
                                                                                type="email" 
                                                                                ref={this.auth.createEmailRef}
                                                                                placeholder="Enter your email"
                                                                            />
                                                                            <label>Username</label>
                                                                            <input 
                                                                                type="text" 
                                                                                ref={this.auth.createUsernameRef}
                                                                                placeholder="Choose a username"
                                                                            />
                                                                            <label>Password</label>
                                                                            <input 
                                                                                type="password"
                                                                                ref={this.auth.createPasswordRef}
                                                                                placeholder="Create a password"
                                                                            />
                                                                            <div className='register-input'>
                                                                                <button 
                                                                                    onClick={() => this.auth.join(sessionContext, true)}
                                                                                >
                                                                                    Create Account
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="letter-container"></div>
                                                <div className='info'>
                                                    <div className="border-info"></div>
                                                    <div className="text-info">
                                                        <p>
                                                            Drive Service 2026. Fork on
                                                            <a href={REPO_LINK} target='_blank'> GitHub</a>
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
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
                                        {sessionContext.currentSession === 'MAIN_DASHBOARD' && (
                                            <>
                                                <div className="app-dashboard">
                                                    <div className="dashboard-content">
                                                        <Dashboard
                                                            ref={this.setDashboardRef}
                                                            main={this}
                                                            apiClientController={this.apiClientController}
                                                            onLogout={() => this.auth.logout(sessionContext)}
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </>
                            );
                        }}
                    </SessionContext.Consumer>
                </SessionProvider>
            </div>
        );
    }
}