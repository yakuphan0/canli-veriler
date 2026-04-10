import { fetchFootballMatches } from '../api.js';
import { getLang } from '../i18n.js';

export async function renderFootball(container) {
  const lang = getLang();
  
  // Skeleton
  container.innerHTML = `
    <div style="height:22px;width:240px" class="skeleton skel-text mb-16"></div>
    <div class="grid-3 mb-22">
       ${[1,2,3].map(() => `<div class="card"><div class="skeleton" style="height:40px;width:100%;margin-bottom:10px"></div><div class="skeleton" style="height:150px;width:100%"></div></div>`).join('')}
    </div>
  `;

  const data = await fetchFootballMatches();

  if (!Object.keys(data).length) {
    container.innerHTML = `
      <div class="section-title">⚽ ${lang==='tr'?'Süper Lig & 3 Büyükler':'Super Lig & Big 3'}</div>
      <div class="card" style="text-align:center;padding:40px">
        <div style="font-size:40px;margin-bottom:10px">⚠️</div>
        <p style="color:var(--text-muted)">${lang==='tr'?'Maç verileri çekilemedi.':'Match data unavailable.'}</p>
      </div>
    `;
    return;
  }

  const teams = Object.values(data);

  let html = `<div class="section-title">⚽ ${lang==='tr'?'Süper Lig & 3 Büyükler':'Super Lig & Big 3'}</div>`;
  html += `<div class="grid-3 mb-22" style="grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); align-items: start;">`;

  teams.forEach(tData => {
    html += `
      <div class="card" style="border-top: 4px solid ${tData.team.color}">
        <div style="display:flex;align-items:center;gap:15px;margin-bottom:20px;border-bottom:1px solid var(--border);padding-bottom:15px">
          <img src="${tData.team.logo}" alt="${tData.team.name}" style="width:50px;height:50px;object-fit:contain">
          <h2 style="margin:0;font-size:20px">${tData.team.name}</h2>
        </div>
    `;

    if (tData.past.length > 0) {
      html += `<h3 style="font-size:14px;color:var(--text-muted);margin-bottom:10px">${lang==='tr'?'Son Maçlar':'Recent Matches'}</h3>`;
      html += `<div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px">`;
      tData.past.forEach(match => {
        const title = match.name;
        const score = match.competitions[0].competitors[0].score + ' - ' + match.competitions[0].competitors[1].score;
        const isHome = match.competitions[0].competitors[0].team.id == tData.team.id;
        const dateStr = new Date(match.date).toLocaleDateString(lang==='tr'?'tr-TR':'en-US', {month:'short',day:'numeric'});
        html += `
          <div style="background:var(--bg);padding:10px;border-radius:8px;font-size:13px;display:flex;justify-content:space-between;align-items:center">
            <div style="flex:1">
               <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">${dateStr}</div>
               <div style="font-weight:600">${title}</div>
            </div>
            <div style="font-size:16px;font-weight:700;background:var(--card);padding:4px 10px;border-radius:6px;border:1px solid var(--border)">
              ${score}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    if (tData.future.length > 0) {
      html += `<h3 style="font-size:14px;color:var(--text-muted);margin-bottom:10px">${lang==='tr'?'Gelecek Maçlar':'Upcoming Matches'}</h3>`;
      html += `<div style="display:flex;flex-direction:column;gap:10px">`;
      tData.future.forEach(match => {
        const title = match.name;
        let timeLabel = new Date(match.date).toLocaleString(lang==='tr'?'tr-TR':'en-US', {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
        // If it's TBD time
        if (timeLabel.includes('00:00') && match.status?.type?.detail === 'TBD') {
            timeLabel = new Date(match.date).toLocaleDateString(lang==='tr'?'tr-TR':'en-US', {month:'short',day:'numeric'}) + ' (TBD)';
        }
        
        html += `
          <div style="background:var(--bg);padding:12px;border-radius:8px;font-size:13px;border-left:3px solid var(--text-muted)">
            <div style="color:var(--text-muted);font-size:11px;margin-bottom:4px">🗓️ ${timeLabel}</div>
            <div style="font-weight:600">${title}</div>
          </div>
        `;
      });
      html += `</div>`;
    } else {
        html += `<div style="padding:10px;color:var(--text-muted);font-size:13px;text-align:center;background:var(--bg);border-radius:8px">${lang==='tr'?'Yaklaşan maç bulunmuyor.':'No upcoming matches listed.'}</div>`;
    }

    html += `</div>`; // end card
  });

  html += `</div>`; // end grid

  container.innerHTML = html;
}
