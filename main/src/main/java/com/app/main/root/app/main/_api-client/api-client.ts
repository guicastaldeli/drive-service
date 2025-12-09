import { TimeStreamClient } from "./time-stream-client";
import { SessionServiceClient } from "./session-service-client";
import { AuthServiceClient } from "./auth-service-client";
import { UserServiceClient } from "./user-service-client";
import { SocketClientConnect } from "../socket-client-connect";
import { SessionManager } from "../_session/session-manager";

export class ApiClient {
    private url: string | undefined;
    private socketClient!: SocketClientConnect

    private timeStream: TimeStreamClient;
    private sessionSerive: SessionServiceClient;
    private authService: AuthServiceClient;
    private userService: UserServiceClient;

    constructor(socketClient: SocketClientConnect) {
        this.getUrl();
        this.timeStream = new TimeStreamClient(this.url);
        this.sessionSerive = new SessionServiceClient(this.url);
        this.authService = new AuthServiceClient(this.url);
        this.userService = new UserServiceClient(this.url);
        this.setupSessionRefresh();
    }

    private getUrl(): string {
        this.url = process.env.NEXT_PUBLIC_API_URL;
        if(!this.url) throw new Error('URL err');
        return this.url;
    }

    /**
     * Time Stream
     */
    public async getTimeStream(): Promise<TimeStreamClient> {
        return this.timeStream;
    }

    /**
     * Session Service
     */
    public async getSessionService(): Promise<SessionServiceClient> {
        return this.sessionSerive;
    }

    /**
     * Auth Service
     */
    public async getAuthService(): Promise<AuthServiceClient> {
        return this.authService;
    }

    /**
     * User Service
     */
    public async getUserService(): Promise<UserServiceClient> {
        return this.userService;
    }

    /**
     * 
     * Session Manager
     * 
     */
    private setupSessionRefresh(): void {
        setInterval(async () => {
            const { isValid, needsRefresh } = SessionManager.checkSessionStatus();
            if(!isValid) {
                SessionManager.clearSession();
                return;
            }
            if(needsRefresh) {
                try {
                    await this.authService.refreshToken();
                    console.log('Session rrefreshed! :)');
                } catch(err) {
                    console.error('Failed to refresh :(', err);
                }
            }
        });
    }

    public async initSession(): Promise<boolean> {
        try {
            const sessionData = await SessionManager.initSession();
            if(!sessionData) return false;

            const validation = await this.authService.validateSession();
            if(!validation) {
                SessionManager.clearSession();
                return false;
            }
            if(validation.user) {
                SessionManager.updateSession({
                    userId: validation.user.userId,
                    username: validation.user.username,
                    email: validation.user.email
                });
            }

            return true;
        } catch(err) {
            console.error('Error init session!', err);
            return false;
        }
    }

    public getAuthHeaders(): HeadersInit {
        const sessionId = SessionManager.getSessionId();
        const headers: HeadersInit = {
            'Content-Type': 'application/json'
        }
        if(sessionId) {
            headers['Authorization'] = `Bearer ${sessionId}`;
        }
        return headers;
    }
} 