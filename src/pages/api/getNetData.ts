import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const NETDANIA_URL = 'https://gold-data-api.fly.dev/api/netdania';
const GOLD_API_KEY = process.env.GOLD_DATA_API_KEY ?? 'santi.dev';

let cache: { value: string | null; fecha: string | null; ts: number } | null = null;
const TTL = 15_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }

        const response = await fetch(NETDANIA_URL, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        cache = { value: data.value ?? null, fecha: data.fecha ?? null, ts: Date.now() };
        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
        return res.status(200).json({ value: cache.value, fecha: cache.fecha });
    } catch (error) {
        console.error('Error fetching netdania:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
            return res.status(200).json({ value: cache.value, fecha: cache.fecha });
        }
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);
