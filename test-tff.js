import axios from 'axios';
import * as cheerio from 'cheerio';

async function testTFF() {
    try {
        const url = 'https://www.tff.org/default.aspx?pageID=198';
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);

        // find table inside an element with ID or class (e.g., .PuanDurumu)
        const table = [];
        $('#ctl00_MPane_m_198_1890_ctnr_m_198_1890_Panel1 table tr').each((i, el) => {
           if(i === 0) return; // headers
           const tds = $(el).find('td');
           if(tds.length < 5) return;
           const pos = tds.eq(0).text().trim();
           // In TFF, the first TD is usually row no, the second contains an `a` tag or text.
           const team = tds.eq(1).text().trim() || tds.eq(2).text().trim();
           const pts = tds.eq(tds.length-1).text().trim();
           if(team) table.push({ pos, team, pts });
        });

        console.log("🟢 TFF Table entries:", table.length);
        if(table.length > 0) console.log(table.slice(0,3));

    } catch(e) {
        console.error("🔴 TFF Error:", e.message);
    }
}
testTFF();
