import fs from 'fs';
import blogPosts from './src/data/blogPosts.js';

const DOMAIN = 'https://canliveriler.com';

const staticPages = [
  { url: '/', lastmod: '2026-04-19', changefreq: 'hourly', priority: '1.0' },
  { url: '/crypto', lastmod: '2026-04-19', changefreq: 'hourly', priority: '0.9' },
  { url: '/forex', lastmod: '2026-04-19', changefreq: 'hourly', priority: '0.9' },
  { url: '/football', lastmod: '2026-04-19', changefreq: 'daily', priority: '0.8' },
  { url: '/news', lastmod: '2026-04-19', changefreq: 'hourly', priority: '0.8' },
  { url: '/weather', lastmod: '2026-04-19', changefreq: 'hourly', priority: '0.8' },
  { url: '/blog', lastmod: '2026-04-19', changefreq: 'daily', priority: '0.9' }
];

let sitemapXML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">

  <!-- ═══════════════════════════════════════════ -->
  <!-- ANA VE KATEGORİ SAYFALARI -->
  <!-- ═══════════════════════════════════════════ -->
`;

staticPages.forEach(page => {
  sitemapXML += `  <url>
    <loc>${DOMAIN}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>\n`;
});

sitemapXML += `
  <!-- ═══════════════════════════════════════════ -->
  <!-- BLOG YAZILARI -->
  <!-- ═══════════════════════════════════════════ -->
`;

blogPosts.forEach(post => {
  sitemapXML += `  <url>
    <loc>${DOMAIN}/blog/${post.slug}</loc>
    <lastmod>${post.date}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>\n`;
});

sitemapXML += `</urlset>\n`;

fs.writeFileSync('public/sitemap.xml', sitemapXML, 'utf8');
console.log('Sitemap generated successfully! Total blog posts included: ' + blogPosts.length);
