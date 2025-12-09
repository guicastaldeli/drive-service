export class TimeStreamClient {
    private url: string | undefined;

    constructor(url: string | undefined) {
        this.url = url;
    }

    public async getTime(): Promise<any[]> {
        const res = await fetch(`${this.url}/api/time-stream`);
        if(!res.ok) throw new Error('Failed to fetch time!');
        return res.json();
    }
}