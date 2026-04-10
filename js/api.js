// ── API SERVICE LAYER ──
// Sources: Binance (crypto), metals.live (gold/silver), open.er-api (forex),
//          frankfurter.app (ECB rates with change%), Open-Meteo (weather), rss2json (news)
//          Yahoo Finance via multiple CORS proxies (indices/stocks/commodities)

// ── CORS PROXIES (tried in order) ──
const PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://thingproxy.freeboard.io/fetch/',
  'https://corsproxy.io/?'
];
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

// ── CACHE (localStorage with Background Refresh) ──
function cached(key, ttl, fn) {
  const localKey = 'cv_' + key;
  const stored = localStorage.getItem(localKey);
  const now = Date.now();
  let staleData = null;

  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      staleData = parsed.data;
      // If fully fresh, return it.
      if (now - parsed.ts < ttl) {
        return Promise.resolve(staleData);
      }
    } catch {}
  }

  // Initiate background fetch to refresh cache
  const fetcher = fn().then(data => {
    // Only cache if we got actual data
    if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
       localStorage.setItem(localKey, JSON.stringify({ data, ts: Date.now() }));
    }
    return data;
  }).catch(() => staleData || null);

  // VEYA HİÇ BEKLEME! İlk yüklemede bile localStorage boşsa boş veri dön:
  if (staleData != null) return Promise.resolve(staleData);

  // Return race between fetcher and strict 2500ms timeout so UI NEVER blocks.
  return Promise.race([
    fetcher,
    new Promise(r => setTimeout(() => r(key.includes('[') || key.includes('news') ? [] : null), 2500))
  ]);
}
export function invalidateCache(key) { delete _cache[key]; }

// ── FETCH HELPERS ──
async function fetchJSON(url, opts = {}, ms = 2500) {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) { clearTimeout(tid); throw e; }
}

// Try multiple CORS proxies in parallel for fastest response under timeout
async function fetchProxied(url, ms = 2500) {
  const promises = PROXIES.map(proxy => {
    const encoded = proxy.includes('?') ? proxy + encodeURIComponent(url) : proxy + url;
    return fetchJSON(encoded, {}, ms);
  });
  try {
    return await Promise.any(promises);
  } catch (e) {
    throw new Error('All proxies failed for: ' + url);
  }
}

// ── BINANCE — fastest, free, CORS-enabled ──
export async function fetchBinanceTicker(symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT']) {
  return cached(`bin_${symbols.join('')}`, 8000, () =>
    fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`)
  );
}

export async function fetchBinanceKlines(symbol, interval = '1d', limit = 7) {
  return cached(`bink_${symbol}`, 300000, () =>
    fetchJSON(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`)
  );
}

