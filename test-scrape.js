import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeFixtures() {
    try {
        const url = 'https://www.sporx.com/super-lig-fiksturu-ve-mac-sonuclari';
        const { data } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html'
            }
        });
        
        const $ = cheerio.load(data);
        const matches = [];
        
        $('.fixture-match').each((i, el) => {
            const home = $(el).find('.home').text().trim();
            const away = $(el).find('.away').text().trim();
            const score = $(el).find('.score').text().trim();
            if(home) {
                matches.push({ home, away, score });
            }
        });
        
        console.log("Sporx Matches:", matches.length);
        if(matches.length > 0) console.log(matches.slice(0, 3));
    } catch(e) {
        console.error("Sporx Scrape Error:", e.message);
    }
}
scrapeFixtures();
