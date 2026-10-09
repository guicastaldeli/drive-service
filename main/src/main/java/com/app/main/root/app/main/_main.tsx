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
    rendererReady: boolean;
    rendererError: string | null;
    activeTab: 'login' | 'register';
    authState: AuthState;
}

interface AuthState {
    userId: string | null;
    sessionId: string | null;
    username: string | null;
    message: string;
    error: string;
    isAuthenticating: boolean;
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

    private rendererInitialized = false;

    private RENDER_TIMEOUT: number = 1500;
    private WAIT_TIME: number = 60;

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
            rendererReady: false,
            rendererError: null,
            activeTab: 'login',
            authState: { ...this.auth.state }
        }
    }

    async componentDidMount(): Promise<void> {
        try {
            const originalSetState = this.auth.setState.bind(this.auth);
            this.auth.setState = (newState: any, cb?: () => void) => {
                originalSetState(newState, cb);
                this.setState({
                    authState: { ...this.auth.state }
                });
            }
            
            setTimeout(() => {
                if(!this.state.rendererReady && !this.state.rendererError) {
                    //console.warn('Renderer init timed out, continuing anyway');
                    this.setState({ rendererError: 'Renderer timed out' });
                }
            }, this.RENDER_TIMEOUT);

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

                if(userInfo.userId) {
                    console.log('Initializing cache for user:', userInfo.userId);
                    
                    await this.cacheService.initCache(userInfo.userId, 'root');
                }
                this.setState({ 
                    isLoading: false,
                    rememberUser: rememberUser
                });
            } else {
                this.setState({ isLoading: false });
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
        console.log('[Main] initRenderer START');

        if(!this.canvasRef.current) {
            console.warn('[Main] no canvas — bailing');
            this.setState({
                rendererReady: false,
                rendererError: 'Canvas not available'
            });
            return;
        }

        try {
            if(!this.canvasRef.current) {
                console.warn('Canvas ref not available');
                return;
            }

            this.renderer = new Renderer();
            await this.renderer.setup(this.canvasRef.current.id);
            await this.renderer.run();
            await this.renderer.update();

            await new Promise<void>((resolve) => {
                let n = 0;

                const step = () => {
                    if(++n >= this.WAIT_TIME) {
                        resolve();
                        return;
                    }
                    requestAnimationFrame(step);
                };
                requestAnimationFrame(step);
            });

            this.setState({
                renderer: this.renderer,
                rendererReady: true,
                rendererError: null,
            }, () => console.log('[Main] rendererReady is now true'));
        } catch(err) {
            console.error('[Main] initRenderer ERR', err);
            this.setState({
                rendererReady: false,
                rendererError: (err as Error)?.message ?? 'Failed to initialize renderer',
            });
        }
    }

    private maybeInitRenderer(): void {
        if(this.rendererInitialized) return;

        const canvas = this.canvasRef.current;
        if(!canvas) return;
        if(document.querySelector('#ctx') !== canvas) return;

        this.rendererInitialized = true;
        console.log('[Main] canvas mounted, calling initRenderer');
        this.initRenderer();
    }

    private switchTab = (tab: 'login' | 'register'): void => {
        this.auth.clearMessages();
        this.setState({ activeTab: tab });
    }

    render() {
        const { activeTab, authState } = this.state;
        const LOGO_PATH = './data/resource/img/logo.png';
        const REPO_LINK = 'https://github.com/guicastaldeli/drive-service';

        const hasMessages = authState.message || authState.error;
        const joinScreenClass = hasMessages ? 'screen join-screen expanded' : 'screen join-screen';
        const containerClass = hasMessages ? 'screen join-screen container has-messages' : 'screen join-screen container';
        const isAuthenticating = authState.isAuthenticating;

        const clearMessages = () => this.auth.clearMessages();

        return (
            <div className='app' ref={this.appContainerRef}>
                <SessionProvider
                    apiClientController={this.apiClientController}
                    initialSession='LOGIN'
                >
                    <SessionContext.Consumer>
                        {(sessionContext) => {
                            const showOverlay = !sessionContext || (!this.state.rendererReady && !this.state.rendererError);

                            const showLoginScreen = !sessionContext || sessionContext.currentSession === 'LOGIN';

                            return (
                                <>
                                    <div className="app-main">
                                        {/* Login Screen */}
                                        {showLoginScreen && (
                                            <>
                                                <header id='main-header'>
                                                    <div id="header-content">
                                                        <img
                                                            src={LOGO_PATH}
                                                            alt="drive service"
                                                            onClick={() => (window.location.href = '')}
                                                            title='Home'
                                                        />
                                                        <a href={REPO_LINK} target='_blank'>
                                                            Repository
                                                        </a>
                                                    </div>
                                                </header>

                                                <div className='renderer'>
                                                    <canvas
                                                        id='ctx'
                                                        ref={(el) => {
                                                            if (el) {
                                                                this.canvasRef.current = el;
                                                                this.maybeInitRenderer();
                                                            }
                                                        }}
                                                    ></canvas>
                                                </div>

                                                <div className={containerClass}>
                                                    <div className={joinScreenClass}>
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

                                                                <div
                                                                    className="auth-content"
                                                                    style={{ display: hasMessages ? 'flex' : 'none' }}
                                                                >
                                                                    {authState.message && (
                                                                        <div className="auth-message">
                                                                            {authState.message
                                                                                .split('\n')
                                                                                .map((line, i) => (
                                                                                    <div key={i}>{line}</div>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                                    {authState.error && (
                                                                        <div className="auth-error">
                                                                            {authState.error
                                                                                .split('\n')
                                                                                .map((line, i) => (
                                                                                    <div key={i}>{line}</div>
                                                                                ))}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Tab Content */}
                                                                <div className="tab-content">
                                                                    {/* Login Tab */}
                                                                    <div
                                                                        className={`tab-panel ${activeTab === 'login' ? 'active' : ''}`}
                                                                    >
                                                                        <form
                                                                            className="form-input"
                                                                            noValidate
                                                                            onSubmit={(e) => {
                                                                                e.preventDefault();
                                                                                this.auth.join(sessionContext, false);
                                                                            }}
                                                                        >
                                                                            <h2>Login</h2>

                                                                            <label htmlFor="login-email">Email</label>
                                                                            <input
                                                                                id="login-email"
                                                                                name="email"
                                                                                type="email"
                                                                                autoComplete="email"
                                                                                ref={this.auth.loginEmailRef}
                                                                                placeholder="Enter your email"
                                                                                onChange={clearMessages}
                                                                            />

                                                                            <label htmlFor="login-password">Password</label>
                                                                            <input
                                                                                id="login-password"
                                                                                name="password"
                                                                                type="password"
                                                                                autoComplete="current-password"
                                                                                ref={this.auth.loginPasswordRef}
                                                                                placeholder="Enter your password"
                                                                                onChange={clearMessages}
                                                                            />

                                                                            <div className="login-input">
                                                                                <button
                                                                                    type="submit"
                                                                                    className={`login-input-btn ${isAuthenticating ? 'auth' : 'default'}`}
                                                                                >
                                                                                    {isAuthenticating ? 'Logging in...' : 'Login'}
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    className="forgot-password-btn"
                                                                                    onClick={() =>
                                                                                        this.auth.handlePasswordReset(sessionContext)
                                                                                    }
                                                                                >
                                                                                    Forgot Password?
                                                                                </button>
                                                                            </div>
                                                                        </form>
                                                                    </div>

                                                                    {/* Register Tab */}
                                                                    <div
                                                                        className={`tab-panel ${activeTab === 'register' ? 'active' : ''}`}
                                                                    >
                                                                        <form
                                                                            className="form-input"
                                                                            noValidate
                                                                            onSubmit={(e) => {
                                                                                e.preventDefault();
                                                                                this.auth.join(sessionContext, true);
                                                                            }}
                                                                        >
                                                                            <h2>Create Account</h2>

                                                                            <label htmlFor="register-email">Email</label>
                                                                            <input
                                                                                id="register-email"
                                                                                name="email"
                                                                                type="email"
                                                                                autoComplete="email"
                                                                                ref={this.auth.createEmailRef}
                                                                                placeholder="Enter your email"
                                                                                onChange={clearMessages}
                                                                            />

                                                                            <label htmlFor="register-username">Username</label>
                                                                            <input
                                                                                id="register-username"
                                                                                name="username"
                                                                                type="text"
                                                                                autoComplete="username"
                                                                                ref={this.auth.createUsernameRef}
                                                                                placeholder="Choose a username"
                                                                                onChange={clearMessages}
                                                                            />

                                                                            <label htmlFor="register-password">Password</label>
                                                                            <input
                                                                                id="register-password"
                                                                                name="password"
                                                                                type="password"
                                                                                autoComplete="new-password"
                                                                                ref={this.auth.createPasswordRef}
                                                                                placeholder="Create a password"
                                                                                onChange={clearMessages}
                                                                            />

                                                                            <div className='register-input'>
                                                                                <button
                                                                                    type="submit"
                                                                                    className={`register-input-btn ${isAuthenticating ? 'auth' : 'default'}`}
                                                                                >
                                                                                    {isAuthenticating
                                                                                        ? 'Creating Account...'
                                                                                        : 'Create Account'}
                                                                                </button>
                                                                            </div>
                                                                        </form>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="letter-container"></div>

                                                <div className='info'>
                                                    <div className="text-info">
                                                        <p>
                                                            Drive Service 2026. Fork on
                                                            <a href={REPO_LINK} target='_blank'> GitHub</a>
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {/* Password Reset */}
                                        {sessionContext?.currentSession === 'PASSWORD_RESET' && (
                                            <div className="app-password-reset">
                                                <PasswordResetController
                                                    apiClientController={this.apiClientController}
                                                    socketClientConnect={this.socketClientConnect}
                                                    onBackToLogin={() =>
                                                        this.auth.handleBackToLogin(sessionContext)
                                                    }
                                                    token={this.state.passwordResetToken}
                                                />
                                            </div>
                                        )}

                                        {/* Main Dashboard */}
                                        {sessionContext?.currentSession === 'MAIN_DASHBOARD' && (
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
                                        )}
                                    </div>

                                    {/* Loading Overlay */}
                                    {showOverlay && (
                                        <div className="session-loading-overlay">
                                            <div className="session-loading-content">
                                                <div>Loading session...</div>
                                                <div className="session-loading-status">
                                                    <span>Initializing application</span>
                                                </div>
                                            </div>
                                        </div>
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