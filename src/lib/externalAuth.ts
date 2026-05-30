type Credentials = { username: string; password: string };

const CREDENTIALS: Record<string, Credentials> = {
    'info-gold.fly.dev': { username: 'infoGold', password: 'Qweas123*/' },
    'goldsilver.fly.dev': { username: 'goldenGroup', password: 'Qweas123*/' },
};

const ENV_TOKEN: Record<string, string | undefined> = {
    'info-gold.fly.dev': process.env.INFOGOLD_TOKEN,
    'goldsilver.fly.dev': process.env.GOLDSILVER_TOKEN,
};

const DEFAULT_TOKEN: Record<string, string> = {
    'info-gold.fly.dev': 'Bearer aW5mb0dvbGQ6MTc4MDA5NzM1NTQ0MzoyYTRmMGMzMzlhMzE4MmM1NWE1ZjJlZGMwODBmZGM4MWMyOTBhNDkwNzRiYzBkYzMyNjYwN2Q2NTJiNmRmMmQ5',
    'goldsilver.fly.dev': 'Bearer Z29sZGVuR3JvdXA6MTc4MDA4Mjg5NTczNjo0ZWM0ZjgyMWM4NTY4NjhjYjBhNGQxODI0MGQ4MWY3MTA1YjljMjlkOTdhNGZjYWI5MDExYzQ1YWEzOTI5YTAw',
};

const tokenCache: Record<string, string> = {};

function stripBearer(t: string): string {
    return t.startsWith('Bearer ') ? t.slice(7) : t;
}

function currentToken(host: string): string {
    const cached = tokenCache[host];
    if (cached) return cached;
    const env = ENV_TOKEN[host];
    if (env) return stripBearer(env);
    const def = DEFAULT_TOKEN[host];
    if (def) return stripBearer(def);
    return '';
}

async function loginExternal(host: string): Promise<string | null> {
    const creds = CREDENTIALS[host];
    if (!creds) return null;
    try {
        const res = await fetch(`https://${host}/api/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(creds),
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (data?.success && typeof data.token === 'string') {
            tokenCache[host] = data.token;
            return data.token;
        }
    } catch {
        // login failed
    }
    return null;
}

export async function fetchWithExternalAuth(
    url: string,
    init: RequestInit = {},
    timeoutMs = 5000
): Promise<Response> {
    const host = new URL(url).host;
    const baseHeaders = (init.headers as Record<string, string>) ?? {};

    const doFetch = (token: string) =>
        fetch(url, {
            ...init,
            headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
            signal: init.signal ?? AbortSignal.timeout(timeoutMs),
        });

    let res = await doFetch(currentToken(host));
    if (res.status === 401 || res.status === 403) {
        const newToken = await loginExternal(host);
        if (newToken) {
            res = await doFetch(newToken);
        }
    }
    return res;
}
