interface Options {
    days?: number;
    path?: string;
    domain?: string;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}

export class CookieService {
    static set(name: string, value: string, options: Options): void {
        if(typeof document === 'undefined') return;

        const {
            days = 7,
            path = '/',
            domain = '',
            secure =
                process.env.NODE_ENV === 'production' ||
                process.env.NODE_ENV === 'development',
            sameSite = 'Strict'
        } = options;
        const expires = new Date(
            Date.now() + (days * 24 * 60 * 60 * 1000)
        ).toUTCString();

        let cookie = `
            ${name}=${encodeURIComponent(value)}; 
            expires=${expires}; 
            path=${path}
        `;
        if(domain) cookie += `; domain=${domain}`;
        if(secure) cookie += '; Secure';
        if(sameSite) cookie += `; SameSite=${sameSite}`;
        
        document.cookie = cookie;
    }
    
    /**
     * Get Value
     */
    static getValue(name: string): string | null {
        if(typeof document === 'undefined') return null;

        const cookies = document.cookie.split(';');
        for(let cookie of cookies) {
            const [cookieName, cookieVal] = cookie.trim().split('=');
            if(cookieName === name) return decodeURIComponent(cookieVal);
        }
        return null;
    }

    /**
     * Delete Cookie
     */
    static deleteCookie(
        name: string,
        path: string = '/',
        domain?: string
    ): void {
        if(typeof document === 'undefined') return;

        let cookie = `
            ${name}=; 
            expires=Thu, 01 Jan 1970 00:00:00 UTC; 
            path=${path}
        `;
        if(domain) cookie += `; domain=${domain}`;
        document.cookie = cookie;
    }
    
    /**
     * Has Cookie
     */
    static hasCookie(name: string): boolean {
        return this.getValue(name) != null;
    }
    
    /**
     * Get All Cookies
     */
    static getAllCookies(): Record<string, string> {
        const cookies: Record<string, string> = {};
        document.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=');
            if(name && value) cookies[name] = decodeURIComponent(value);
        });
        return cookies;
    }

    /**
     * Clear All Cookies
     */
    static clearAllCookies(): void {
        const cookies = this.getAllCookies();
        Object.keys(cookies).forEach(name => {
            this.deleteCookie(name);
        });
    }
}