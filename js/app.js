// app.js
const INSTRUMENTS = {
    'XAUUSD': { name: 'XAUUSD', contractSize: 100, defaultPrice: 2500.00, pipSize: 0.10 },
    'EURUSD': { name: 'EURUSD', contractSize: 100000, defaultPrice: 1.0850, pipSize: 0.0001 }
};
let tradesArray = [];
function calculateLotSize() {
    const balance = parseFloat(document.getElementById('accountBalance')?.value || 10000);
    const riskVal = parseFloat(document.getElementById('riskValue')?.value || 1);
    const slPips = parseFloat(document.getElementById('stopLoss')?.value || 20);
    const riskUSD = balance * (riskVal / 100);
    const lotSize = Math.max(0.01, Math.round((riskUSD / (slPips * 0.1 * 100)) * 100) / 100);
    return lotSize;
}
