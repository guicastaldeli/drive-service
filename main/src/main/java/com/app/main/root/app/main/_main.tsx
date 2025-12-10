import './__styles/styles.scss';
import React from 'react';
import { Component } from 'react';
import { ApiClient } from './_api-client/api-client';
import { SocketClientConnect } from './socket-client-connect';
import { CacheServiceClient } from '../_cache/cache-service-client';
import { CachePreloaderService } from '../_cache/cache-preloader-service';
import { Dashboard } from './_dashboard';
import { SessionProvider, SessionType, SessionContext } from './_session/session-provider';
import { SessionManager } from './_session/session-manager';
import { CookieService } from './_session/cookie-service';

interface State {
    currentSession: SessionType;
    userId: string | null;
    username: string | null;
    isLoading: boolean;
    rememberUser: boolean;
}

export class Main extends Component<any, State> {
    private socketClientConnect: SocketClientConnect;
    private apiClient: ApiClient;
    private cacheService: CacheServiceClient;
    private cachePreloader: CachePreloaderService;

    private appContainerRef = React.createRef<HTMLDivElement>();
    private dashboardInstance: Dashboard | null = null;

    constructor(props: any) {
        super(props);
        this.socketClientConnect = SocketClientConnect.getInstance();
        this.apiClient = new ApiClient(this.socketClientConnect);
        this.cacheService = CacheServiceClient.getInstance();
        this.cachePreloader = new CachePreloaderService(this.apiClient, this.cacheService);
        this.cacheService.setApiClient(this.apiClient);
        this.state = {
            currentSession: 'LOGIN',
            userId: null,
            username: null,
            isLoading: true,
            rememberUser: false
        }
    }

    async componentDidMount(): Promise<void> {
        try {
            await this.connect();
            const autoLoginSuccess = await this.tryAutoLogin();
            
            if (autoLoginSuccess) {
                console.log('Auto-login successful');
                return;
            }
            
            this.setState({ isLoading: false });
        } catch(err) {
            console.error('Error in componentDidMount:', err);
            this.setState({ isLoading: false });
        }

        this.loadData();
    }

    private async tryAutoLogin(): Promise<boolean> {
        try {            
            const sessionId = SessionManager.getSessionId();
            const userInfo = SessionManager.getUserInfo();
            
            console.log('Session ID from cookies:', sessionId);
            console.log('User info from cookies:', userInfo);
            
            if (!sessionId || !userInfo || !userInfo.userId) {
                console.log('No valid session data found');
                return false;
            }
            
            console.log('Validating session with server...');
            const sessionConfig = await this.apiClient.getSessionConfig(); 
            await sessionConfig.initSession();
            
            console.log('Session validated successfully');
            
            await this.cacheService.initCache(userInfo.userId);
            await this.cachePreloader.startPreloading(userInfo.userId);
            this.setState({
                currentSession: 'MAIN_DASHBOARD',
                userId: userInfo.userId,
                username: userInfo.username,
                isLoading: false
            });
            
            return true;
        } catch(err) {
            console.error('Auto-login failed:', err);
            SessionManager.clearSession();
            return false;
        }
    }
        
    /**
     * Load Data
     */
    private loadData = async(): Promise<void> => {
        try {
            console.log('drive data')
        } catch(err) {
            console.error('Failed to load chat data:', err);
        }
    }

    private async connect(): Promise<void> {
        if(!this.socketClientConnect) return;
        await this.socketClientConnect.connect();
    }

    private setDashboardRef = (instance: Dashboard | null): void => {
        this.dashboardInstance = instance;
    }

