import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from './middleware';

const GOLD_API_URL = 'https://gold-api.santirev.com/api/gold';
const GOLD_API_KEY = process.env.GOLD_DATA_API_KEY ?? 'santi.dev';

interface GoldCache {
    xauCop: number | null;
    goldUsdOz: number | null;
    silverUsdOz: number | null;
    xagCopKg: number | null;
    fecha: string | null;
    ts: number;
}

let cache: GoldCache | null = null;
const TTL = 15_000;

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
            return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, silverUsdOz: cache.silverUsdOz, xagCopKg: cache.xagCopKg, fecha: cache.fecha });
        }

        const response = await fetch(GOLD_API_URL, {
            headers: { 'x-api-key': GOLD_API_KEY },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        cache = {
            xauCop: data.xauCop != null ? Number(data.xauCop) : null,
            goldUsdOz: data.goldUsdOz != null ? Number(data.goldUsdOz) : null,
            silverUsdOz: data.silverUsdOz != null ? Number(data.silverUsdOz) : null,
            xagCopKg: data.xagCopKg != null ? Number(data.xagCopKg) : null,
            fecha: data.fetchedAt ?? null,
            ts: Date.now(),
        };
        res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
        return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, silverUsdOz: cache.silverUsdOz, xagCopKg: cache.xagCopKg, fecha: cache.fecha });
    } catch (error) {
        console.error('Error fetching gold external:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=60');
            return res.status(200).json({ xauCop: cache.xauCop, goldUsdOz: cache.goldUsdOz, silverUsdOz: cache.silverUsdOz, xagCopKg: cache.xagCopKg, fecha: cache.fecha });
        }
        return res.status(503).json({ error: 'Service temporarily unavailable' });
    }
}

export default withAuth(handler);