// ── COINGECKO (Replaces CoinCap for speed) ──
export async function fetchCoinCapMarkets(limit = 50) {
  return cached('coingecko', 20000, async () => {
    try {
      const data = await fetchJSON(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1`, {}, 2500);
      return {
        data: data.map(c => ({
          symbol: c.symbol.toUpperCase(),
          priceUsd: c.current_price,
          changePercent24Hr: c.price_change_percentage_24h || 0
        }))
      };
    } catch {
      return { data: [] };
    }
  });
}

// ── FEAR & GREED ──
export async function fetchFearGreed() {
  return cached('fng', 60000, () => fetchJSON('https://api.alternative.me/fng/?limit=1'));
}

// ── FOREX — open.er-api primary + Frankfurter for change% ──
// Returns { base, date, rates:{...}, changes:{...} }
export async function fetchExchangeRates(base = 'USD') {
  return cached(`fx_${base}`, 60000, async () => {
    // Primary: open.er-api (faster, 170+ currencies, updated hourly)
    const erApi = await fetchJSON(`https://open.er-api.com/v6/latest/${base}`).catch(() => null);
    const rates = erApi?.rates || {};

    // Change %: Frankfurter date-range endpoint (yesterday .. today)
    let changes = {};
    try {
      const today    = new Date();
      const yesterday= new Date(today); yesterday.setDate(yesterday.getDate() - 1);
      const fmt = (d) => d.toISOString().slice(0,10);
      // Use date range: 2 days ago to today to guarantee we get 2 data points
      const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 3);
      const rangeUrl = `https://api.frankfurter.app/${fmt(twoDaysAgo)}..${fmt(today)}?from=${base}`;
      const rangeData = await fetchJSON(rangeUrl);
      const dates = Object.keys(rangeData.rates || {}).sort();
      if (dates.length >= 2) {
        const prev = rangeData.rates[dates[dates.length - 2]] || {};
        const curr = rangeData.rates[dates[dates.length - 1]] || {};
        Object.keys(curr).forEach(c => {
          if (prev[c]) changes[c] = ((curr[c] - prev[c]) / prev[c]) * 100;
        });
      }
    } catch { /* changes remains {} — non-critical */ }

    if (Object.keys(rates).length) return { rates, changes, base };
    // Fallback: Frankfurter only
    const frank = await fetchJSON(`https://api.frankfurter.app/latest?from=${base}`);
    return { rates: frank.rates || {}, changes: {}, base };
  });
}

// ── METALS — gold-api.com (free, CORS-enabled, no API key, real-time) ──
// Supports: XAU (Gold), XAG (Silver), XPT (Platinum), XPD (Palladium)
// Returns: { gold, silver, platinum, palladium } in USD per troy oz
export async function fetchMetals() {
  return cached('metals', 45000, async () => {
    // Try all metal endpoints in parallel with aggressive timeout (8s)
    const tryGoldApi = async () => {
      const [xau, xag, xpt, xpd] = await Promise.allSettled([
        fetchJSON('https://api.gold-api.com/price/XAU', {}, 2000),
        fetchJSON('https://api.gold-api.com/price/XAG', {}, 2000),
        fetchJSON('https://api.gold-api.com/price/XPT', {}, 2000),
        fetchJSON('https://api.gold-api.com/price/XPD', {}, 2000),
      ]);
      const r = {};
      if (xau.status === 'fulfilled' && xau.value?.price > 0) r.gold     = xau.value.price;
      if (xag.status === 'fulfilled' && xag.value?.price > 0) r.silver   = xag.value.price;
      if (xpt.status === 'fulfilled' && xpt.value?.price > 0) r.platinum  = xpt.value.price;
      if (xpd.status === 'fulfilled' && xpd.value?.price > 0) r.palladium = xpd.value.price;
      return r;
    };

    // Try gold-api.com (primary)
    try {
      const result = await tryGoldApi();
      if (result.gold) return result;
    } catch {}

    // Retry once after brief delay
    await new Promise(r => setTimeout(r, 500));
    try {
      const result = await tryGoldApi();
      if (result.gold) return result;
    } catch {}

    // Fallback: Yahoo Finance via proxy
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=GC%3DF,SI%3DF,PL%3DF,PA%3DF&fields=regularMarketPrice,regularMarketChangePercent`;
      const data = await fetchProxied(yahooUrl, 2500);
      const quotes = data?.quoteResponse?.result || [];
      const get = (sym) => quotes.find(q => q.symbol === sym)?.regularMarketPrice || null;
      return {
        gold: get('GC=F'),
        silver: get('SI=F'),
        platinum: get('PL=F'),
        palladium: get('PA=F'),
      };
    } catch {
      return {}; // All sources failed
    }
  });
}

// ── METALS CHANGE % — gold-api.com (no dedicated change endpoint, calc from price vs open) ──
export async function fetchMetalsChange() {
  return cached('metals_chg', 120000, async () => {
    // gold-api.com doesn't provide change%, so we use Yahoo Finance via proxy for this
    try {
      const yahooUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=GC%3DF,SI%3DF,PL%3DF,PA%3DF&fields=regularMarketPrice,regularMarketChangePercent`;
      const data = await fetchProxied(yahooUrl, 10000);
      const quotes = data?.quoteResponse?.result || [];
      const get = (sym) => quotes.find(q => q.symbol === sym)?.regularMarketChangePercent || null;
      return {
        gold:     get('GC=F'),
        silver:   get('SI=F'),
        platinum: get('PL=F'),
        palladium:get('PA=F'),
      };
    } catch {
      return {}; // Change % is non-critical, silence errors
    }
  });
}

