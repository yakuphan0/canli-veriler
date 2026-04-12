import yahooFinance from 'yahoo-finance2';

export const handler = async (event, context) => {
    try {
        const quote = await yahooFinance.quote('XU100.IS');
        if (!quote) throw new Error("Quote not found");
        
        const data = { close: quote.regularMarketPrice, change: quote.regularMarketChangePercent };

        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify(data)
        };
    } catch (e) {
        console.error('Yahoo Finance2 Netlify Error:', e.message);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
            body: JSON.stringify({ error: e.message })
        };
    }
};
