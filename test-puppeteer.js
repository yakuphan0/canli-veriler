import puppeteer from 'puppeteer';

async function scrapeFixtures() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.mackolik.com/puan-durumu/t%C3%BCrkiye-s%C3%BCper-lig/fikstur/48n1f56s9rt4kio02hm3yqfhc', { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Scrape fixtures
    const fix = await page.evaluate(() => {
        return "Loaded mackolik";
    });
    console.log(fix);
  } catch (error) {
    console.error("🔴 Scrape Error:", error.message);
  } finally {
    await browser.close();
  }
}
scrapeFixtures();
