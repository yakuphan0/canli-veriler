import { fetchWeatherTurkey, fetchWeatherWorld, wmoDesc, wmoIcon, formatNum } from '../api.js';
import { t, getLang } from '../i18n.js';

export async function renderWeather(container) {
  container.innerHTML = skeleton();
  try {
    const [trCities, worldCities] = await Promise.all([fetchWeatherTurkey(), fetchWeatherWorld()]);
    const lang = getLang();

    container.innerHTML = `
      <div class="section-title">${t('turkishCities')}</div>
      <div class="grid-3 mb-22">
        ${trCities.map(c => weatherCard(c, lang)).join('')}
      </div>
      <div class="section-title">${t('worldCities')}</div>
      <div class="grid-3 mb-22">
        ${worldCities.map(c => weatherCard(c, lang)).join('')}
      </div>
      <div class="seo-section">
        <h2>${t('weatherH2')}</h2>
        <p>${t('weatherP1')}</p>
        <p>${t('weatherP2')}</p>
      </div>`;
  } catch(e) {
    container.innerHTML = errorState(() => renderWeather(container));
  }
}

function weatherCard(city, lang) {
  const w = city.weather;
  const icon = wmoIcon(w.weather_code);
  const desc = wmoDesc(w.weather_code, lang);
  const name = lang === 'tr' ? city.name : city.nameEn;
  return `<div class="weather-card">
    <div class="w-icon">${icon}</div>
    <div>
      <div class="w-city">${name}</div>
      <div class="w-city" style="font-size:11px;color:var(--text-muted)">${city.nameEn !== city.name ? (lang === 'tr' ? city.nameEn : city.name) : ''}</div>
      <div class="w-temp">${Math.round(w.temperature_2m)}°C</div>
      <div class="w-desc">${desc}</div>
      <div class="w-details">
        <span class="w-detail">💧 ${w.relative_humidity_2m}%</span>
        <span class="w-detail">💨 ${Math.round(w.wind_speed_10m)} km/h</span>
        ${w.apparent_temperature !== undefined ? `<span class="w-detail">🌡️ ${Math.round(w.apparent_temperature)}°C</span>` : ''}
      </div>
    </div>
  </div>`;
}

function skeleton() {
  return `<div class="grid-3">${Array(6).fill(`<div class="weather-card"><div class="skeleton" style="width:50px;height:50px;border-radius:50%;flex-shrink:0"></div><div style="flex:1"><div class="skeleton skel-text" style="width:60%;margin-bottom:8px"></div><div class="skeleton" style="height:32px;width:40%;margin-bottom:6px"></div><div class="skeleton skel-text" style="width:80%"></div></div></div>`).join('')}</div>`;
}
function errorState(retry) {
  return `<div class="error-state"><div class="error-icon">🌡️</div><div class="error-text">${t('error')}</div><button class="retry-btn" onclick="(${retry.toString()})()">↺ ${t('retry')}</button></div>`;
}