// ── FOOTBALL (Super Lig: FB, GS, BJK) ──
const TEAMS = [
  { id: 436, name: 'Fenerbahçe', color: '#00008b', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/436.png' },
  { id: 432, name: 'Galatasaray', color: '#a32638', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/432.png' },
  { id: 1895, name: 'Beşiktaş', color: '#000000', logo: 'https://a.espncdn.com/i/teamlogos/soccer/500/1895.png' }
];

export async function fetchFootballMatches() {
  return cached('football_matches', 60000, async () => {
    try {
      const results = {};
      await Promise.all(TEAMS.map(async t => {
        const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/tur.1/teams/${t.id}/schedule`;
        const res = await fetchJSON(url, {}, 2500).catch(() => null);
        if (res && res.events) {
          const events = res.events.sort((a, b) => new Date(a.date) - new Date(b.date));
          const past = events.filter(e => e.competitions[0].status.type.state === 'post');
          const future = events.filter(e => e.competitions[0].status.type.state !== 'post');
          results[t.id] = {
            team: t,
            past: past.slice(-3),
            future: future.slice(0, 3)
          };
        }
      }));
      return results;
    } catch {
      return {};
    }
  });
}

// ── WEATHER — Open-Meteo (100% free, no key) ──
const WMO    = {0:'Açık',1:'Az Bulutlu',2:'Parçalı Bulutlu',3:'Bulutlu',45:'Sisli',48:'Buzlu Sis',51:'Hafif Çiseleme',53:'Çiseleme',55:'Yoğun Çiseleme',61:'Hafif Yağmur',63:'Yağmur',65:'Şiddetli Yağmur',71:'Hafif Kar',73:'Kar',75:'Yoğun Kar',80:'Sağanak',95:'Fırtına',96:'Fırtına+Dolu'};
const WMO_EN = {0:'Clear',1:'Mainly Clear',2:'Partly Cloudy',3:'Cloudy',45:'Foggy',48:'Icy Fog',51:'Light Drizzle',53:'Drizzle',55:'Heavy Drizzle',61:'Light Rain',63:'Rain',65:'Heavy Rain',71:'Light Snow',73:'Snow',75:'Heavy Snow',80:'Showers',95:'Thunderstorm',96:'Storm+Hail'};
const WMO_ICO= {0:'☀️',1:'🌤️',2:'⛅',3:'☁️',45:'🌫️',48:'🌫️',51:'🌦️',53:'🌧️',55:'🌧️',61:'🌦️',63:'🌧️',65:'🌧️',71:'🌨️',73:'❄️',75:'❄️',80:'🌦️',95:'⛈️',96:'⛈️'};

export const wmoDesc = (code, lang='tr') => (lang==='tr' ? WMO : WMO_EN)[code] || (lang==='tr'?'Bilinmiyor':'Unknown');
export const wmoIcon = (code) => WMO_ICO[code] || '🌡️';

const CITIES_TR = [
  {name:'İstanbul',nameEn:'Istanbul',  lat:41.01,lon:28.95},
  {name:'Ankara',  nameEn:'Ankara',    lat:39.93,lon:32.86},
  {name:'İzmir',   nameEn:'Izmir',     lat:38.42,lon:27.14},
  {name:'Antalya', nameEn:'Antalya',   lat:36.90,lon:30.70},
  {name:'Bursa',   nameEn:'Bursa',     lat:40.19,lon:29.06},
  {name:'Trabzon', nameEn:'Trabzon',   lat:41.00,lon:39.73},
];
const CITIES_WORLD = [
  {name:'New York',nameEn:'New York', lat:40.71,lon:-74.01,tz:'America/New_York'},
  {name:'Londra',  nameEn:'London',   lat:51.51,lon:-0.13, tz:'Europe/London'},
  {name:'Tokyo',   nameEn:'Tokyo',    lat:35.68,lon:139.69,tz:'Asia/Tokyo'},
  {name:'Berlin',  nameEn:'Berlin',   lat:52.52,lon:13.40, tz:'Europe/Berlin'},
  {name:'Dubai',   nameEn:'Dubai',    lat:25.20,lon:55.27, tz:'Asia/Dubai'},
  {name:'Şangay',  nameEn:'Shanghai', lat:31.23,lon:121.47,tz:'Asia/Shanghai'},
];

async function fetchWeatherCity(city) {
  const tz = city.tz || 'Europe/Istanbul';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&timezone=${tz}&wind_speed_unit=kmh`;
  return { ...city, weather: (await fetchJSON(url)).current };
}
export async function fetchWeatherTurkey() {
  return cached('wtTR',    300000, () => Promise.all(CITIES_TR.map(fetchWeatherCity)));
}
export async function fetchWeatherWorld() {
  return cached('wtWorld', 300000, () => Promise.all(CITIES_WORLD.map(fetchWeatherCity)));
}

// ── NEWS — CryptoCompare (100% Free, Fast) ──
export async function fetchNews() {
  return cached('crypto_news', 120000, async () => {
    try {
      const data = await fetchJSON('https://min-api.cryptocompare.com/data/v2/news/?lang=EN', {}, 2500);
      if (!data || !data.Data) return [];
      return data.Data.map(item => ({
        title: item.title,
        link: item.guid || item.url,
        pubDate: new Date(item.published_on * 1000).toISOString(),
        thumbnail: item.imageurl || '',
        source: item.source_info?.name || 'Kripto Finans',
        icon: '📰'
      })).slice(0, 16);
    } catch { return []; }
  });
}

// ── HELPERS ──
export function formatNum(n, decimals = 2) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}
export function formatCompact(n) {
  if (!n || isNaN(n)) return '—';
  n = Number(n);
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
  return '$' + formatNum(n);
}
export function changeClass(val) { return Number(val) > 0 ? 'up' : Number(val) < 0 ? 'down' : ''; }
export function changeStr(val, decimals = 2) {
  if (val === null || val === undefined || isNaN(val)) return '—';
  const n = Number(val);
  return (n > 0 ? '+' : '') + n.toFixed(decimals) + '%';
}
export function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return Math.floor(diff) + 's';
  if (diff < 3600)  return Math.floor(diff / 60) + 'm';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h';
  return Math.floor(diff / 86400) + 'd';
}
