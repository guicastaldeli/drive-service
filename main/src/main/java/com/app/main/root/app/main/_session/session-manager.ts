import { CookieService } from "./cookie-service";

export interface UserSessionData {
    userId: string | null;
    username: string | null;
    email: string | null;
    sessionId: string;
    currentSession: string;
    rememberUser: boolean;
    createdAt: number;
    expiresAt: number;
}

export interface UserData {
    userId: string | null;
    username: string | null;
    email: string | null; 
}

interface SessionDate {
    createdAt: number;
    expiresAt: number;
}

export class SessionManager {
    private static readonly SESSION_COOKIE = 'SESSION_ID';
    private static readonly USER_COOKIE = 'USER_INFO';
    private static readonly SESSION_STATUS_COOKIE = 'SESSION_STATUS';
    private static readonly REMEMBER_USER_COOKIE = 'REMEMBER_USER';
    private static readonly LOCAL_STORAGE_KEY = 'DRIVE_SESSION_DATA';

    public static setDate(rememberUser: boolean): SessionDate {
        const now = Date.now();
        return {
            createdAt: now,
            expiresAt: now + (rememberUser ?
                7 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000
            )
        }
    } 

    public static async initSession(): Promise<UserSessionData | null> {
        try {
            const sessionId = CookieService.getValue(this.SESSION_COOKIE);
            const userInfo = CookieService.getValue(this.USER_COOKIE);
            const rememberUser = CookieService.getValue(this.REMEMBER_USER_COOKIE) === 'true';
            if(!sessionId) {
                this.clearSession();
                console.log('session cleared, no session!');
                return null;
            }

            let data: UserSessionData | null = null;
            if(userInfo) {
                try {
                    const user = JSON.parse(userInfo);
                    const dates = this.setDate(rememberUser);
                    data = {
                        userId: user.userId,
                        username: user.username,
                        email: user.email || '',
                        sessionId: sessionId,
                        currentSession: 'MAIN_DASHBOARD',
                        rememberUser: rememberUser,
                        ...dates
                    }

                    if(typeof localStorage !== 'undefined') {
                        const storedData = localStorage.getItem(this.LOCAL_STORAGE_KEY);
                        if(storedData) {
                            const parsedData = JSON.parse(storedData);
                            data = { ...data, ...parsedData };
                        }
                    }
                } catch(err) {
                    console.error(err);
                    return null;
                }
            }

            return data;
        } catch(err) {
            console.error(err);
            return null;
        }
    }

    /**
     * Save Session
     */
    public static saveSession(
        userData: UserData,
        sessionId: string,
        rememberUser: boolean = false,
        addData?: Partial<UserSessionData>    
    ): void {
        const dates = this.setDate(rememberUser);
        const data: UserSessionData = {
            ...userData,
            sessionId: sessionId,
            currentSession: 'MAIN_DASHBOARD',
            rememberUser: rememberUser,
            ...dates,
            ...addData
        }

        CookieService.set(this.SESSION_COOKIE, sessionId, {
            days: rememberUser ? 7 : undefined,
            secure: 
                process.env.NODE_ENV === 'production' ||
                process.env.NODE_ENV === 'development'
        });
        CookieService.set(this.USER_COOKIE, JSON.stringify({
            userId: userData.userId,
            username: userData.username,
            email: userData.email
        }), {
            days: rememberUser ? 7 : undefined,
            secure: 
                process.env.NODE_ENV === 'production' ||
                process.env.NODE_ENV === 'development',
            sameSite: 'Lax'
        });
        CookieService.set(this.SESSION_STATUS_COOKIE, 'active', {
            days: rememberUser ? 7 : undefined,
            secure: 
                process.env.NODE_ENV === 'production' ||
                process.env.NODE_ENV === 'development',
            sameSite: 'Lax'
        });
        CookieService.set(this.REMEMBER_USER_COOKIE, rememberUser.toString(), {
            days: rememberUser ? 7 : undefined,
            secure: 
                process.env.NODE_ENV === 'production' ||
                process.env.NODE_ENV === 'development',
            sameSite: 'Lax'
        });

        if(typeof localStorage !== 'undefined') {
            localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(data));
        }
    }

    /**
     * Update Session
     */
    public static updateSession(data: Partial<UserSessionData>): void {
        const currentData = this.getCurrentSession();
        if(currentData) {
            const updatedData = {
                ...currentData,
                ...data
            }

            if(typeof localStorage !== 'undefined') {
                localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
            }

            if(data.userId || data.username || data.email) {
                CookieService.set(this.USER_COOKIE, JSON.stringify({
                    userId: updatedData.userId,
                    username: updatedData.username,
                    email: updatedData.email
                }), {
                    days: updatedData.rememberUser ? 7 : undefined,
                    secure: 
                        process.env.NODE_ENV === 'production' ||
                        process.env.NODE_ENV === 'development',
                    sameSite: 'Lax'
                });
            }
        }
    }

    /**
     * Get Current Session
     */
    public static getCurrentSession(): UserSessionData | null {
        if(typeof localStorage === 'undefined') return null;

        const storedData = localStorage.getItem(this.LOCAL_STORAGE_KEY);
        if(storedData) {
            try {
                return JSON.parse(storedData);
            } catch(err) {
                console.error(err);
            }
        }
        return null;
    }

    /**
     * Valid Session
     */
    public static isSessionValid(): boolean {
        const sessionData = this.getCurrentSession();
        if(!sessionData) return false;

        const sessionId = CookieService.getValue(this.SESSION_COOKIE);
        if(!sessionId || sessionId !== sessionData.sessionId) return false;

        if(Date.now() > sessionData.expiresAt) {
            this.clearSession();
            return false;
        } 

        return true;
    }

    /**
     * Clear Session
     */
    public static clearSession(): void {
        CookieService.deleteCookie(this.SESSION_COOKIE);
        CookieService.deleteCookie(this.USER_COOKIE);
        CookieService.deleteCookie(this.SESSION_STATUS_COOKIE);
        CookieService.deleteCookie(this.REMEMBER_USER_COOKIE);
        
        if(typeof localStorage !== 'undefined') {
            localStorage.removeItem(this.LOCAL_STORAGE_KEY);
            sessionStorage.clear();
        }
    }

    public static getSessionId(): string | null {
        return CookieService.getValue(this.SESSION_COOKIE);
    }

    public static getUserInfo(): {
        userId: string;
        username: string;
        email: string
    } | null {
        const userCookie = CookieService.getValue(this.USER_COOKIE);
        if(userCookie) {
            try {
                return JSON.parse(userCookie);
            } catch(err) {
                console.error(err);
            }
        }
        return null;
    }

    public static checkSessionStatus(): {
        isValid: boolean;
        timeUntilExpiry: number;
        needsRefresh: boolean
    } {
        const sessionData = this.getCurrentSession();
        if(!sessionData) {
            return {
                isValid: false,
                timeUntilExpiry: 0,
                needsRefresh: false
            }
        }

        const timeUntilExpiry = sessionData.expiresAt - Date.now();
        const isValid = timeUntilExpiry > 0;
        const needsRefresh = timeUntilExpiry < 5 * 60 * 1000;

        return {
            isValid,
            timeUntilExpiry,
            needsRefresh
        }
    }
}

