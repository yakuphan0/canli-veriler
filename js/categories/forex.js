import { fetchExchangeRates, fetchMetals, fetchMetalsChange, fetchCommodities, formatNum, changeClass, changeStr } from '../api.js';
import { t, getLang } from '../i18n.js';

const CURRENCY_META = {
  USD:{ name:'Amerikan Doları',  nameEn:'US Dollar',        flag:'🇺🇸', sym:'$'   },
  EUR:{ name:'Euro',             nameEn:'Euro',             flag:'🇪🇺', sym:'€'   },
  GBP:{ name:'İngiliz Sterlini',nameEn:'British Pound',    flag:'🇬🇧', sym:'£'   },
  CHF:{ name:'İsviçre Frangı',  nameEn:'Swiss Franc',      flag:'🇨🇭', sym:'₣'   },
  JPY:{ name:'Japon Yeni',      nameEn:'Japanese Yen',     flag:'🇯🇵', sym:'¥'   },
  CNY:{ name:'Çin Yuanı',       nameEn:'Chinese Yuan',     flag:'🇨🇳', sym:'¥'   },
  RUB:{ name:'Rus Rublesi',     nameEn:'Russian Ruble',    flag:'🇷🇺', sym:'₽'   },
  SAR:{ name:'S. Arabistan Riyali',nameEn:'Saudi Riyal',   flag:'🇸🇦', sym:'﷼'   },
  AED:{ name:'BAE Dirhemi',     nameEn:'UAE Dirham',       flag:'🇦🇪', sym:'د.إ' },
  CAD:{ name:'Kanada Doları',   nameEn:'Canadian Dollar',  flag:'🇨🇦', sym:'$'   },
  AUD:{ name:'Avustralya Doları',nameEn:'Australian Dollar',flag:'🇦🇺',sym:'$'   },
  NOK:{ name:'Norveç Kronu',    nameEn:'Norwegian Krone',  flag:'🇳🇴', sym:'kr'  },
};

const METAL_META = {
  gold:    { name:'Altın (Ons)',       nameEn:'Gold (Oz)',     icon:'🥇', unit:'$/oz'  },
  silver:  { name:'Gümüş (Ons)',       nameEn:'Silver (Oz)',   icon:'🥈', unit:'$/oz'  },
  platinum:{ name:'Platin (Ons)',      nameEn:'Platinum (Oz)', icon:'⬜', unit:'$/oz'  },
  palladium:{ name:'Paladyum (Ons)',   nameEn:'Palladium (Oz)',icon:'🔘', unit:'$/oz'  },
};

const COMMODITY_META = {
  'BZ=F':{ name:'Brent Petrol',   nameEn:'Brent Crude',  icon:'🛢️', unit:'$/bbl'   },
  'CL=F':{ name:'WTI Ham Petrol', nameEn:'WTI Crude',    icon:'⛽',  unit:'$/bbl'   },
  'NG=F':{ name:'Doğalgaz',       nameEn:'Natural Gas',  icon:'🔥', unit:'$/MMBtu' },
  'HG=F':{ name:'Bakır',          nameEn:'Copper',       icon:'🔶', unit:'$/lb'    },
};

