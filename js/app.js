import { renderCrypto } from './categories/crypto.js';
import { renderForex } from './categories/forex.js';
import { renderWeather } from './categories/weather.js';
import { renderNews } from './categories/news.js';
import { renderFootball } from './categories/football.js';
import {
  fetchBinanceTicker, fetchExchangeRates, fetchMetals, fetchMetalsChange, fetchFootballMatches,
  formatNum, changeStr, changeClass
} from './api.js';
import { t, setLang, getLang } from './i18n.js';

const PAGES = {
  home:    { titleKey:'navHome',   descKey:'homeDesc',   seoKey:'homeSeo',    render: renderHome },
  crypto:  { titleKey:'navCrypto', descKey:'cryptoDesc', seoKey:'cryptoSeo',  render: renderCrypto  },
  football:{ titleKey:'navFootball',descKey:'footballDesc',seoKey:'footballTitle',render: renderFootball },
  forex:   { titleKey:'navForex',  descKey:'forexDesc',  seoKey:'forexTitle', render: renderForex   },
  weather: { titleKey:'navWeather',descKey:'weatherDesc',seoKey:'weatherTitle',render:renderWeather },
  news:    { titleKey:'navNews',   descKey:'newsDesc',   seoKey:'newsTitle',  render: renderNews    },
};

let currentPage = 'home';
let autoRefreshTimers = {};

const BINANCE_SYMBOLS = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT'];

// ── BINANCE WEBSOCKET — real-time crypto ticker (no rate limits) ──
let _ws = null;
const _wsData = {};

function initBinanceWS() {
  const streams = BINANCE_SYMBOLS.map(s => `${s.toLowerCase()}@miniTicker`).join('/');
  try {
    _ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
    _ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        const d = msg.data;
        if (d) {
          _wsData[d.s] = {
            symbol: d.s,
            lastPrice: d.c,
            priceChangePercent: (((parseFloat(d.c) - parseFloat(d.o)) / parseFloat(d.o)) * 100).toFixed(2),
            volume: d.v,
            quoteVolume: d.q,
          };
        }
      } catch {}
    };
    _ws.onclose = () => { setTimeout(initBinanceWS, 3000); };
    _ws.onerror = () => { _ws.close(); };
  } catch {}
}

// Get WS data or fall back to REST
async function getBinanceTickers(symbols) {
  const wsAvailable = symbols.every(s => _wsData[s]);
  if (wsAvailable) return symbols.map(s => _wsData[s]);
  return fetchBinanceTicker(symbols);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  // Language buttons
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === btn.dataset.lang));
      rerenderCurrentPage();
    });
  });

  // Navigation
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });

  // Mobile menu
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
  });

  // Start Binance WebSocket for real-time prices
  initBinanceWS();

  // Ticker: initial + fast polling (WS updates are instant, poll REST as backup)
  initTicker();
  setInterval(initTicker, 10000);

  const hash = location.hash.replace('#','');
  navigateTo(PAGES[hash] ? hash : 'home');
});

