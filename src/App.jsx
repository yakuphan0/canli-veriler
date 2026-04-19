import React, { useState, useEffect } from 'react';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ApiService, formatNum } from './services/apiService';
import blogPosts from './data/blogPosts';

// ── UTILS ──
const changeClass = (val) => Number(val) > 0 ? 'up' : Number(val) < 0 ? 'down' : '';
const changeStr = (val) => {
  if (val == null || isNaN(val)) return '—';
  const n = Number(val);
  return (n > 0 ? '+' : '') + n.toFixed(2) + '%';
};

// ── COMPONENTS ──

const Ticker = () => {
  const [data, setData] = useState([]);
  useEffect(() => {
    const load = async () => {
      try {
        const [crypto, fx] = await Promise.all([ApiService.fetchCrypto(['BTCUSDT']), ApiService.fetchForex('USD')]);
        setData([
          { label: 'BTC/USD', val: `$${formatNum(crypto[0]?.lastPrice, 0)}` },
          { label: 'USD/TRY', val: `₺${formatNum(fx?.TRY, 2)}` },
        ]);
      } catch (e) { console.error(e); }
    };
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="ticker-bar">
      <div className="ticker-label">
        <span className="ticker-live-dot"></span>
        LIVE
      </div>
      <div className="ticker-scroll-wrapper">
        <div className="ticker-track">
          {[...data, ...data, ...data].map((item, i) => (
            <div key={i} className="ticker-item">
              <span className="ticker-symbol">{item.label}</span>
              <span className="ticker-price">{item.val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Sidebar = ({ currentPage, setPage }) => {
  const { t, lang, setLang } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const menu = [
    { id: 'home', label: t('navHome'), icon: '🏠' },
    { id: 'crypto', label: t('navCrypto'), icon: '💹' },
    { id: 'forex', label: t('navForex'), icon: '📉' },
    { id: 'football', label: t('navFootball'), icon: '⚽' },
    { id: 'news', label: t('navNews'), icon: '📰' },
    { id: 'weather', label: t('navWeather'), icon: '🌡️' },
    { id: 'blog', label: t('navBlog'), icon: '✍️' },
  ];

  return (
    <>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">📊</div>
          <div>
            <div className="logo-title">{t('appName')}</div>
            <div className="logo-sub">{t('appSub')}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section-label">MARKETS & MORE</div>
          {menu.map(item => (
            <div
              key={item.id}
              className={`nav-item ${currentPage === item.id ? 'active' : ''}`}
              onClick={() => { setPage(item.id); setIsOpen(false); }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="lang-toggle">
            <button className={`lang-btn ${lang === 'tr' ? 'active' : ''}`} onClick={() => setLang('tr')}>🇹🇷 TR</button>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>🇬🇧 EN</button>
          </div>
        </div>
      </aside>
      <button className="mobile-btn" onClick={() => setIsOpen(!isOpen)}>☰</button>
      {isOpen && <div className="sidebar-overlay open" onClick={() => setIsOpen(false)}></div>}
    </>
  );
};

// ── PAGES ──

const Dashboard = () => {
  const { t } = useLanguage();
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [crypto, fx, bist] = await Promise.all([
          ApiService.fetchCrypto(['BTCUSDT', 'ETHUSDT']),
          ApiService.fetchForex('USD'),
          ApiService.fetchBIST()
        ]);
        setData({ crypto, fx, bist });
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  if (!data) return <div className="content-area">{t('loading')}</div>;

  return (
    <div className="content-area">
      <div className="grid-3">
        <div className="stat-card" onClick={() => window.navigateTo('crypto')}>
          <div className="stat-label">BITCOIN / USD</div>
          <div className="stat-value">${formatNum(data.crypto[0]?.lastPrice, 0)}</div>
          <div className={`stat-change ${changeClass(data.crypto[0]?.priceChangePercent)}`}>
            {changeStr(data.crypto[0]?.priceChangePercent)}
          </div>
        </div>
        <div className="stat-card" onClick={() => window.navigateTo('forex')}>
          <div className="stat-label">BIST 100 (Borsa İstanbul)</div>
          <div className="stat-value">
            {data.bist ? formatNum(data.bist.close, 2) : '—'}
          </div>
          {data.bist && (
            <div className={`stat-change ${changeClass(data.bist.change)}`}>
              {changeStr(data.bist.change)}
            </div>
          )}
        </div>
        <div className="stat-card">
          <div className="stat-label">USD / TRY</div>
          <div className="stat-value">₺{formatNum(data.fx.TRY, 2)}</div>
        </div>
      </div>
      <div className="seo-section" style={{ marginTop: '40px', padding: '28px', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
        <h2 style={{ fontSize: '20px', color: 'var(--cyan)', marginBottom: '14px', fontFamily: 'Space Grotesk, sans-serif' }}>
          {t('homeTitle')}
        </h2>
        <div 
          style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.9' }}
          dangerouslySetInnerHTML={{ __html: t('homeDesc') }} 
        />
      </div>
    </div>
  );
};

const CryptoPage = () => {
  const { t } = useLanguage();
  const [tickers, setTickers] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await ApiService.fetchCrypto();
        setTickers(res);
      } catch (e) { console.error(e); }
    };
    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="content-area">
      <div className="card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>{t('name')}</th><th>{t('price')}</th><th>24h %</th></tr>
            </thead>
            <tbody>
              {tickers.map(ticker => (
                <tr key={ticker.symbol}>
                  <td>
                    <div className="asset-info">
                      <div className="asset-icon">{ticker.symbol[0]}</div>
                      <div className="asset-name">{ticker.symbol.replace('USDT', '')}</div>
                    </div>
                  </td>
                  <td className="price-cell">${formatNum(ticker.lastPrice, 2)}</td>
                  <td className={`chg-cell ${changeClass(ticker.priceChangePercent)}`}>
                    {changeStr(ticker.priceChangePercent)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const FootballPage = () => {
  const { t } = useLanguage();
  const [standings, setStandings] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const s = await ApiService.fetchFootballStandings();
        setStandings(s);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="content-area">{t('loading')}</div>;
  if (!standings) return <div className="content-area error-state">
    <div className="error-icon">⚽</div>
    <div className="error-text">Veriler Yüklenemedi</div>
    <p style={{fontSize:11, color:'var(--text-muted)'}}>Şu an veriler çekilemiyor, lütfen sayfayı yenileyin.</p>
    <button onClick={() => window.location.reload()} className="retry-btn mt-10">{t('retry')}</button>
  </div>;

  return (
    <div className="content-area">
        <div className="card">
          <div className="card-header"><div className="card-title">{t('standings')}</div></div>
          <div className="table-wrap">
            <table className="data-table football-table">
              <thead>
                <tr>
                  <th style={{textAlign:'center', width:'60px'}}>{t('rank')}</th>
                  <th style={{textAlign:'left'}}>{t('team')}</th>
                  <th style={{textAlign:'center', width:'80px'}}>{t('played')}</th>
                  <th style={{textAlign:'center', width:'80px'}}>{t('points')}</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((s, idx) => {
                  const safeName = s.team.name.replace(/\([^)]*\)/g, '').trim();
                  return (
                  <tr key={s.team.id || idx} className="football-row">
                    <td style={{textAlign:'center'}}>
                      <span className="rank-badge">{s.position}</span>
                    </td>
                    <td style={{textAlign:'left'}}>
                      <div className="asset-info">
                        <div className="asset-icon">
                          <img src={s.team.crest} alt={safeName} onError={(e) => { e.target.onerror = null; e.target.src = 'https://upload.wikimedia.org/wikipedia/tr/b/b4/T%C3%BCrkiye_Futbol_Federasyonu_logo.png' }} />
                        </div>
                        <span className="asset-name">{safeName}</span>
                      </div>
                    </td>
                    <td style={{textAlign:'center', color:'var(--text-secondary)'}}>{s.playedGames}</td>
                    <td style={{textAlign:'center', fontWeight:800, color:'var(--cyan)', fontSize:'16px'}}>{s.points}</td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
    </div>
  );
};

const NewsPage = () => {
  const { t } = useLanguage();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { setNews(await ApiService.fetchNews()); }
      catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="content-area">{t('loading')}</div>;

  return (
    <div className="content-area">
      <div className="news-grid">
        {news.map((item, i) => (
          <a key={i} href={item.link} target="_blank" rel="noreferrer" className="news-card">
            <div className="news-img-wrapper">
              {item.thumbnail ? <img src={item.thumbnail} className="news-img" alt="" /> : <div className="news-img-placeholder">📰</div>}
            </div>
            <div className="news-body">
              <div className="news-title">{item.title}</div>
              <div className="news-time">{new Date(item.pubDate).toLocaleTimeString()}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

const WeatherPage = () => {
  const { t } = useLanguage();
  const [region, setRegion] = useState('marmara');
  const [citiesData, setCitiesData] = useState([]);
  const [loading, setLoading] = useState(false);

  const REGIONS = {
    'Marmara': [{n:'İstanbul',lat:41.01,lon:28.95}, {n:'Bursa',lat:40.19,lon:29.06}, {n:'Edirne',lat:41.67,lon:26.56}],
    'İç Anadolu': [{n:'Ankara',lat:39.93,lon:32.86}, {n:'Konya',lat:37.87,lon:32.48}, {n:'Eskişehir',lat:39.77,lon:30.52}],
    'Ege':  [{n:'İzmir',lat:38.42,lon:27.14}, {n:'Aydın',lat:37.84,lon:27.84}, {n:'Muğla',lat:37.21,lon:28.36}],
    'Akdeniz': [{n:'Antalya',lat:36.90,lon:30.70}, {n:'Adana',lat:36.99,lon:35.32}, {n:'Mersin',lat:36.81,lon:34.63}],
    'Karadeniz': [{n:'Trabzon',lat:41.00,lon:39.73}, {n:'Samsun',lat:41.29,lon:36.33}, {n:'Rize',lat:41.02,lon:40.52}],
    'Doğu Anadolu': [{n:'Erzurum',lat:39.90,lon:41.27}, {n:'Van',lat:38.49,lon:43.38}, {n:'Elazığ',lat:38.68,lon:39.22}],
    'Güneydoğu': [{n:'Gaziantep',lat:37.06,lon:37.38}, {n:'Diyarbakır',lat:37.91,lon:40.23}, {n:'Şanlıurfa',lat:37.16,lon:38.79}]
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await Promise.all(REGIONS[region].map(async c => {
          const w = await ApiService.fetchWeather(c.lat, c.lon);
          return { ...c, ...w };
        }));
        setCitiesData(data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [region]);

  return (
    <div className="content-area">
      <div className="filter-tabs" style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {Object.keys(REGIONS).map(r => (
          <button key={r} className={`filter-tab ${region === r ? 'active' : ''}`} onClick={() => setRegion(r)}>
            {r}
          </button>
        ))}
      </div>
      {loading ? <div>{t('loading')}</div> : (
        <div className="grid-3">
          {citiesData.map(c => (
            <div key={c.n} className="weather-card">
              <div className="w-icon">🌡️</div>
              <div>
                <div className="w-city">{c.n}</div>
                <div className="w-temp">{Math.round(c.temp)}°C</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── BLOG COMPONENTS ──

const CATEGORY_COLORS = {
  kripto: { bg: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: 'rgba(139,92,246,0.3)' },
  borsa: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' },
  futbol: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
  ekonomi: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
  hava: { bg: 'rgba(0,212,255,0.15)', color: '#00d4ff', border: 'rgba(0,212,255,0.3)' },
};

const BlogPage = ({ setPage }) => {
  const { t } = useLanguage();
  const [selectedPost, setSelectedPost] = useState(null);
  const [filter, setFilter] = useState('all');

  const categories = [
    { id: 'all', label: t('blogAll') },
    { id: 'kripto', label: t('blogCrypto') },
    { id: 'borsa', label: t('blogBorsa') },
    { id: 'futbol', label: t('blogFutbol') },
    { id: 'ekonomi', label: t('blogEkonomi') },
    { id: 'hava', label: t('blogHava') },
  ];

  const filtered = filter === 'all' ? blogPosts : blogPosts.filter(p => p.category === filter);

  if (selectedPost) {
    const post = blogPosts.find(p => p.id === selectedPost);
    if (!post) return null;
    const catStyle = CATEGORY_COLORS[post.category] || {};
    return (
      <div className="content-area">
        {/* Breadcrumb */}
        <div className="blog-breadcrumb">
          <span className="breadcrumb-link" onClick={() => setSelectedPost(null)}>← {t('blogBackToList')}</span>
        </div>

        {/* Article */}
        <article className="blog-article" itemScope itemType="https://schema.org/BlogPosting">
          <header className="blog-article-header">
            <div className="blog-article-meta">
              <span
                className="blog-category-badge"
                style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
              >
                {post.categoryIcon} {post.categoryLabel}
              </span>
              <span className="blog-date">{new Date(post.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="blog-readtime">📖 {post.readTime} dk okuma</span>
            </div>
            <h1 className="blog-article-title" itemProp="headline">{post.title}</h1>
            <div className="blog-author" itemProp="author">
              <div className="blog-author-avatar">📊</div>
              <span>{post.author}</span>
            </div>
          </header>

          {/* Keywords (hidden for SEO) */}
          <meta itemProp="keywords" content={post.keywords.join(', ')} />
          <meta itemProp="description" content={post.metaDescription} />
          <meta itemProp="datePublished" content={post.date} />

          <div
            className="blog-article-content"
            itemProp="articleBody"
            dangerouslySetInnerHTML={{ __html: post.content }}
          />

          {/* Related Posts */}
          <div className="blog-related">
            <h3 className="blog-related-title">{t('blogRelated')}</h3>
            <div className="blog-related-grid">
              {blogPosts
                .filter(p => p.category === post.category && p.id !== post.id)
                .slice(0, 2)
                .map(rp => {
                  const rpStyle = CATEGORY_COLORS[rp.category] || {};
                  return (
                    <div key={rp.id} className="blog-card blog-card-sm" onClick={() => { setSelectedPost(rp.id); window.scrollTo(0, 0); }}>
                      <div className="blog-card-thumb">{rp.thumbnail}</div>
                      <div className="blog-card-body">
                        <span className="blog-category-badge sm" style={{ background: rpStyle.bg, color: rpStyle.color, border: `1px solid ${rpStyle.border}` }}>
                          {rp.categoryIcon} {rp.categoryLabel}
                        </span>
                        <h4 className="blog-card-title sm">{rp.title}</h4>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </article>
      </div>
    );
  }

  return (
    <div className="content-area">
      {/* Hero */}
      <div className="blog-hero">
        <h2 className="blog-hero-title">{t('blogHeroTitle')}</h2>
        <p className="blog-hero-desc">{t('blogHeroDesc')}</p>
      </div>

      {/* Category Filter */}
      <div className="blog-filters">
        {categories.map(c => (
          <button
            key={c.id}
            className={`blog-filter-btn ${filter === c.id ? 'active' : ''}`}
            onClick={() => setFilter(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Blog Cards Grid */}
      <div className="blog-grid">
        {filtered.map(post => {
          const catStyle = CATEGORY_COLORS[post.category] || {};
          return (
            <div key={post.id} className="blog-card" onClick={() => { setSelectedPost(post.id); window.scrollTo(0, 0); }}>
              <div className="blog-card-thumb">{post.thumbnail}</div>
              <div className="blog-card-body">
                <div className="blog-card-meta">
                  <span
                    className="blog-category-badge"
                    style={{ background: catStyle.bg, color: catStyle.color, border: `1px solid ${catStyle.border}` }}
                  >
                    {post.categoryIcon} {post.categoryLabel}
                  </span>
                  <span className="blog-card-date">{new Date(post.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })}</span>
                </div>
                <h3 className="blog-card-title">{post.title}</h3>
                <p className="blog-card-excerpt">{post.excerpt}</p>
                <div className="blog-card-footer">
                  <span className="blog-card-readtime">📖 {post.readTime} dk</span>
                  <span className="blog-card-read">{t('blogReadMore')} →</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* SEO Footer Text */}
      <div className="blog-seo-footer">
        <h2>{t('blogSeoTitle')}</h2>
        <p>{t('blogSeoDesc')}</p>
      </div>
    </div>
  );
};

const ForexPage = () => {
    const { t } = useLanguage();
    const [data, setData] = useState(null);
  
    useEffect(() => {
      const load = async () => {
        try {
          const [fx, met, bist] = await Promise.all([
            ApiService.fetchForex('TRY'),
            ApiService.fetchMetals(),
            ApiService.fetchBIST()
          ]);
          setData({ fx, met, bist });
        } catch (e) { console.error(e); }
      };
      load();
    }, []);
  
    if (!data) return <div className="content-area">{t('loading')}</div>;
  
    return (
      <div className="content-area">
        <div className="grid-2">
           <div className="card shadow-lg">
              <div className="card-header"><div className="card-title">DÖVİZ KURLARI</div></div>
              <div className="table-wrap">
                <table className="data-table">
                  <tbody>
                    <tr><td>USD / TRY</td><td style={{fontWeight:700}}>₺{formatNum(1/data.fx.USD, 2)}</td></tr>
                    <tr><td>EUR / TRY</td><td style={{fontWeight:700}}>₺{formatNum(1/data.fx.EUR, 2)}</td></tr>
                    <tr><td>GBP / TRY</td><td style={{fontWeight:700}}>₺{formatNum(1/data.fx.GBP, 2)}</td></tr>
                  </tbody>
                </table>
              </div>
           </div>
           <div className="card">
              <div className="card-header"><div className="card-title">BORSA İSTANBUL</div></div>
              <div className="stat-value" style={{padding:'20px 10px'}}>{data.bist ? formatNum(data.bist.close, 2) : '—'}</div>
              {data.bist && (
                <div className={`stat-change ${changeClass(data.bist.change)}`} style={{marginLeft:10}}>
                  {changeStr(data.bist.change)}
                </div>
              )}
              <p style={{fontSize:10, color:'var(--text-muted)', marginTop:8}}>Kaynak: Yahoo Finance (15 dk gecikmeli)</p>
           </div>
           <div className="card col-span-2">
              <div className="card-header"><div className="card-title">DEĞERLİ METALLER</div></div>
              <div className="grid-3">
                 <div className="stat-card">
                    <div className="stat-label">Gram Altın</div>
                    <div className="stat-value" style={{color:'var(--yellow)'}}>₺{formatNum((data.met.gold / 31.1035) * (1/data.fx.USD), 2)}</div>
                 </div>
                 <div className="stat-card">
                    <div className="stat-label">Ons Altın</div>
                    <div className="stat-value">${formatNum(data.met.gold, 2)}</div>
                 </div>
                 <div className="stat-card">
                    <div className="stat-label">Ons Gümüş</div>
                    <div className="stat-value">${formatNum(data.met.silver, 2)}</div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

// ── MAIN APP CONTENT ──

function AppContent() {
  const [currentPage, setPage] = useState('home');
  const { t } = useLanguage();

  useEffect(() => {
    window.navigateTo = setPage;
  }, []);

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Dashboard />;
      case 'crypto': return <CryptoPage />;
      case 'football': return <FootballPage />;
      case 'news': return <NewsPage />;
      case 'weather': return <WeatherPage />;
      case 'forex': return <ForexPage />;
      case 'blog': return <BlogPage setPage={setPage} />;
      default: return <div className="content-area">Coming Soon...</div>;
    }
  };

  return (
    <div className="app-root">
      <Ticker />
      <div className="app-layout">
        <Sidebar currentPage={currentPage} setPage={setPage} />
        <main className="main-content">
          <header className="page-header">
            <div>
              <h1 className="page-title">
                {t('nav' + currentPage.charAt(0).toUpperCase() + currentPage.slice(1))}
                <span className="live-badge"><span className="live-dot"></span>{t('liveLabel')}</span>
              </h1>
            </div>
          </header>
          {renderPage()}
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

export default App;
