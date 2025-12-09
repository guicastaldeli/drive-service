export class UserServiceClient {
    private url: string | undefined;
    
    constructor(url: string | undefined) {
        this.url = url;
    }

    /*
    ** Check User Exists
    */
    public async checkUserExists(email: string): Promise<boolean> {
        const res = await fetch(`${this.url}/api/users/email/${email}`);
        const data = await res.json();
        return data.exists || false;
    }

    /*
    ** Check Username Exists
    */
    public async checkUsernameExists(username: string): Promise<boolean> {
        const res = await fetch(`${this.url}/api/users/username/${username}`);
        const data = await res.json();
        return data.exists || false;
    }
}