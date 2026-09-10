import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const USD_API_URL = 'https://gold-data-api.fly.dev/api/usd';
const GOLD_API_KEY = process.env.GOLD_DATA_API_KEY ?? 'santi.dev';

let cache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null;
const TTL = 60_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha });
        }

        const response = await fetch(USD_API_URL, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const usd: string[] = data.usd ?? [];
        const image: string | null = data.image ?? null;
        const fecha: string | null = data.fecha ?? null;
        cache = { usd, image, fecha, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
        return res.status(200).json({ usd, image, fecha });
    } catch (error) {
        console.error('Error fetching USD:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha });
        }
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);
