// Consulta directa al backend central desde el navegador (sin pasar por
// pages/api): menos saltos y la app sigue viva aunque el server Next esté frío.
const GOLD_API = process.env.NEXT_PUBLIC_GOLD_API_URL ?? 'https://gold-api.santirev.com';
const GOLD_API_KEY = process.env.NEXT_PUBLIC_GOLD_API_KEY ?? 'santi.dev';

const apiHeaders = { 'x-api-key': GOLD_API_KEY };

const api = {
    bancodebogota: async (signal?: AbortSignal) => {
        const result = {mid:0, image: null as string | null,time: ""};
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 20000);
        const onAbort = () => controller.abort();
        signal?.addEventListener('abort', onAbort, { once: true });
        try {
            const response = await fetch(`${GOLD_API}/api/usd`, {
                signal: controller.signal,
                headers: apiHeaders,
            });
            const data = await response.json();
            if (typeof data.value === 'number' && data.value > 0) {
                result.mid = data.value;
            } else if (data.usd?.[0]) {
                result.mid = Number(data.usd[0].split(':')[1].trim().replaceAll(',','.'))
            }
            result.image = data?.image || null
            result.time = data?.fecha || ""
            return result
        } catch {
            return result
        } finally {
            clearTimeout(tid);
            signal?.removeEventListener('abort', onAbort);
        }
    },
    netData: async (signal?: AbortSignal) => {
        const result = { mid: 0, time: "",image:  null as string | null };
        try {
            const response = await fetch(`${GOLD_API}/api/netdania`, {
                signal,
                headers: apiHeaders,
            });
            const data = await response.json();
            if (data.value) {
                result.mid = Number(String(data.value).replaceAll(',', ''));
                result.time = data.fecha || "";
            }
            return result;
        } catch (e) {
            console.error(e);
            return result;
        }
    },
    goldExternal: async (signal?: AbortSignal) => {
        const result = { xauCop: 0, goldUsdOz: 0, fecha: "" };
        try {
            const response = await fetch(`${GOLD_API}/api/gold`, {
                signal,
                headers: apiHeaders,
            });
            const data = await response.json();
            result.xauCop = data.xauCop ? Number(data.xauCop) : 0;
            result.goldUsdOz = data.goldUsdOz ? Number(data.goldUsdOz) : 0;
            result.fecha = data.fecha || "";
            return result;
        } catch (e) {
            console.error(e);
            return result;
        }
    },
    config: async (app: string): Promise<{ purities?: string[]; enabled?: boolean } | null> => {
        try {
            const response = await fetch(`${GOLD_API}/api/config/${app}`);
            if (!response.ok) return null;
            return await response.json();
        } catch {
            return null;
        }
    },
}


export default api
