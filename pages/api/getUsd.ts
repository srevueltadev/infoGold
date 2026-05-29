import type { NextApiRequest, NextApiResponse } from 'next';
import { chromium } from 'playwright';
import { withAuth } from './middleware';

const EXTERNAL_TOKEN = process.env.GOLDSILVER_TOKEN ||
    'Bearer Z29sZGVuR3JvdXA6MTc4MDA4Mjg5NTczNjo0ZWM0ZjgyMWM4NTY4NjhjYjBhNGQxODI0MGQ4MWY3MTA1YjljMjlkOTdhNGZjYWI5MDExYzQ1YWEzOTI5YTAw';

let cache: { usd: string[]; image: string | null; fecha: string | null; ts: number } | null = null
const TTL = 60_000

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    try {
        if (cache && Date.now() - cache.ts < TTL) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha })
        }

        let usd: string[] = [];
        let image: string | null = null;
        let fecha: string | null = null;

        // Try Banco de Bogotá via Playwright
        try {
            const browser = await chromium.launch({ headless: true });
            const page = await browser.newPage();
            await page.goto('https://pbit.bancodebogota.com/Indicadores/Tirilla.aspx', {
                waitUntil: 'domcontentloaded',
                timeout: 15000
            });

            let selector = '#ctl00_MarPrinc > span:nth-child(3)';
            usd = await page.$$eval(selector, (elements) =>
                elements.map((e) => e.textContent?.trim() || '')
            );

            if (usd.length === 0) {
                selector = '#ctl00_MarPrinc > span:nth-child(2)';
                usd = await page.$$eval(selector, (elements) =>
                    elements.map((e) => e.textContent?.trim() || '')
                );
            }

            image = await page.$eval(`${selector} img`, (img) =>
                img.getAttribute('src') || null
            ).catch(() => null);

            fecha = await page.$eval('#ctl00_MarPrinc > span:nth-child(1)', (el) =>
                el.textContent?.trim() || null
            ).catch(() => null);

            await browser.close();
        } catch {
            // Playwright failed — will use external fallback
        }

        // Fallback: external goldsilver API
        if (usd.length === 0) {
            try {
                const extRes = await fetch('https://goldsilver.fly.dev/api/getUsd', {
                    headers: { 'Authorization': EXTERNAL_TOKEN }
                });
                if (extRes.ok) {
                    const extData = await extRes.json();
                    if (extData.usd?.length) {
                        usd = extData.usd;
                        image = extData.image ?? null;
                        fecha = extData.fecha ?? null;
                    }
                }
            } catch {
                // External also failed — return cache or error below
            }
        }

        if (usd.length > 0) {
            cache = { usd, image, fecha, ts: Date.now() }
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd, image, fecha });
        }

        // Both sources failed
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha })
        }
        return res.status(500).json({ error: 'Internal Server Error' });

    } catch (error) {
        console.error('Error fetching USD:', error);
        if (cache) {
            res.setHeader('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=300')
            return res.status(200).json({ usd: cache.usd, image: cache.image, fecha: cache.fecha })
        }
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}

export default withAuth(handler);
