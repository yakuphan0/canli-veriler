import * as cheerio from 'cheerio';

function getLogo(name) {
    if(name.includes('Galatasaray')) return 'https://upload.wikimedia.org/wikipedia/tr/3/37/Galatasaray_Spor_Kul%C3%BCb%C3%BC_Logosu.png';
    if(name.includes('Fenerbahçe')) return 'https://upload.wikimedia.org/wikipedia/tr/8/86/Fenerbah%C3%A7e_Spor_Kul%C3%BCb%C3%BC.png';
    if(name.includes('Beşiktaş')) return 'https://upload.wikimedia.org/wikipedia/tr/2/25/BJK_Amblem.png';
    if(name.includes('Trabzonspor')) return 'https://upload.wikimedia.org/wikipedia/tr/a/ab/TrabzonsporAmblemi.png';
    if(name.includes('Samsunspor')) return 'https://upload.wikimedia.org/wikipedia/tr/0/05/Samsunspor_logo.png';
    if(name.includes('Eyüpspor')) return 'https://upload.wikimedia.org/wikipedia/tr/d/da/Ey%C3%BCpspor_logosu.png';
    if(name.includes('Göztepe')) return 'https://upload.wikimedia.org/wikipedia/tr/d/d3/G%C3%B6ztepe_logosu.png';
    if(name.includes('Sivasspor')) return 'https://upload.wikimedia.org/wikipedia/tr/8/86/Sivasspor.png';
    if(name.includes('Alanyaspor')) return 'https://upload.wikimedia.org/wikipedia/tr/9/91/Alanyaspor_logo.png';
    if(name.includes('Konyaspor')) return 'https://upload.wikimedia.org/wikipedia/tr/5/5f/Konyaspor_logo.png';
    if(name.includes('Antalyaspor')) return 'https://upload.wikimedia.org/wikipedia/tr/e/eb/Antalyaspor_logo.png';
    if(name.includes('Başakşehir')) return 'https://upload.wikimedia.org/wikipedia/tr/1/1a/%C4%B0stanbul_Ba%C5%9Fak%C5%9Fehir_FK_Logosu.png';
    if(name.includes('Kasımpaşa')) return 'https://upload.wikimedia.org/wikipedia/tr/8/8b/Kas%C4%B1mpa%C5%9Fa_SK.png';
    if(name.includes('Gaziantep')) return 'https://upload.wikimedia.org/wikipedia/tr/0/07/Gaziantep_FK_logosu.png';
    if(name.includes('Rizespor')) return 'https://upload.wikimedia.org/wikipedia/tr/6/62/%C3%87aykur_Rizespor_logo.png';
    if(name.includes('Kayserispor')) return 'https://upload.wikimedia.org/wikipedia/tr/6/6c/Kayserispor_logo.png';
    if(name.includes('Hatayspor')) return 'https://upload.wikimedia.org/wikipedia/en/9/9c/Hatayspor_crest.png';
    if(name.includes('Bodrum')) return 'https://upload.wikimedia.org/wikipedia/tr/8/8e/Bodrum_FK_logosu.png';
    if(name.includes('Adana Demirspor')) return 'https://upload.wikimedia.org/wikipedia/tr/5/53/Adanademirspor_Logo.png';
    return 'https://upload.wikimedia.org/wikipedia/tr/b/b4/T%C3%BCrkiye_Futbol_Federasyonu_logo.png';
}

export const handler = async (event, context) => {
    try {
        const url = 'https://tr.wikipedia.org/wiki/2025-26_S%C3%BCper_Lig';
        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Accept': 'text/html'
            }
        });
        const data = await res.text();
        const $ = cheerio.load(data);
        
        const tableEl = $('#Puan_durumu').parent().nextAll('table.wikitable').first();
        const rows = tableEl.find('tbody tr');
        
        const table = [];
        rows.each((i, el) => {
            if (i === 0) return;
            const tds = $(el).find('th, td');
            const pos = tds.eq(0).text().trim();
            const teamName = tds.eq(1).text().trim();
            const played = tds.eq(2).text().trim();
            const pts = tds.eq(9).text().trim();
            
            if (teamName && parseInt(pos)) {
                table.push({ 
                    position: pos, 
                    team: { name: teamName, crest: getLogo(teamName) }, 
                    playedGames: played, 
                    points: pts 
                });
            }
        });

        if (table.length === 0) throw new Error("Empty table parsed");

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(table)
        };
    } catch(e) {
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({error: e.message})
        };
    }
};
