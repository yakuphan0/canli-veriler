const CACHE_TTL = {
  crypto: 10000,
  forex: 60000,
  weather: 300000,
  football: 300000,
  news: 600000
};

const _cache = {};

// ── FETCH HELPER ──
async function fetchJSON(url, options = {}, timeout = 15000) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { 
      ...options,
      signal: ctrl.signal 
    });
    clearTimeout(id);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function cached(key, ttl, fn) {
  const now = Date.now();
  if (_cache[key] && now - _cache[key].ts < ttl) {
    return _cache[key].data;
  }
  const data = await fn();
  if (data !== null) {
      _cache[key] = { data, ts: now };
  }
  return data;
}

export const ApiService = {
  fetchCrypto: async (symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT']) => {
    return cached('crypto', CACHE_TTL.crypto, () =>
      fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`)
    );
  },

  fetchForex: async (base = 'USD') => {
    return cached(`fx_${base}`, CACHE_TTL.forex, async () => {
      const res = await fetchJSON(`https://open.er-api.com/v6/latest/${base}`);
      return res.rates || {};
    });
  },

  fetchMetals: async () => {
    return cached('metals', CACHE_TTL.forex, async () => {
      const [xau, xag] = await Promise.allSettled([
        fetchJSON('https://api.gold-api.com/price/XAU'),
        fetchJSON('https://api.gold-api.com/price/XAG')
      ]);
      return {
        gold: xau.status === 'fulfilled' ? xau.value.price : null,
        silver: xag.status === 'fulfilled' ? xag.value.price : null
      };
    });
  },

  fetchWeather: async (lat, lon) => {
    return cached(`weather_${lat}_${lon}`, CACHE_TTL.weather, async () => {
      // Open-Meteo has CORS enabled, no proxy needed!
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetchJSON(url);
      return { temp: res.current.temperature_2m, code: res.current.weather_code };
    });
  },

  // ── FOOTBALL (Local Proxy Server) ──
  fetchFootballStandings: async () => {
    return cached('football_standings_backend', CACHE_TTL.football, async () => {
      try {
        return await fetchJSON('/api/football/standings');
      } catch (e) {
        console.warn('Backend Football Standings Error:', e);
        return null;
      }
    });
  },

  fetchFootballFixtures: async () => {
    return cached('football_fixtures_backend', CACHE_TTL.football, async () => {
      try {
        return await fetchJSON('/api/football/fixtures');
      } catch (e) {
        console.warn('Backend Football Fixtures Error:', e);
        return [];
      }
    });
  },

  // ── NEWS (RSS to JSON) ──
  fetchNews: async () => {
    return cached('news_list_v2', CACHE_TTL.news, async () => {
      const RSS_FEEDS = [
        'https://www.bloomberght.com/rss',
        'https://www.hurriyet.com.tr/rss/ekonomi'
      ];
      const results = await Promise.all(RSS_FEEDS.map(async feed => {
        try {
          const res = await fetchJSON(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed)}`);
          return res.items || [];
        } catch { return []; }
      }));
      return results.flat().sort((a,b) => new Date(b.pubDate) - new Date(a.pubDate));
    });
  },

  // ── BIST 100 (Local Proxy Server) ──
  fetchBIST: async () => {
    return cached('bist_100_backend', CACHE_TTL.forex, async () => {
      try {
        return await fetchJSON('/api/bist');
      } catch (e) {
        console.warn('Backend BIST 100 Error:', e);
        return null;
      }
    });
  }
};

export const formatNum = (n, dec = 2) => {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
};