// ── NAVIGATION ──
function navigateTo(pageId) {
  if (!PAGES[pageId]) pageId = 'home';
  currentPage = pageId;
  location.hash = pageId;

  document.querySelectorAll('.nav-item').forEach(el =>
    el.classList.toggle('active', el.dataset.page === pageId)
  );

  const page = PAGES[pageId];
  const titleEl = document.getElementById('pageTitleText');
  const descEl  = document.getElementById('pageDesc');
  if (titleEl) titleEl.textContent = t(page.titleKey);
  if (descEl)  descEl.textContent  = t(page.descKey);
  document.title = `${t(page.seoKey)} | Canlı Veriler`;

  document.querySelector('.sidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('open');

  const content = document.getElementById('pageContent');
  if (!content) return;
  clearTimers();
  content.innerHTML = '';
  page.render(content);
  setupAutoRefresh(pageId, page, content);
  window.scrollTo(0, 0);
  updateLastUpdate();
}

function rerenderCurrentPage() { navigateTo(currentPage); }
function clearTimers() { Object.values(autoRefreshTimers).forEach(clearInterval); autoRefreshTimers = {}; }

function setupAutoRefresh(id, page, content) {
  // Refresh intervals per page type
  const ms = {
    home:    10000,   // 10s — forex + metals + crypto
    crypto:  8000,    // 8s  — Binance REST refresh
    football:60000,   // 60s — matches
    forex:   60000,   // 60s — exchange rates
    weather: 300000,  // 5min — weather
    news:    300000,  // 5min — news
  }[id];
  if (!ms) return;
  autoRefreshTimers[id] = setInterval(() => { page.render(content); updateLastUpdate(); }, ms);
}

function updateLastUpdate() {
  const str = new Date().toLocaleTimeString(getLang() === 'tr' ? 'tr-TR' : 'en-US');
  document.querySelectorAll('#lastUpdate').forEach(el => el.textContent = str);
}

// ── HOME PAGE ──
async function renderHome(container) {
  const lang = getLang();
  container.innerHTML = homeSkeleton();

  const [fxRes, metalsRes, metalsChgRes, binanceRes] = await Promise.allSettled([
    fetchExchangeRates('USD'),
    fetchMetals(),
    fetchMetalsChange(),
    getBinanceTickers(BINANCE_SYMBOLS),
  ]);

  const fx        = fxRes.status      === 'fulfilled' ? fxRes.value       : null;
  const metals    = metalsRes.status  === 'fulfilled' ? metalsRes.value   : {};
  const metalsChg = metalsChgRes.status === 'fulfilled' ? metalsChgRes.value : {};
  const binance   = binanceRes.status === 'fulfilled' ? binanceRes.value  : [];

  const rates   = fx?.rates   || {};
  const changes = fx?.changes || {};
  const usdTry  = rates.TRY  || null;
  const eurTry  = rates.EUR  && usdTry ? (1 / rates.EUR) * usdTry  : null;
  const gbpTry  = rates.GBP  && usdTry ? (1 / rates.GBP) * usdTry  : null;

  // Metals from metals.live (direct object)
  const goldOz    = metals.gold     || null;
  const silverOz  = metals.silver   || null;
  const goldGram  = goldOz   && usdTry ? (goldOz   / 31.1035) * usdTry : null;
  const silverGram= silverOz && usdTry ? (silverOz / 31.1035) * usdTry : null;
  const goldChg   = metalsChg.gold   || null;
  const silverChg = metalsChg.silver || null;



  // Crypto from Binance
  const binArr = Array.isArray(binance) ? binance : [];
  const getBin = (sym) => binArr.find(t => t.symbol === sym);
  const btcT = getBin('BTCUSDT');
  const ethT = getBin('ETHUSDT');

  const btcUsd = btcT ? parseFloat(btcT.lastPrice) : null;
  const ethUsd = ethT ? parseFloat(ethT.lastPrice) : null;
  const btcTry = btcUsd && usdTry ? btcUsd * usdTry : null;
  const ethTry = ethUsd && usdTry ? ethUsd * usdTry : null;
  const btcChg = btcT ? parseFloat(btcT.priceChangePercent) : null;
  const ethChg = ethT ? parseFloat(ethT.priceChangePercent) : null;

    const solT = getBin('SOLUSDT');
    const solUsd = solT ? parseFloat(solT.lastPrice) : null;
    const solTry = solUsd && usdTry ? solUsd * usdTry : null;
    const solChg = solT ? parseFloat(solT.priceChangePercent) : null;

  // Build hero cards
  const cards = [
    { icon:'💵', label:lang==='tr'?'Dolar / TL':'USD / TRY',            main: usdTry    ? '₺'+formatNum(usdTry,4)     : '—', sub:null,                                          chg: changes.TRY || null,  color:'#22d3ee' },
    { icon:'💶', label:lang==='tr'?'Euro / TL':'EUR / TRY',             main: eurTry    ? '₺'+formatNum(eurTry,4)     : '—', sub:null,                                          chg: null,                 color:'#818cf8' },
    { icon:'💷', label:lang==='tr'?'Sterlin / TL':'GBP / TRY',         main: gbpTry    ? '₺'+formatNum(gbpTry,4)     : '—', sub:null,                                          chg: null,                 color:'#c084fc' },
    { icon:'🥇', label:lang==='tr'?'Gram Altın':'Gold Gram',            main: goldGram  ? '₺'+formatNum(goldGram,2)   : '—', sub:goldOz?('$'+formatNum(goldOz,2)+' /oz'):null,  chg: goldChg,              color:'#fbbf24' },
    { icon:'🥈', label:lang==='tr'?'Gram Gümüş':'Silver Gram',         main: silverGram? '₺'+formatNum(silverGram,3) : '—', sub:silverOz?('$'+formatNum(silverOz,3)+'/oz'):null,chg: silverChg,            color:'#94a3b8' },
    { icon:'₿',  label:lang==='tr'?'Bitcoin / TL':'Bitcoin / TRY',     main: btcTry    ? '₺'+formatNum(btcTry,0)     : '—', sub:btcUsd?('$'+formatNum(btcUsd,0)):null,         chg: btcChg,               color:'#f59e0b' },
    { icon:'Ξ',  label:lang==='tr'?'Ethereum / TL':'Ethereum / TRY',   main: ethTry    ? '₺'+formatNum(ethTry,0)     : '—', sub:ethUsd?('$'+formatNum(ethUsd,2)):null,         chg: ethChg,               color:'#8b5cf6' },
    { icon:'SOL',label:lang==='tr'?'Solana / TL':'Solana / TRY',       main: solTry    ? '₺'+formatNum(solTry,0)     : '—', sub:solUsd?('$'+formatNum(solUsd,2)):null,         chg: solChg,               color:'#14F195' },
  ];

  container.innerHTML = `
    <div style="margin-bottom:10px;display:flex;align-items:center;gap:10px">
      <span style="font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;color:var(--text-muted)">${lang==='tr'?'ANLIK PİYASA VERİLERİ':'REAL-TIME MARKET DATA'}</span>
      <span class="live-badge"><span class="live-dot"></span>${lang==='tr'?'CANLI':'LIVE'}</span>
    </div>

    <div class="grid-4 mb-22">
      ${cards.map(heroCard).join('')}
    </div>

    <div class="section-title">${lang==='tr'?'📌 Kategoriler':'📌 Categories'}</div>
    <div class="grid-4 mb-22" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
      ${catCard('crypto','💹',lang==='tr'?'Kripto Para':'Cryptocurrency',lang==='tr'?'Bitcoin, Ethereum, 30+ coin':'Bitcoin, Ethereum & 30+ coins','#00d4ff')}
      ${catCard('football','⚽',lang==='tr'?'Futbol':'Football',lang==='tr'?'3 Büyükler, Fikstür ve Skorlar':'Super Lig, Scores & Schedules','#10b981')}
      ${catCard('forex','💱',lang==='tr'?'Döviz & Emtia':'Forex & Gold',lang==='tr'?'Tüm dövizler, altın, gümüş':'Currencies, gold, silver','#f59e0b')}
      ${catCard('news','📰',lang==='tr'?'Haberler':'News',lang==='tr'?'Kripto ve finans haberleri':'Crypto & finance news','#ec4899')}
      ${catCard('weather','🌡️',lang==='tr'?'Hava Durumu':'Weather',lang==='tr'?'Türkiye ve dünya şehirleri':'Turkey & world cities','#22d3ee')}
    </div>

    <div class="seo-section">
      <h2>${t('homeH2')}</h2>
      <p>${t('homeP1')}</p>
      <p>${t('homeP2')}</p>
      <h3>${lang==='tr'?'Takip Edebileceğiniz Veriler:':'Data You Can Track:'}</h3>
      <ul>
        <li>${lang==='tr'?'Dolar/TL, Euro/TL, Sterlin/TL anlık kur':'USD/TRY, EUR/TRY, GBP/TRY live rates'}</li>
        <li>${lang==='tr'?'Gram altın ve ons altın TL fiyatı':'Gold gram and troy ounce TRY price'}</li>
        <li>${lang==='tr'?'Gram gümüş TL fiyatı':'Silver gram TRY price'}</li>
        <li>${lang==='tr'?'Brent ve WTI ham petrol fiyatları':'Brent and WTI crude oil prices'}</li>
        <li>${lang==='tr'?'Bitcoin ve Ethereum TL karşılığı':'Bitcoin and Ethereum in Turkish Lira'}</li>
        <li>${lang==='tr'?'BIST 100 ve global borsa endeksleri':'BIST 100 and global stock indices'}</li>
      </ul>
    </div>`;
}

function heroCard({ icon, label, main, sub, chg, color }) {
  const chgHtml = chg != null && chg !== 0
    ? `<div style="font-size:12px;font-weight:700;margin-top:4px;color:${Number(chg)>=0?'var(--green)':'var(--red)'}">${changeStr(chg)}</div>`
    : '';
  const subHtml = sub ? `<div style="font-size:11px;color:var(--text-muted);margin-top:3px">${sub}</div>` : '';
  return `<div class="stat-card" style="border-top:2px solid ${color}">
    <div class="stat-label">${icon} ${label}</div>
    <div class="stat-value" style="font-size:20px;margin-top:8px;line-height:1.2">${main}</div>
    ${chgHtml}${subHtml}
  </div>`;
}

function catCard(page, icon, name, desc, color) {
  return `<div class="card" onclick="window.navigateTo('${page}')"
    style="cursor:pointer;border-left:3px solid ${color}"
    onmouseenter="this.style.transform='translateY(-3px)'"
    onmouseleave="this.style.transform=''">
    <div style="font-size:28px;margin-bottom:8px">${icon}</div>
    <div style="font-size:14px;font-weight:700;margin-bottom:4px">${name}</div>
    <div style="font-size:12px;color:var(--text-muted)">${desc}</div>
  </div>`;
}

function homeSkeleton() {
  return `
    <div style="height:22px;width:240px" class="skeleton skel-text mb-16"></div>
    <div class="grid-4 mb-22">${Array(8).fill(`
      <div class="stat-card">
        <div class="skeleton skel-text" style="width:55%"></div>
        <div class="skeleton" style="height:24px;width:70%;margin-top:10px"></div>
        <div class="skeleton skel-text" style="width:45%;margin-top:8px"></div>
      </div>`).join('')}
    </div>`;
}

// ── TICKER — Binance WebSocket first, REST fallback ──
async function initTicker() {
  // Prefer WS data, fallback to REST
  const [fxRes, metalsRes, binRes] = await Promise.allSettled([
    fetchExchangeRates('USD'),
    fetchMetals(),
    getBinanceTickers(BINANCE_SYMBOLS),
  ]);

  const rates  = fxRes.status    === 'fulfilled' ? fxRes.value?.rates || {} : {};
  const metals = metalsRes.status === 'fulfilled' ? metalsRes.value : {};
  const binance= binRes.status    === 'fulfilled' ? binRes.value     : [];

  const usdTry = rates.TRY || 0;
  const eurTry = rates.EUR && usdTry ? (1/rates.EUR)*usdTry : 0;
  const gbpTry = rates.GBP && usdTry ? (1/rates.GBP)*usdTry : 0;

  const goldGram   = metals.gold   && usdTry ? (metals.gold/31.1035)*usdTry   : 0;
  const silverGram = metals.silver && usdTry ? (metals.silver/31.1035)*usdTry : 0;

  const getBin = (sym) => Array.isArray(binance) ? binance.find(t => t.symbol === sym) : null;
  const fmt = (val, dec) => val ? formatNum(parseFloat(val), dec) : null;

  const items = [
    { sym:'USD/TL',  price: usdTry    ? '₺'+formatNum(usdTry,4)   : null, chg:null },
    { sym:'EUR/TL',  price: eurTry    ? '₺'+formatNum(eurTry,4)   : null, chg:null },
    { sym:'GBP/TL',  price: gbpTry    ? '₺'+formatNum(gbpTry,4)   : null, chg:null },
    { sym:'Altın/g', price: goldGram  ? '₺'+formatNum(goldGram,2)  : null, chg:null },
    { sym:'Gümüş/g', price: silverGram? '₺'+formatNum(silverGram,3): null, chg:null },
    { sym:'BTC/USD', price: getBin('BTCUSDT') ? '$'+fmt(getBin('BTCUSDT').lastPrice,0) : null, chg: getBin('BTCUSDT') ? parseFloat(getBin('BTCUSDT').priceChangePercent) : null },
    { sym:'ETH/USD', price: getBin('ETHUSDT') ? '$'+fmt(getBin('ETHUSDT').lastPrice,2) : null, chg: getBin('ETHUSDT') ? parseFloat(getBin('ETHUSDT').priceChangePercent) : null },
    { sym:'BNB/USD', price: getBin('BNBUSDT') ? '$'+fmt(getBin('BNBUSDT').lastPrice,2) : null, chg: getBin('BNBUSDT') ? parseFloat(getBin('BNBUSDT').priceChangePercent) : null },
    { sym:'SOL/USD', price: getBin('SOLUSDT') ? '$'+fmt(getBin('SOLUSDT').lastPrice,2) : null, chg: getBin('SOLUSDT') ? parseFloat(getBin('SOLUSDT').priceChangePercent) : null },
    { sym:'XRP/USD', price: getBin('XRPUSDT') ? '$'+fmt(getBin('XRPUSDT').lastPrice,4) : null, chg: getBin('XRPUSDT') ? parseFloat(getBin('XRPUSDT').priceChangePercent) : null },
    { sym:'DOGE',    price: getBin('DOGEUSDT') ? '$'+fmt(getBin('DOGEUSDT').lastPrice,5): null, chg: getBin('DOGEUSDT') ? parseFloat(getBin('DOGEUSDT').priceChangePercent) : null },
  ].filter(i => i.price !== null);

  if (!items.length) return;

  const html = items.map(item => {
    const chgHtml = item.chg != null
      ? `<span class="ticker-change ${item.chg >= 0 ? 'up' : 'down'}">${item.chg >= 0 ? '+' : ''}${item.chg.toFixed(2)}%</span>`
      : '';
    return `<span class="ticker-item"><span class="ticker-symbol">${item.sym}</span><span class="ticker-price">${item.price}</span>${chgHtml}</span>`;
  }).join('');

  const track = document.getElementById('tickerTrack');
  if (track) track.innerHTML = html + html;
}

window.navigateTo = navigateTo;
