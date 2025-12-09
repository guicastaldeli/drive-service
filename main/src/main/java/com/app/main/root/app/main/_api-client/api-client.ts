import { TimeStreamClient } from "./time-stream-client";
import { SessionServiceClient } from "./session-service-client";
import { AuthServiceClient } from "./auth-service-client";
import { UserServiceClient } from "./user-service-client";
import { SocketClientConnect } from "../socket-client-connect";
import { SessionConfig } from "../_session/session-config";

export class ApiClient {
    private url: string | undefined;
    private socketClient!: SocketClientConnect
    private sessionConfig: SessionConfig;

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
        this.sessionConfig = new SessionConfig(this);
        this.sessionConfig.setupSessionRefresh();
    }

    private getUrl(): string {
        this.url = process.env.NEXT_PUBLIC_API_URL;
        if(!this.url) throw new Error('URL err');
        return this.url;
    }

    /**
     * Session Config
     */
    public async getSessionConfig(): Promise<SessionConfig> {
        return this.sessionConfig;
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
} 