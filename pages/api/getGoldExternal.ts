import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const EXTERNAL_URL = 'https://goldsilver.fly.dev/api/getNetData';
const EXTERNAL_TOKEN = process.env.GOLDSILVER_TOKEN ||
    'Bearer Z29sZGVuR3JvdXA6MTc4MDA4Mjg5NTczNjo0ZWM0ZjgyMWM4NTY4NjhjYjBhNGQxODI0MGQ4MWY3MTA1YjljMjlkOTdhNGZjYWI5MDExYzQ1YWEzOTI5YTAw';

interface ExternalCache {
    xauCop: number | null;
    goldUsdOz: number | null;
    fecha: string | null;
    ts: number;
}

let cache: ExternalCache | null = null;
const TTL = 60_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, fecha: cache.fecha });
        }

        const response = await fetch(EXTERNAL_URL, {
            headers: { 'Authorization': EXTERNAL_TOKEN }
        });

        if (!response.ok) throw new Error(`External API ${response.status}`);

        const data = await response.json();
        cache = {
            xauCop: data.xauCop === null || data.xauCop === undefined ? null : Number(data.xauCop),
            goldUsdOz: data.goldUsdOz === null || data.goldUsdOz === undefined ? null : Number(data.goldUsdOz),
            fecha: data.fecha ?? null,
            ts: Date.now()
        };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, fecha: cache.fecha });

    } catch (error) {
        console.error('Error fetching external gold:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, fecha: cache.fecha });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);
