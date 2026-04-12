import React, { createContext, useContext, useState, useEffect } from 'react';

const TRANSLATIONS = {
  tr: {
    appName: 'Canlı Veriler',
    appSub: 'Anlık Piyasa Takibi',
    liveLabel: 'CANLI',
    navHome: 'Ana Sayfa',
    navCrypto: 'Kripto Para',
    navForex: 'Döviz & Borsa',
    navWeather: 'Hava Durumu',
    navFootball: 'Süper Lig',
    navNews: 'Gündem & Haber',
    homeTitle: 'Canlı Veriler - Anlık Piyasa, Döviz, Borsa ve Spor Takibi',
    homeDesc: '<b>Canlı veriler</b> platformumuza hoş geldiniz! Türkiye\'nin ve dünyanın nabzını tutan, en hızlı ve kesintisiz anlık takip sistemini sunuyoruz. Yatırımlarınızı yönlendirirken ihtiyaç duyduğunuz <strong>canlı döviz kurları</strong> (Dolar, Euro), <strong>Borsa İstanbul (BIST 100)</strong> anlık hisse senedi değerleri, anlık gram ve ons altın fiyatları, güncel kripto para piyasası (Bitcoin, Ethereum vb.) saniyeler içinde ekranınızda. Yalnızca ekonomi değil; her hafta heyecanla beklenen <strong>Süper Lig güncel puan durumu</strong>, son dakika haberleri ve Türkiye geneli hava durumu raporları gibi hayata dair tüm <b>canlı verileri</b> tek bir sayfada, en yüksek performans ve güvenilirlikle, hiçbir gecikme yaşamadan tamamen ücretsiz inceleyebilirsiniz. Doğru bilgiye hızla ulaşmak ve her alanda <b>canlı veri</b> akışına anında sahip olmak için doğru yerdesiniz.',
    cryptoTitle: 'Kripto Para Piyasası',
    forexTitle: 'Döviz & Borsa İstanbul',
    weatherTitle: 'Bölgesel Hava Durumu',
    footballTitle: 'Süper Lig Heyecanı',
    newsTitle: 'Günün Öne Çıkanları',
    loading: 'Yükleniyor...',
    error: 'Veri yüklenemedi (Anahtar Gerekli Olabilir)',
    retry: 'Tekrar Dene',
    lastUpdate: 'Son güncelleme',
    rank: 'Sıra',
    team: 'Takım',
    played: 'O',
    points: 'P',
    fixtures: 'Fikstür & Sonuçlar',
    standings: 'Puan Durumu'
  },
  en: {
    appName: 'Live Data',
    appSub: 'Real-Time Market Tracker',
    liveLabel: 'LIVE',
    navHome: 'Dashboard',
    navCrypto: 'Cryptocurrency',
    navForex: 'Forex & Stocks',
    navWeather: 'Weather',
    navFootball: 'Football',
    navNews: 'News',
    homeTitle: 'Live Data - Real-time Markets, Forex & Sports Tracker',
    homeDesc: 'Welcome to our <b>live data</b> platform! The ultimate dashboard for tracking the pulse of the global and Turkish markets continuously. Monitor <strong>live forex rates</strong> (USD, EUR), <strong>Borsa Istanbul (BIST 100)</strong> indices, precious metals, and real-time cryptocurrency values directly on a single page. Beyond economics, dive into <strong>Super Lig live standings</strong>, breaking news, and regional weather updates. Access the most accurate and high-performance <b>live data</b> instantly, for free, empowering you to stay ahead every single day.',
    cryptoTitle: 'Cryptocurrency Market',
    forexTitle: 'Forex & Borsa Istanbul',
    weatherTitle: 'Regional Weather',
    footballTitle: 'Super Lig Fever',
    newsTitle: 'Top Stories',
    loading: 'Loading...',
    error: 'Failed to load (Key Required)',
    retry: 'Try Again',
    lastUpdate: 'Last updated',
    rank: 'Rank',
    team: 'Team',
    played: 'P',
    points: 'Pts',
    fixtures: 'Fixtures & Results',
    standings: 'Standings'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLangState] = useState(localStorage.getItem('lang') || 'tr');

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem('lang', newLang);
  };

  const t = (key) => {
    return TRANSLATIONS[lang][key] || TRANSLATIONS['tr'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
