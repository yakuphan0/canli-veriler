import { fetchBinanceTicker, fetchFearGreed, fetchExchangeRates, formatNum, formatCompact, changeClass, changeStr } from '../api.js';
import { t, getLang } from '../i18n.js';

// Top 30 Binance pairs to show in the table
const CRYPTO_SYMBOLS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT',
  'TRXUSDT','LINKUSDT','AVAXUSDT','DOTUSDT','MATICUSDT','LTCUSDT','BCHUSDT',
  'UNIUSDT','XLMUSDT','ATOMUSDT','ETCUSDT','XMRUSDT','FILUSDT',
  'AAVEUSDT','MKRUSDT','SNXUSDT','COMPUSDT','CRVUSDT',
  'NEARUSDT','ALGOUSDT','VETUSDT','ICPUSDT','APTUSDT',
];

const COIN_META = {
  BTCUSDT:  { name:'Bitcoin',        sym:'BTC',  icon:'https://assets.coincap.io/assets/icons/btc@2x.png' },
  ETHUSDT:  { name:'Ethereum',       sym:'ETH',  icon:'https://assets.coincap.io/assets/icons/eth@2x.png' },
  BNBUSDT:  { name:'BNB',            sym:'BNB',  icon:'https://assets.coincap.io/assets/icons/bnb@2x.png' },
  SOLUSDT:  { name:'Solana',         sym:'SOL',  icon:'https://assets.coincap.io/assets/icons/sol@2x.png' },
  XRPUSDT:  { name:'XRP',            sym:'XRP',  icon:'https://assets.coincap.io/assets/icons/xrp@2x.png' },
  DOGEUSDT: { name:'Dogecoin',       sym:'DOGE', icon:'https://assets.coincap.io/assets/icons/doge@2x.png' },
  ADAUSDT:  { name:'Cardano',        sym:'ADA',  icon:'https://assets.coincap.io/assets/icons/ada@2x.png' },
  TRXUSDT:  { name:'TRON',           sym:'TRX',  icon:'https://assets.coincap.io/assets/icons/trx@2x.png' },
  LINKUSDT: { name:'Chainlink',      sym:'LINK', icon:'https://assets.coincap.io/assets/icons/link@2x.png' },
  AVAXUSDT: { name:'Avalanche',      sym:'AVAX', icon:'https://assets.coincap.io/assets/icons/avax@2x.png' },
  DOTUSDT:  { name:'Polkadot',       sym:'DOT',  icon:'https://assets.coincap.io/assets/icons/dot@2x.png' },
  MATICUSDT:{ name:'Polygon',        sym:'MATIC',icon:'https://assets.coincap.io/assets/icons/matic@2x.png' },
  LTCUSDT:  { name:'Litecoin',       sym:'LTC',  icon:'https://assets.coincap.io/assets/icons/ltc@2x.png' },
  BCHUSDT:  { name:'Bitcoin Cash',   sym:'BCH',  icon:'https://assets.coincap.io/assets/icons/bch@2x.png' },
  UNIUSDT:  { name:'Uniswap',        sym:'UNI',  icon:'https://assets.coincap.io/assets/icons/uni@2x.png' },
  XLMUSDT:  { name:'Stellar',        sym:'XLM',  icon:'https://assets.coincap.io/assets/icons/xlm@2x.png' },
  ATOMUSDT: { name:'Cosmos',         sym:'ATOM', icon:'https://assets.coincap.io/assets/icons/atom@2x.png' },
  ETCUSDT:  { name:'Ethereum Classic',sym:'ETC', icon:'https://assets.coincap.io/assets/icons/etc@2x.png' },
  FILUSDT:  { name:'Filecoin',       sym:'FIL',  icon:'https://assets.coincap.io/assets/icons/fil@2x.png' },
  AAVEUSDT: { name:'Aave',           sym:'AAVE', icon:'https://assets.coincap.io/assets/icons/aave@2x.png' },
  MKRUSDT:  { name:'Maker',          sym:'MKR',  icon:'https://assets.coincap.io/assets/icons/mkr@2x.png' },
  NEARUSDT: { name:'NEAR Protocol',  sym:'NEAR', icon:'https://assets.coincap.io/assets/icons/near@2x.png' },
  ALGOUSDT: { name:'Algorand',       sym:'ALGO', icon:'https://assets.coincap.io/assets/icons/algo@2x.png' },
  VETUSDT:  { name:'VeChain',        sym:'VET',  icon:'https://assets.coincap.io/assets/icons/vet@2x.png' },
  ICPUSDT:  { name:'Internet Computer',sym:'ICP',icon:'https://assets.coincap.io/assets/icons/icp@2x.png' },
  APTUSDT:  { name:'Aptos',          sym:'APT',  icon:'https://assets.coincap.io/assets/icons/apt@2x.png' },
  XMRUSDT:  { name:'Monero',         sym:'XMR',  icon:'https://assets.coincap.io/assets/icons/xmr@2x.png' },
  SNXUSDT:  { name:'Synthetix',      sym:'SNX',  icon:'https://assets.coincap.io/assets/icons/snx@2x.png' },
  COMPUSDT: { name:'Compound',       sym:'COMP', icon:'https://assets.coincap.io/assets/icons/comp@2x.png' },
  CRVUSDT:  { name:'Curve',          sym:'CRV',  icon:'https://assets.coincap.io/assets/icons/crv@2x.png' },
};

