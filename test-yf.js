import yahooFinance from 'yahoo-finance2';

async function testYF() {
    try {
        console.log("Q:", typeof yahooFinance.quote);
        const quote = await yahooFinance.quote('XU100.IS');
        console.log("🟢 BIST 100 YahooFinance2:", quote.regularMarketPrice);
    } catch(e) {
        console.error("🔴 YF2 Error:", e.name, e.message);
    }
}
testYF();
