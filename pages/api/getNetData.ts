import type { NextApiRequest, NextApiResponse } from 'next';
import { withPage } from '@/lib/playwright';
import { fetchWithExternalAuth } from '@/lib/externalAuth';
import { withAuth } from './middleware';

const INFOGOLD_URL = 'https://info-gold.fly.dev/api/getNetData';

let cache: { value: string | null; fecha: string | null; ts: number } | null = null;
const TTL = 15_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }

        let value: string | null = null;
        let fecha: string | null = null;

        // 1. External info-gold API (primary)
        try {
            const extRes = await fetchWithExternalAuth(INFOGOLD_URL);
            if (extRes.ok) {
                const extData = await extRes.json();
                value = extData.value ?? null;
                fecha = extData.fecha ?? null;
            }
        } catch {
            // info-gold failed — fall back to Playwright
        }

        // 2. Playwright on m.netdania.com (fallback)
        if (!value) {
            try {
                const result = await withPage(async (page) => {
                    await page.goto('https://m.netdania.com/commodities/gold', {
                        waitUntil: 'domcontentloaded',
                        timeout: 10000
                    });
                    await page.waitForSelector('#recid-1-f6', { timeout: 5000 }).catch(() => null);
                    const v = await page.$eval('#recid-1-f6', (el) => el.textContent?.trim() || null).catch(() => null);
                    const f = await page.$eval('#recid-1-f17', (el) => el.textContent?.trim() || null).catch(() => null);
                    return { v, f };
                });
                value = result.v;
                fecha = result.f;
            } catch {
                // Playwright also failed
            }
        }

        cache = { value, fecha, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ value, fecha });

    } catch (error) {
        console.error('Error fetching NetData:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);