export async function renderCrypto(container) {
  container.innerHTML = skeletonCrypto();

  const [tickersRes, fngRes, fxRes] = await Promise.allSettled([
    fetchBinanceTicker(CRYPTO_SYMBOLS),
    fetchFearGreed(),
    fetchExchangeRates('USD'),
  ]);

  const tickers = tickersRes.status === 'fulfilled' ? (tickersRes.value || []) : [];
  const fngData = fngRes.status    === 'fulfilled' ? fngRes.value : null;
  const rates   = fxRes.status     === 'fulfilled' ? (fxRes.value?.rates || {}) : {};
  const usdTry  = rates.TRY || null;

  const fngVal   = parseInt(fngData?.data?.[0]?.value || 50);
  const fngColor = fngVal < 26 ? 'var(--red)' : fngVal < 46 ? '#f97316' : fngVal < 56 ? 'var(--yellow)' : fngVal < 76 ? 'var(--green)' : '#00ff88';
  const fngLabel = fngVal < 26 ? t('extremeFear') : fngVal < 46 ? t('fear') : fngVal < 56 ? t('neutral') : fngVal < 76 ? t('greed') : t('extremeGreed');

  // Totals from Binance (quoteVolume = USDT volume)
  const totalVol  = tickers.reduce((s, c) => s + parseFloat(c.quoteVolume || 0), 0);
  const btcT      = tickers.find(t => t.symbol === 'BTCUSDT');
  const btcPrice  = btcT ? parseFloat(btcT.lastPrice) : 0;
  const btcChg    = btcT ? parseFloat(btcT.priceChangePercent) : 0;
  const lang      = getLang();

  container.innerHTML = `
    <div class="grid-4 mb-22">
      <div class="stat-card">
        <div class="stat-label">${t('fearGreed')}</div>
        <div class="stat-value" style="color:${fngColor};font-size:28px">${fngVal}</div>
        <span class="stat-change neutral">${fngLabel}</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">BTC / USD</div>
        <div class="stat-value" style="font-size:20px">$${formatNum(btcPrice, 0)}</div>
        <span class="stat-change ${changeClass(btcChg)}">${changeStr(btcChg)}</span>
      </div>
      <div class="stat-card">
        <div class="stat-label">BTC / TRY</div>
        <div class="stat-value" style="font-size:18px">${usdTry ? '₺'+formatNum(btcPrice*usdTry,0) : '—'}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">${t('volume24h')} (USDT)</div>
        <div class="stat-value" style="font-size:20px">${formatCompact(totalVol)}</div>
      </div>
    </div>

    <div class="card mb-22">
      <div class="card-header">
        <span class="card-title">${t('topCryptos')} — Binance</span>
        <span class="live-badge"><span class="live-dot"></span>${t('liveLabel')}</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${t('name')}</th>
              <th>${t('price')} (USD)</th>
              <th>${lang==='tr'?'Fiyat (TL)':'Price (TRY)'}</th>
              <th>${t('change24h')}</th>
              <th>${t('volume')} (USDT)</th>
            </tr>
          </thead>
          <tbody>
            ${tickers.length
              ? tickers.map((c, i) => coinRow(c, i + 1, usdTry)).join('')
              : `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-muted)">${t('noData')}</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>

    <div class="seo-section">
      <h2>${t('cryptoH2')}</h2>
      <p>${t('cryptoP1')}</p>
      <p>${t('cryptoP2')}</p>
    </div>`;
}

function coinRow(ticker, rank, usdTry) {
  const meta  = COIN_META[ticker.symbol] || { name: ticker.symbol.replace('USDT',''), sym: ticker.symbol.replace('USDT',''), icon:'' };
  const price = parseFloat(ticker.lastPrice);
  const chg   = parseFloat(ticker.priceChangePercent);
  const vol   = parseFloat(ticker.quoteVolume);
  const dec   = price >= 1000 ? 0 : price >= 1 ? 2 : price >= 0.01 ? 4 : 6;
  const priceTry = usdTry ? price * usdTry : null;

  return `<tr class="fade-in">
    <td><span class="row-num">${rank}</span></td>
    <td>
      <div class="asset-info">
        <div class="asset-icon">
          <img src="${meta.icon}" alt="${meta.sym}" loading="lazy"
            onerror="this.style.display='none';this.parentElement.textContent='${meta.sym[0]}';this.parentElement.style.fontSize='14px';this.parentElement.style.fontWeight='700'" />
        </div>
        <div>
          <div class="asset-name">${meta.name}</div>
          <div class="asset-sym">${meta.sym}</div>
        </div>
      </div>
    </td>
    <td class="price-cell">$${formatNum(price, dec)}</td>
    <td class="price-cell" style="color:var(--text-secondary)">${priceTry ? '₺'+formatNum(priceTry, dec) : '—'}</td>
    <td class="chg-cell ${changeClass(chg)}">${changeStr(chg)}</td>
    <td class="mcap-cell">${formatCompact(vol)}</td>
  </tr>`;
}

function skeletonCrypto() {
  return `<div class="grid-4 mb-22">${Array(4).fill(`<div class="stat-card"><div class="skeleton skel-text" style="width:60%"></div><div class="skeleton" style="height:28px;width:80%;margin-top:10px"></div></div>`).join('')}</div>
  <div class="card"><div class="skeleton skel-block" style="height:400px"></div></div>`;
}