    //Join
    /*
    **
    ** THIS *PROBABLY BUGGIER CODE IS A AI CODE FOR-
    ** TEST PURPOSES ONLY!!!. I DID THIS VERY QUICK! (I MEAN THE AI!)
    ** SWITCH THIS THING LATER. THANK YOU!!
    **
    */
        private loginEmailRef = React.createRef<HTMLInputElement>();
        private loginPasswordRef = React.createRef<HTMLInputElement>();
        private createEmailRef = React.createRef<HTMLInputElement>();
        private createUsernameRef = React.createRef<HTMLInputElement>();
        private createPasswordRef = React.createRef<HTMLInputElement>();
        private handleJoin = async (sessionContext: any, isCreateAccount: boolean = false): Promise<void> => {
            try {
                let email: any, username: any, password: any;

                if (isCreateAccount) {
                    if (!this.createEmailRef.current || !this.createUsernameRef.current || !this.createPasswordRef.current) {
                        alert('Form elements not found');
                        return;
                    }
                    
                    email = this.createEmailRef.current.value.trim();
                    username = this.createUsernameRef.current.value.trim();
                    password = this.createPasswordRef.current.value.trim();

                    if (!email || !username || !password) {
                        alert('All fields are required for account creation');
                        return;
                    }
                    try {
                        const userService = await this.apiClient.getUserService();
                        const usernameExists = await userService.checkUsernameExists(username);
                        if (usernameExists) {
                            alert('Username already taken');
                            return;
                        }
                    } catch (err) {
                        console.error('Error checking username:', err);
                    }
                    try {
                        const userService = await this.apiClient.getUserService();
                        const emailExists = await userService.checkUserExists(email);
                        if (emailExists) {
                            alert('Email already registered');
                            return;
                        }
                    } catch (err) {
                        console.error('Error checking email:', err);
                    }
                } else {
                    if (!this.loginEmailRef.current || !this.loginPasswordRef.current) {
                        alert('Form elements not found');
                        return;
                    }
                    
                    email = this.loginEmailRef.current.value.trim();
                    password = this.loginPasswordRef.current.value.trim();

                    if (!email || !password) {
                        alert('Email and password are required');
                        return;
                    }
                }

                const existingSessionId = SessionManager.getSessionId();
                const isSessionValid = SessionManager.isSessionValid();
                const userInfo = SessionManager.getUserInfo();
                
                console.log('=== Session Check Before Login ===');
                console.log('Existing session ID:', existingSessionId);
                console.log('Is session valid?', isSessionValid);
                console.log('User info from cookies:', userInfo);
                console.log('Requested email:', email);

                if (isSessionValid && userInfo && userInfo.email === email) {
                    console.log('Valid session exists for this user, skipping login API');
                    this.setState({ 
                        username: userInfo.username,
                        userId: userInfo.userId
                    }, async () => {
                        try {
                            await this.cacheService.initCache(userInfo.userId);
                            await this.cachePreloader.startPreloading(userInfo.userId);
                            const authService = await this.apiClient.getAuthService();
                            const validation = await authService.validateSession();
                            
                            if(validation && validation.valid) {
                                console.log('Session validated with server');
                                sessionContext.setSession('MAIN_DASHBOARD');
                            } else {
                                console.log('Session invalid on server, forcing new login');
                                SessionManager.clearSession();
                                this.forceNewLogin(sessionContext, email, password, isCreateAccount, username);
                            }
                        } catch(err: any) {
                            console.error('Error in existing session flow:', err);
                            alert('Session error: ' + err.message);
                        }
                    });
                    return;
                }

                await this.forceNewLogin(sessionContext, email, password, isCreateAccount, username);
            } catch (err: any) {
                console.error('Authentication error:', err);
                alert(`Authentication failed: ${err.message}`);
            }
        }

        private forceNewLogin = async (
            sessionContext: any, 
            email: string, 
            password: string, 
            isCreateAccount: boolean, 
            username?: string
        ): Promise<void> => {
            try {
                SessionManager.clearSession();
                
                const socketId = await this.socketClientConnect.getSocketId();
                console.log('Creating new session with socket ID:', socketId);

                let result;
                const authService = await this.apiClient.getAuthService();
                
                if (isCreateAccount) {
                    result = await authService.registerUser({
                        email: email,
                        username: username!,
                        password: password,
                        sessionId: socketId
                    });
                } else {
                    result = await authService.loginUser({
                        email: email,
                        password: password,
                        sessionId: socketId
                    });
                }

                console.log('Auth result:', result);
                const authData = result;

                if (authData && authData.userId) {
                    SessionManager.saveSession(
                        {
                            userId: authData.userId,
                            username: authData.username,
                            email: authData.email
                        },
                        authData.sessionId,
                        false
                    );
                    
                    console.log('New session saved with ID:', authData.sessionId);
                    
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('LAST_SOCKET_ID', socketId);
                    }
                    
                    this.setState({ 
                        username: authData.username,
                        userId: authData.userId
                    }, async () => {
                        try {
                            await this.cacheService.initCache(authData.userId);
                            await this.cachePreloader.startPreloading(authData.userId);
                            
                            if (this.dashboardInstance) {
                                await this.dashboardInstance.getUserData(authData.sessionId, authData.userId);
                            }
                            
                            sessionContext.setSession('MAIN_DASHBOARD');
                            console.log('Successfully logged in and switched to dashboard');
                        } catch (err: any) {
                            console.error('Error in post-login setup:', err);
                            alert('Login successful but setup failed: ' + err.message);
                        }
                    });
                } else {
                    console.error('Invalid auth data:', authData);
                    throw new Error('Invalid response from server - missing user data');
                }

            } catch (err: any) {
                console.error('Authentication API error:', err);
                alert(`Authentication failed: ${err.message}`);
                throw err;
            }
        }

    render() {
        return (
            <div className='app' ref={this.appContainerRef}>
                <SessionProvider 
                    apiClient={this.apiClient} 
                    initialSession='LOGIN'
                >
                    <SessionContext.Consumer>
                        {(sessionContext) => {
                            if(!sessionContext) {
                                return <div>Loading...</div>
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
                                                        ref={this.loginEmailRef}
                                                    />
                                                    <label>Password</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.loginPasswordRef}
                                                    />
                                                    <div className='form-input'>
                                                        <button 
                                                            onClick={() => this.handleJoin(sessionContext, false)}
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
                                                        ref={this.createEmailRef}
                                                    />
                                                    <label>Username</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.createUsernameRef}
                                                    />
                                                    <label>Password</label>
                                                    <input 
                                                        type="text" 
                                                        ref={this.createPasswordRef}
                                                    />
                                                    <div className='form-input'>
                                                        <button 
                                                            onClick={() => this.handleJoin(sessionContext, true)}
                                                        >
                                                            Create Account
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {sessionContext && sessionContext.currentSession === 'MAIN_DASHBOARD' && (
                                        <Dashboard 
                                            ref={this.setDashboardRef}
                                            apiClient={this.apiClient}
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