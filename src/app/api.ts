
function getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('authToken');
    }
    return null;
}

function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

const api = {
    bancodebogota: async (signal?: AbortSignal) => {
        const result = {mid:0, image: null as string | null,time: ""};
       try {
           const response = await fetch('/api/getUsd', {
               signal,
               headers: getAuthHeaders()
           });
           const data = await response.json();
           if(data.usd){
               result.mid = Number(data.usd[0].split(':')[1].trim().replaceAll(',','.'))
               result.image = data?.image || null
               result.time = data?.fecha || ""
           }else{
               result.mid = 0
           }
           return result
           // eslint-disable-next-line @typescript-eslint/no-unused-vars
       }catch (e) {
            return result
       }
    },
    goldPriceScraping: async (signal?: AbortSignal) => {
        const result = { mid: 0 , image: null as string | null, time: ""};
        try {
            const response = await fetch('/api/getGoldApi', {
                signal,
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.price) {
                result.mid = data.price.replaceAll(',','');
                result.time = data.date;
            }
            return result;
        } catch (e) {
            console.error(e);
            return result;
        }
    },
    netData: async (signal?: AbortSignal) => {
        const result = { mid: 0, time: "",image:  null as string | null };
        try {
            const response = await fetch('/api/getNetData', {
                signal,
                headers: getAuthHeaders()
            });
            const data = await response.json();
            if (data.value) {
                result.mid = Number(data.value.replaceAll(',', ''));
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
            const response = await fetch('/api/getGoldExternal', {
                signal,
                headers: getAuthHeaders()
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
    }
}


export default api
