import type { NextApiRequest, NextApiResponse } from 'next';
import { fetchWithExternalAuth } from '@/lib/externalAuth';
import { withAuth } from './middleware';

const EXTERNAL_URL = 'https://goldsilver.fly.dev/api/getNetData';

interface ExternalCache {
    xauCop: number | null;
    goldUsdOz: number | null;
    fecha: string | null;
    silverUsdOz: string | null;
    xagCopKg: string | null;
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

        const response = await fetchWithExternalAuth(EXTERNAL_URL);

        if (!response.ok) throw new Error(`External API ${response.status}`);

        const data = await response.json();
        cache = {
            xauCop: data.xauCop === null || data.xauCop === undefined ? null : Number(data.xauCop),
            goldUsdOz: data.goldUsdOz === null || data.goldUsdOz === undefined ? null : Number(data.goldUsdOz),
            silverUsdOz: data.silverUsdOz === null || data.silverUsdOz === undefined ? null : Number(data.silverUsdOz),
            xagCopKg: data.xagCopKg === null || data.xagCopKg === undefined ? null : Number(data.xagCopKg),
            fecha: data.fecha ?? null,
            ts: Date.now()
        };
        res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
        return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, silverUsdOz: cache.silverUsdOz, xagCopKg: cache.xagCopKg, fecha: cache.fecha });

    } catch (error) {
        console.error('Error fetching external gold:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300');
            return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, fecha: cache.fecha,silverUsdOz: cache.silverUsdOz, xagCopKg: cache.xagCopKg });
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);
