import { chromium, Browser, Page } from 'playwright';

let browserPromise: Promise<Browser> | null = null;
let mutex: Promise<unknown> = Promise.resolve();

async function getBrowser(): Promise<Browser> {
    const existing = browserPromise;
    if (existing) {
        const browser = await existing;
        if (browser.isConnected()) return browser;
    }
    browserPromise = chromium.launch({ headless: true });
    return browserPromise;
}

export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    const run = async (): Promise<T> => {
        const browser = await getBrowser();
        const context = await browser.newContext();
        try {
            const page = await context.newPage();
            return await fn(page);
        } finally {
            await context.close().catch(() => {});
        }
    };

    const next = mutex.then(run, run);
    mutex = next.catch(() => {});
    return next;
}
