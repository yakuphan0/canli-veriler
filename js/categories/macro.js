import { t, getLang } from '../i18n.js';

// Static macroeconomic data (updated periodically from official sources)
const TURKEY_DATA = {
  cpi:       { val: '67.07%', date: 'Şub 2025', color: 'var(--red)',    icon: '📈' },
  ppi:       { val: '22.65%', date: 'Şub 2025', color: 'var(--red)',    icon: '📊' },
  cbRate:    { val: '42.50%', date: 'Oca 2025', color: 'var(--yellow)', icon: '🏦' },
  gdp:       { val: '+3.2%',  date: '2024',     color: 'var(--green)',  icon: '🌱' },
  unemp:     { val: '8.4%',   date: 'Ara 2024',  color: 'var(--yellow)', icon: '👷' },
  currentAcc:{ val: '-$4.3B', date: 'Oca 2025', color: 'var(--red)',    icon: '💼' },
};
const GLOBAL_DATA = [
  { country: '🇺🇸 ABD', key:'Fed Faizi',   val:'5.25–5.50%', color:'var(--cyan)' },
  { country: '🇺🇸 ABD', key:'CPI',          val:'3.2%',        color:'var(--yellow)' },
  { country: '🇪🇺 AB',  key:'ECB Faizi',    val:'4.50%',       color:'var(--cyan)' },
  { country: '🇪🇺 AB',  key:'HICP',         val:'2.6%',        color:'var(--green)' },
  { country: '🇬🇧 UK',  key:'BoE Faizi',    val:'5.25%',       color:'var(--cyan)' },
  { country: '🇯🇵 Japonya',key:'BoJ Faizi', val:'0.10%',       color:'var(--text-muted)' },
  { country: '🇨🇳 Çin', key:'PBOC Faizi',   val:'3.45%',       color:'var(--cyan)' },
  { country: '🇨🇳 Çin', key:'GSYİH',        val:'+5.2%',       color:'var(--green)' },
];

export function renderMacro(container) {
  const lang = getLang();
  container.innerHTML = `
    <div class="section-title">${t('turkeyIndicators')}</div>
    <div class="grid-3 mb-22">
      ${macroCard(t('inflation'),    TURKEY_DATA.cpi)}
      ${macroCard(t('ppi'),         TURKEY_DATA.ppi)}
      ${macroCard(t('interestRate'),TURKEY_DATA.cbRate)}
      ${macroCard(t('gdpGrowth'),   TURKEY_DATA.gdp)}
      ${macroCard(t('unemployment'),TURKEY_DATA.unemp)}
      ${macroCard(t('currentAccount'),TURKEY_DATA.currentAcc)}
    </div>

    <div class="section-title">${t('globalIndicators')}</div>
    <div class="card mb-22">
      <table class="data-table">
        <thead>
          <tr><th>${lang==='tr'?'Ülke':'Country'}</th><th>${lang==='tr'?'Gösterge':'Indicator'}</th><th>${lang==='tr'?'Değer':'Value'}</th></tr>
        </thead>
        <tbody>
          ${GLOBAL_DATA.map(row => `<tr>
            <td>${row.country}</td>
            <td style="color:var(--text-secondary)">${row.key}</td>
            <td style="text-align:right;font-family:'Space Grotesk',sans-serif;font-weight:700;color:${row.color}">${row.val}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>

    <div class="card mb-22" style="border-left:3px solid var(--yellow)">
      <div style="font-size:11px;color:var(--yellow);font-weight:700;letter-spacing:1px;margin-bottom:8px">⚠️ ${lang==='tr'?'NOT':'NOTE'}</div>
      <p style="font-size:12px;color:var(--text-muted)">
        ${lang==='tr'
          ? 'Makroekonomik veriler resmi kaynaklardan (TCMB, TÜİK, Fed, ECB) alınmakta olup yayınlanma sürelerine göre güncellenmektedir.'
          : 'Macroeconomic data is sourced from official institutions (TCMB, TÜİK, Fed, ECB) and updated according to their release schedules.'}
      </p>
    </div>

    <div class="seo-section">
      <h2>${t('macroH2')}</h2>
      <p>${t('macroP1')}</p>
      <p>${t('macroP2')}</p>
    </div>`;
}

function macroCard(label, d) {
  return `<div class="stat-card">
    <div class="stat-label">${d.icon} ${label}</div>
    <div class="stat-value" style="font-size:22px;color:${d.color}">${d.val}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-top:4px">${d.date}</div>
  </div>`;
}