export async function renderForex(container) {
  container.innerHTML = skeleton();
  try {
    const [tryRates, usdRates, metals, metalsChg, comData] = await Promise.all([
      fetchExchangeRates('TRY'),
      fetchExchangeRates('USD'),
      fetchMetals(),
      fetchMetalsChange(),
      fetchCommodities(),
    ]);

    const tryToOther = tryRates.rates  || {};
    const tryChanges = tryRates.changes|| {};
    const usdToOther = usdRates.rates  || {};
    const lang = getLang();

    // TRY per 1 foreign currency
    const fxRows = Object.entries(CURRENCY_META).map(([code, meta]) => {
      const rate = tryToOther[code] ? 1 / tryToOther[code] : null;
      // Change: if USD/TRY changed by X%, then TRY/USD changed by ~-X%
      const rawChg = tryChanges[code] ? -tryChanges[code] : null;
      return { code, meta, rate, chg: rawChg };
    }).filter(r => r.rate);

    const metalPrices = typeof metals === 'object' && !Array.isArray(metals) ? metals : {};
    const comQuotes   = comData?.quoteResponse?.result || [];

    container.innerHTML = `
      <div class="section-title">${t('currencies')} / TRY</div>
      <div class="grid-auto mb-22">
        ${fxRows.map(r => fxCard(r, lang)).join('')}
      </div>

      <div class="section-title">${t('metals')}</div>
      <div class="grid-4 mb-22">
        ${Object.entries(METAL_META).map(([key, meta]) => {
          const price    = metalPrices[key] || null;
          const tryPrice = price && usdToOther.TRY ? price * usdToOther.TRY : null;
          const chg      = metalsChg[key] || null;
          return metalCard(key, meta, price, tryPrice, usdToOther.TRY, chg, lang);
        }).join('')}
      </div>

      <div class="section-title">${t('commodities')}</div>
      <div class="grid-4 mb-22">
        ${comQuotes.filter(q => COMMODITY_META[q.symbol]).map(q => commodityCard(q, lang)).join('')}
        ${comQuotes.filter(q => COMMODITY_META[q.symbol]).length === 0
          ? `<div class="stat-card" style="grid-column:1/-1;text-align:center;color:var(--text-muted);padding:30px">
               ${lang==='tr'?'Emtia verileri geçici olarak mevcut değil (borsalar kapalı olabilir)':'Commodity data temporarily unavailable (markets may be closed)'}
             </div>`
          : ''}
      </div>

      <div class="seo-section">
        <h2>${t('forexH2')}</h2>
        <p>${t('forexP1')}</p>
        <p>${t('forexP2')}</p>
      </div>`;
  } catch(e) {
    container.innerHTML = errorState(() => renderForex(container));
  }
}

function fxCard({ code, meta, rate, chg }, lang) {
  const name = lang === 'tr' ? meta.name : meta.nameEn;
  const chgHtml = chg != null
    ? `<span class="stat-change ${changeClass(chg)}" style="font-size:11px">${changeStr(chg)}</span>`
    : '';
  return `<div class="stat-card">
    <div class="stat-label">${meta.flag} ${code}/TRY</div>
    <div class="asset-name" style="font-size:11px;color:var(--text-muted);margin-bottom:4px">${name}</div>
    <div class="stat-value" style="font-size:22px">₺${formatNum(rate, code === 'JPY' ? 4 : 2)}</div>
    ${chgHtml}
  </div>`;
}

function metalCard(key, meta, priceUsd, priceTry, usdTry, chg, lang) {
  const name = lang === 'tr' ? meta.name : meta.nameEn;
  const gramUsd = key === 'gold' && priceUsd ? priceUsd / 31.1035 : null;
  const gramTry = gramUsd && usdTry ? gramUsd * usdTry : null;
  const chgHtml = chg != null
    ? `<span class="stat-change ${changeClass(chg)}" style="font-size:11px">${changeStr(chg)}</span>`
    : '';
  return `<div class="stat-card">
    <div class="stat-label">${meta.icon} ${name}</div>
    <div class="stat-value" style="font-size:18px">${priceUsd ? '$'+formatNum(priceUsd, 2) : '—'}</div>
    ${chgHtml}
    ${gramTry ? `<div style="font-size:12px;color:var(--text-muted);margin-top:4px">Gram: ₺${formatNum(gramTry, 2)}</div>` : ''}
    ${priceTry ? `<div style="font-size:12px;color:var(--text-muted)">Ons: ₺${formatNum(priceTry, 0)}</div>` : ''}
    <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${meta.unit}</div>
  </div>`;
}

function commodityCard(q, lang) {
  const meta = COMMODITY_META[q.symbol] || { name: q.shortName, nameEn: q.shortName, icon: '📦', unit:'' };
  const name = lang === 'tr' ? meta.name : meta.nameEn;
  const chg = q.regularMarketChangePercent || 0;
  return `<div class="stat-card">
    <div class="stat-label">${meta.icon} ${name}</div>
    <div class="stat-value" style="font-size:20px">$${formatNum(q.regularMarketPrice, 2)}</div>
    <span class="stat-change ${changeClass(chg)}">${changeStr(chg)}</span>
    <div style="font-size:10px;color:var(--text-muted);margin-top:4px">${meta.unit}</div>
  </div>`;
}

function skeleton() {
  return `<div class="grid-auto">${Array(8).fill(`<div class="stat-card"><div class="skeleton skel-text" style="width:70%"></div><div class="skeleton" style="height:22px;width:50%;margin-top:10px"></div></div>`).join('')}</div>`;
}
function errorState(retry) {
  return `<div class="error-state"><div class="error-icon">💱</div><div class="error-text">${t('error')}</div><button class="retry-btn" onclick="(${retry.toString()})()">↺ ${t('retry')}</button></div>`;
}
