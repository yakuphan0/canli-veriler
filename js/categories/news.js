import { fetchNews, timeAgo } from '../api.js';
import { t, getLang } from '../i18n.js';

let currentCat = 'all';

export async function renderNews(container) {
  container.innerHTML = `
    <div class="filter-tabs" id="newsTabs">
      ${['all','crypto','finance','economy','turkey'].map(cat => `
        <button class="filter-tab ${cat === currentCat ? 'active' : ''}" data-cat="${cat}">${tabLabel(cat)}</button>
      `).join('')}
    </div>
    <div id="newsContainer">${loadingGrid()}</div>
    <div class="seo-section">
      <h2>${t('newsH2')}</h2>
      <p>${t('newsP1')}</p>
      <p>${t('newsP2')}</p>
    </div>`;

  document.getElementById('newsTabs').addEventListener('click', e => {
    const btn = e.target.closest('.filter-tab');
    if (!btn) return;
    currentCat = btn.dataset.cat;
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.toggle('active', b.dataset.cat === currentCat));
    loadNewsItems();
  });

  loadNewsItems();
}

function tabLabel(cat) {
  const map = { all: t('newsAll'), crypto: t('newsCrypto'), finance: t('newsFinance'), economy: t('newsEconomy'), turkey: t('newsTurkey') };
  return map[cat] || cat;
}

async function loadNewsItems() {
  const nc = document.getElementById('newsContainer');
  if (!nc) return;
  nc.innerHTML = loadingGrid();
  try {
    const items = await fetchNews(currentCat);
    if (!items.length) { nc.innerHTML = `<div class="error-state"><div class="error-icon">📰</div><div class="error-text">${t('noData')}</div></div>`; return; }
    nc.innerHTML = `<div class="news-grid">${items.slice(0, 24).map(newsCard).join('')}</div>`;
  } catch {
    nc.innerHTML = `<div class="error-state"><div class="error-icon">📰</div><div class="error-text">${t('error')}</div><button class="retry-btn" onclick="loadNewsItems()">↺ ${t('retry')}</button></div>`;
  }
}

function newsCard(item) {
  const ago = timeAgo(item.pubDate);
  const hasImg = item.thumbnail && item.thumbnail.startsWith('http');
  return `<a class="news-card" href="${item.link}" target="_blank" rel="noopener noreferrer">
    ${hasImg
      ? `<img class="news-img" src="${item.thumbnail}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : ''}
    <div class="news-img-placeholder" style="display:${hasImg ? 'none' : 'flex'}">${item.icon}</div>
    <div class="news-body">
      <div class="news-source">${item.source}</div>
      <div class="news-title">${item.title}</div>
      <div class="news-time">${ago} ${ago.length < 4 ? '' : ''}önce</div>
    </div>
  </a>`;
}

function loadingGrid() {
  return `<div class="news-grid">${Array(9).fill(`<div class="news-card"><div class="news-img-placeholder skeleton" style="height:150px"></div><div class="news-body"><div class="skeleton skel-text" style="width:40%"></div><div class="skeleton skel-text"></div><div class="skeleton skel-text" style="width:80%"></div></div></div>`).join('')}</div>`;
}
