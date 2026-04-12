(function() {
  "use strict";

  // ── TRANSLATIONS (i18n) ──
  const TRANSLATIONS = {
    tr: {
      appName: 'Canlı Veriler', appSub: 'Anlık Piyasa Takibi', liveLabel: 'CANLI', lastUpdate: 'Son güncelleme', loading: 'Yükleniyor...', error: 'Veri yüklenemedi', retry: 'Tekrar Dene', noData: 'Veri bulunamadı',
      navHome: 'Ana Sayfa', navCrypto: 'Kripto Para', navForex: 'Döviz & Emtia', navWeather: 'Hava Durumu',
      homeTitle: 'Piyasa Özeti', homeDesc: 'Türkiye ve global piyasalardaki anlık verilerin genel görünümü.',
      cryptoTitle: 'Kripto Para Piyasası', cryptoDesc: 'Bitcoin, Ethereum ve yüzlerce altcoin için anlık fiyat, hacim ve piyasa değeri.',
      forexTitle: 'Döviz & Emtia', forexDesc: 'USD/TRY, EUR/TRY, altın, gümüş, petrol ve tüm emtia fiyatları anlık.',
      weatherTitle: 'Hava Durumu', weatherDesc: 'Türkiye şehirleri ve dünya genelinde anlık hava durumu verileri.',
      currencies: 'Döviz Kurları', metals: 'Değerli Metaller', turkishCities: 'Türkiye Şehirleri', worldCities: 'Dünya Şehirleri', name: 'İsim', price: 'Fiyat'
    },
    en: {
      appName: 'Live Data', appSub: 'Real-Time Market Tracker', liveLabel: 'LIVE', lastUpdate: 'Last updated', loading: 'Loading...', error: 'Failed to load data', retry: 'Try Again', noData: 'No data available',
      navHome: 'Dashboard', navCrypto: 'Cryptocurrency', navForex: 'Forex & Commodities', navWeather: 'Weather',
      homeTitle: 'Market Overview', homeDesc: 'A real-time snapshot of global and Turkey markets.',
      cryptoTitle: 'Cryptocurrency Market', cryptoDesc: 'Real-time price, volume and market cap for Bitcoin, Ethereum and altcoins.',
      forexTitle: 'Forex & Commodities', forexDesc: 'USD/TRY, EUR/TRY, gold, silver and all commodity prices live.',
      weatherTitle: 'Weather', weatherDesc: 'Real-time weather data for cities across Turkey and the world.',
      currencies: 'Exchange Rates', metals: 'Precious Metals', turkishCities: 'Turkish Cities', worldCities: 'World Cities', name: 'Name', price: 'Price'
    }
  };

  let currentLang = localStorage.getItem('lang') || 'tr';
  function t(key) {
    const dict = TRANSLATIONS[currentLang] || TRANSLATIONS['tr'];
    return dict[key] || TRANSLATIONS['tr'][key] || key;
  }
  function getLang() { return currentLang; }
  function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (el.tagName === 'INPUT') el.placeholder = t(key);
      else el.textContent = t(key);
    });
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.lang === lang));
    document.documentElement.lang = lang === 'tr' ? 'tr' : 'en';
  }

  // ── API SERVICE ──
  const _cache = {};
  async function fetchJSON(url, opts = {}, ms = 5000) {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), ms);
    try {
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(tid);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) { clearTimeout(tid); throw e; }
  }

  function cached(key, ttl, fn) {
    const localKey = 'cv_' + key;
    const stored = localStorage.getItem(localKey);
    const now = Date.now();
    let staleData = null;
    if (stored) { try { const parsed = JSON.parse(stored); staleData = parsed.data; if (now - parsed.ts < ttl) return Promise.resolve(staleData); } catch {} }
    const fetcher = fn().then(data => {
      if (data && (Array.isArray(data) ? data.length > 0 : Object.keys(data).length > 0)) {
         localStorage.setItem(localKey, JSON.stringify({ data, ts: Date.now() }));
      }
      return data;
    }).catch(() => staleData || null);
    if (staleData != null) return Promise.resolve(staleData);
    return Promise.race([fetcher, new Promise(r => setTimeout(() => r(null), 5000))]);
  }

  async function fetchBinanceTicker(symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT']) {
    return cached(`bin_${symbols.join('')}`, 8000, () => fetchJSON(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`));
  }
  async function fetchExchangeRates(base = 'USD') {
    return cached(`fx_${base}`, 60000, async () => {
      const erApi = await fetchJSON(`https://open.er-api.com/v6/latest/${base}`).catch(() => null);
      return { rates: erApi?.rates || {}, base };
    });
  }
  async function fetchMetals() {
    return cached('metals', 45000, async () => {
      try {
        const [xau, xag] = await Promise.allSettled([ fetchJSON('https://api.gold-api.com/price/XAU',{},2500), fetchJSON('https://api.gold-api.com/price/XAG',{},2500) ]);
        const r = {};
        if (xau.status === 'fulfilled') r.gold = xau.value.price;
        if (xag.status === 'fulfilled') r.silver = xag.value.price;
        return r;
      } catch { return {}; }
    });
  }
  async function fetchWeatherTurkey() {
    const CITIES = [{name:'İstanbul',nameEn:'Istanbul',lat:41.01,lon:28.95}, {name:'Ankara',nameEn:'Ankara',lat:39.93,lon:32.86}];
    return cached('wtTR', 300000, () => Promise.all(CITIES.map(async c => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code&timezone=auto`;
      const res = await fetchJSON(url);
      return { ...c, weather: res.current };
    })));
  }

  // ── HELPERS ──
  function formatNum(n, decimals = 2) { if (n == null || isNaN(n)) return '—'; return Number(n).toLocaleString('tr-TR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }); }
  function changeClass(val) { return Number(val) > 0 ? 'up' : Number(val) < 0 ? 'down' : ''; }
  function changeStr(val) { if (val == null || isNaN(val)) return '—'; const n = Number(val); return (n > 0 ? '+' : '') + n.toFixed(2) + '%'; }
  function wmoDesc(code, lang='tr') { const W={0:'Açık',1:'Az Bulutlu',2:'Parçalı Bulutlu',3:'Bulutlu'}; return W[code] || 'Güneşli'; }

  // ── APP LOGIC ──
  const PAGES = {
    home:    { titleKey:'navHome',   render: renderHome },
    crypto:  { titleKey:'navCrypto', render: renderCrypto },
    forex:   { titleKey:'navForex',  render: renderForex },
    weather: { titleKey:'navWeather',render: renderWeather },
  };

  let currentPage = 'home';
  function startApp() {
    console.log("App Starting (Robust Mode)...");
    document.querySelectorAll('.lang-btn').forEach(btn => btn.addEventListener('click', () => { setLang(btn.dataset.lang); navigateTo(currentPage); }));
    document.querySelectorAll('.nav-item').forEach(item => item.addEventListener('click', () => navigateTo(item.dataset.page)));
    navigateTo('home');
  }

  async function navigateTo(pageId) {
    if (!PAGES[pageId]) pageId = 'home';
    currentPage = pageId;
    document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === pageId));
    const titleEl = document.getElementById('pageTitleText');
    if (titleEl) titleEl.textContent = t(PAGES[pageId].titleKey);
    const content = document.getElementById('pageContent');
    if (content) PAGES[pageId].render(content);
  }

  async function renderHome(container) {
    container.innerHTML = '<div class="loading">...</div>';
    const [bin, fx, met] = await Promise.allSettled([fetchBinanceTicker(['BTCUSDT']), fetchExchangeRates('USD'), fetchMetals()]);
    const btcPrice = bin.status === 'fulfilled' ? bin.value?.[0]?.lastPrice : null;
    const usdTry = fx.status === 'fulfilled' ? fx.value?.rates?.TRY : null;
    const gold = met.status === 'fulfilled' ? met.value?.gold : null;

    container.innerHTML = `
      <div class="grid-4">
        <div class="stat-card"><b>BTC/USD:</b> $${formatNum(btcPrice, 0)}</div>
        <div class="stat-card"><b>USD/TRY:</b> ₺${formatNum(usdTry, 2)}</div>
        <div class="stat-card"><b>Altın:</b> $${formatNum(gold, 2)}</div>
      </div>
      <div class="grid-4 mt-20" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">
        <div class="card" onclick="window.navigateTo('crypto')">🚀 Kripto</div>
        <div class="card" onclick="window.navigateTo('forex')">💱 Döviz</div>
        <div class="card" onclick="window.navigateTo('weather')">🌤️ Hava Durumu</div>
      </div>
    `;
  }

  async function renderCrypto(container) {
    container.innerHTML = '<div class="loading">...</div>';
    const tickers = await fetchBinanceTicker(['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT']);
    container.innerHTML = `
      <div class="card">
        <table class="data-table">
          <thead><tr><th>Simge</th><th>Fiyat</th><th>24sa %</th></tr></thead>
          <tbody>
            ${(tickers||[]).map(t => `<tr><td>${t.symbol.replace('USDT','')}</td><td>$${formatNum(t.lastPrice)}</td><td class="${changeClass(t.priceChangePercent)}">${changeStr(t.priceChangePercent)}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async function renderForex(container) {
    container.innerHTML = '<div class="loading">...</div>';
    const fx = await fetchExchangeRates('TRY');
    const rates = fx?.rates || {};
    container.innerHTML = `
      <div class="grid-4">
        <div class="stat-card"><b>USD/TRY:</b> ₺${formatNum(1/rates.USD, 2)}</div>
        <div class="stat-card"><b>EUR/TRY:</b> ₺${formatNum(1/rates.EUR, 2)}</div>
      </div>
    `;
  }

  async function renderWeather(container) {
    container.innerHTML = '<div class="loading">...</div>';
    const cities = await fetchWeatherTurkey();
    container.innerHTML = `
      <div class="grid-3">
        ${(cities||[]).map(c => `<div class="weather-card"><b>${c.name}:</b> ${Math.round(c.weather.temperature_2m)}°C - ${wmoDesc(c.weather.weather_code)}</div>`).join('')}
      </div>
    `;
  }

  window.navigateTo = navigateTo;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startApp); else startApp();

})();
