// ==========================================================================
// MTCS Pro — Арилжааны Тооцоолуур ба Тэмдэглэлийн Үндсэн Скрипт (app.js)
// Тайлбар: Арилжааны лот бодох, тэмдэглэл хадгалах, график зурах үндсэн логик.
// ==========================================================================

// Нийт бүртгэсэн арилжаануудыг хадгалах глобал жагсаалт (массив)
let tradesArray = [];
window.tradesArray = tradesArray;

// Графикийн обьектыг хадгалах хувьсагч
let equityChartInstance = null;

// Хуудас ачаалагдаж дуусах үед ажиллах эхлэлийн функцууд
document.addEventListener('DOMContentLoaded', function() {
    initNavigation();        // Цэсний шилжилт тохируулах
    initCalculator();        // Тооцоолуурыг бэлтгэх
    loadTradesFromStorage(); // Хадгалсан өгөгдлийг унших
    initPresets();           // Түргэн сонголтын товчлуурууд
});

// ==========================================================================
// 1. НАВИГАЦИ (Хуудас / Таб хооронд шилжих функц)
// ==========================================================================
window.switchTab = function(targetName) {
    // Цэсний бүх товчлууруудыг сонгож авах
    const navItems = document.querySelectorAll('.nav-item');
    // Хуудас тус бүрийн section хэсгүүдийг сонгох
    const sections = document.querySelectorAll('.view-section');

    // Сонгогдсон цэсийг идэвхжүүлж, бусдаас active ангийг хасах
    navItems.forEach(function(nav) {
        if (nav.dataset.target === targetName) {
            nav.classList.add('active');
        } else {
            nav.classList.remove('active');
        }
    });

    // Сонгосон хэсгийг харуулаад, бусдыг нь нуух
    sections.forEach(function(sec) {
        if (sec.id === 'view-' + targetName) {
            sec.classList.remove('hidden');
            sec.style.display = 'block';
        } else {
            sec.classList.add('hidden');
            sec.style.display = 'none';
        }
    });

    // Хэрэв Анализ хуудас руу орвол өсөлтийн графикийг шинэчилж зурах
    if (targetName === 'analytics') {
        setTimeout(window.renderEquityChart, 80);
    }
    if (targetName === 'leaderboard' && window.updateAnalytics) {
        window.updateAnalytics();
    }
};

// Цэсний товчлуур дээр дарах эвент холбох
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            if (item.dataset.target) {
                window.switchTab(item.dataset.target);
            }
        });
    });
}

// ==========================================================================
// 2. АРИЛЖААНЫ ХЭРЭГСЛҮҮДИЙН СТАНДАРТ ӨГӨГДӨЛ
// ==========================================================================
const INSTRUMENTS = {
    'XAUUSD': {
        name: 'XAUUSD',
        contractSize: 100,
        defaultPrice: 2500.00,
        pipSize: 0.10,
        unitText: ''
    },
    'EURUSD': {
        name: 'EURUSD',
        contractSize: 100000,
        defaultPrice: 1.0850,
        pipSize: 0.0001,
        unitText: ''
    },
    'GBPUSD': {
        name: 'GBPUSD',
        contractSize: 100000,
        defaultPrice: 1.2850,
        pipSize: 0.0001,
        unitText: ''
    },
    'US30': {
        name: 'US30',
        contractSize: 1,
        defaultPrice: 40000.00,
        pipSize: 1.0,
        unitText: ''
    },
    'BTCUSD': {
        name: 'BTCUSD',
        contractSize: 1,
        defaultPrice: 60000.00,
        pipSize: 1.0,
        unitText: ''
    }
};

// ==========================================================================
// 3. ТООЦООЛУУРЫН СИСТЕМ (Форм утга өөрчлөгдөх үед бодох)
// ==========================================================================
function initCalculator() {
    const calcForm = document.getElementById('calcForm');
    if (!calcForm) return;

    // Форм дээрх бүх input, select дээр өөрчлөлт орох үед тооцоолох
    const inputs = calcForm.querySelectorAll('input, select');
    inputs.forEach(function(input) {
        input.addEventListener('input', calculateLotSize);
        input.addEventListener('change', calculateLotSize);
    });

    // BUY болон SELL радио товч дээр дарах үед
    const dirRadios = document.querySelectorAll('input[name="direction"]');
    dirRadios.forEach(function(radio) {
        radio.addEventListener('change', calculateLotSize);
    });

    // Хадгалах товч дарахад ажиллах
    const btnSave = document.getElementById('btnLogTrade');
    if (btnSave) {
        btnSave.addEventListener('click', logTradeToJournal);
    }

    // Эхний ачаалалтаар анхны утгуудыг бодож харуулах
    calculateLotSize();
}

// Үндсэн лот ба эрсдэл бодох томьёо
function calculateLotSize() {
    // 1. Оролтын талбаруудаас утгуудыг тоон хэлбэрээр авах
    const balanceInput = document.getElementById('accountBalance');
    const leverageInput = document.getElementById('leverage');
    const riskTypeInput = document.getElementById('riskType');
    const riskValueInput = document.getElementById('riskValue');
    const instrumentInput = document.getElementById('instrument');
    const stopLossInput = document.getElementById('stopLoss');
    const entryPriceInput = document.getElementById('entryPrice');
    const rrRatioInput = document.getElementById('rrRatio');

    const bVal = parseFloat(balanceInput ? balanceInput.value : '');
    const balance = !isNaN(bVal) && bVal > 0 ? bVal : 10000;

    const levVal = parseFloat(leverageInput ? leverageInput.value : '');
    const leverage = !isNaN(levVal) && levVal > 0 ? levVal : 100;

    const riskType = riskTypeInput ? riskTypeInput.value : 'percent';

    const rVal = parseFloat(riskValueInput ? riskValueInput.value : '');
    const riskValue = !isNaN(rVal) && rVal >= 0.01 ? rVal : 1;

    const instrumentKey = instrumentInput ? instrumentInput.value : 'XAUUSD';

    const slVal = parseFloat(stopLossInput ? stopLossInput.value : '');
    const stopLossPips = !isNaN(slVal) && slVal > 0 ? slVal : 20;

    const epVal = parseFloat(entryPriceInput ? entryPriceInput.value : '');
    const entryPrice = !isNaN(epVal) && epVal > 0 ? epVal : 0;

    const rrVal = parseFloat(rrRatioInput ? rrRatioInput.value : '');
    const rrRatio = !isNaN(rrVal) && rrVal > 0 ? rrVal : 2;

    // Арилжааны чиглэл (BUY эсвэл SELL)
    const dirChecked = document.querySelector('input[name="direction"]:checked');
    const direction = dirChecked ? dirChecked.value : 'BUY';

    // Хэрэгслийн үзүүлэлт
    const spec = INSTRUMENTS[instrumentKey] || INSTRUMENTS['XAUUSD'];

    // 2. Эрсдэлийн хэмжээг доллар ($) ба хувиар бодох
    let riskUSD = 0;
    let riskPercent = 1;

    if (riskType === 'percent') {
        riskPercent = riskValue;
        riskUSD = balance * (riskValue / 100);
    } else {
        riskUSD = riskValue;
        riskPercent = balance > 0 ? (riskValue / balance) * 100 : 1;
    }

    // Эрсдэлийн үзүүлэлтийг шинэчлэх
    updateRiskMeter(riskPercent);

    // 3. Stop Loss-ийн доллар дахь зай = SL pips * 1 пипийн үнийн хэмжээ
    let slDistanceUSD = stopLossPips * spec.pipSize;
    if (slDistanceUSD <= 0) {
        slDistanceUSD = 0.01;
    }

    // 4. Үндсэн Лот бодох томьёо:
    // Лот = Эрсдэх Мөнгө / (SL зай * Гэрээний хэмжээ)
    let lotSize = riskUSD / (slDistanceUSD * spec.contractSize);
    // Хамгийн багадаа 0.01 лот, 2 оронгоор нарийвчилна
    lotSize = Math.max(0.01, Math.round(lotSize * 100) / 100);

    // 5. Барьцаа хөрөнгө (Margin) тооцоолох
    const effectivePrice = entryPrice > 0 ? entryPrice : spec.defaultPrice;
    const positionValue = lotSize * spec.contractSize * effectivePrice;
    const marginUSD = positionValue / leverage;

    // 6. 1 пип хөдлөхөд гарах үр дүн ($)
    const pipValueUSD = spec.pipSize * spec.contractSize * lotSize;

    // 7. Боломжит зорилтот ашиг (Target Profit)
    const targetProfitUSD = riskUSD * rrRatio;

    // 8. Stop Loss болон Take Profit үнэ бодох
    let slPrice = 0;
    let tpPrice = 0;
    const tpDistanceUSD = slDistanceUSD * rrRatio;

    if (direction === 'BUY') {
        slPrice = effectivePrice - slDistanceUSD;
        tpPrice = effectivePrice + tpDistanceUSD;
    } else {
        slPrice = effectivePrice + slDistanceUSD;
        tpPrice = effectivePrice - tpDistanceUSD;
    }

    // Нарийвчлалыг тохируулах (Евро, Фунт бол 4 орон, бусад нь 2 орон)
    const decimals = spec.pipSize < 0.01 ? 4 : 2;
    const slText = entryPrice > 0 ? slPrice.toFixed(decimals) : '--';
    const tpText = entryPrice > 0 ? tpPrice.toFixed(decimals) : '--';

    // 9. Дэлгэцийн элементүүдийг шинэчлэх (DOM Update)
    setElementText('calcLotSize', lotSize.toFixed(2));
    setElementText('lotUnitText', '');
    setElementText('calcRiskAmount', `-$${riskUSD.toFixed(2)}`);
    setElementText('calcTargetProfit', `+$${targetProfitUSD.toFixed(2)}`);
    setElementText('calcMargin', `$${marginUSD.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    setElementText('calcPipValue', `$${pipValueUSD.toFixed(2)}`);
    setElementText('calcSlPrice', slText);
    setElementText('calcTpPrice', tpText);
    setElementText('calcRRDisplay', '1 : ' + parseFloat(rrRatio).toFixed(1));

    // R:R түргэн сонголтын товчлуурыг идэвхжүүлэх
    const rrChips = document.querySelectorAll('.btn-rr-chip');
    rrChips.forEach(function(btn) {
        if (parseFloat(btn.dataset.rr) === parseFloat(rrRatio)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Текст солих энгийн туслах функц
function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

// Эрсдэлийн түвшинг шалгах энгийн функц
function updateRiskMeter(riskPct) {
    const badge = document.getElementById('riskMeterBadge');
    const bar = document.getElementById('riskBarFill');
    if (!badge || !bar) return;

    const fillWidth = Math.min(100, Math.max(10, (riskPct / 5) * 100));
    bar.style.width = fillWidth + '%';

    bar.className = 'risk-bar-fill';
    badge.className = 'risk-badge';

    if (riskPct <= 1.05) {
        bar.classList.add('safe');
        badge.classList.add('badge-safe');
        badge.textContent = riskPct.toFixed(1) + '%';
    } else if (riskPct <= 3.0) {
        bar.classList.add('moderate');
        badge.classList.add('badge-moderate');
        badge.textContent = riskPct.toFixed(1) + '%';
    } else {
        bar.classList.add('danger');
        badge.classList.add('badge-danger');
        badge.textContent = riskPct.toFixed(1) + '%';
    }
}

// ==========================================================================
// 4. ТҮРГЭН СОНГОЛТЫН ТОВЧЛУУРУУД (Presets)
// ==========================================================================
function initPresets() {
    window.fillMarketPreset = function(symbol, price, sl) {
        const instEl = document.getElementById('instrument');
        const entryEl = document.getElementById('entryPrice');
        const slEl = document.getElementById('stopLoss');

        if (instEl) instEl.value = symbol;
        if (entryEl) entryEl.value = price;
        if (slEl) slEl.value = sl;

        calculateLotSize();
        showToast(symbol);
    };

    window.setRR = function(val) {
        const rrInput = document.getElementById('rrRatio');
        if (rrInput) {
            rrInput.value = val;
        }
        calculateLotSize();
        showToast('1:' + val);
    };
}

// ==========================================================================
// 5. ЛОТ ХУУЛАХ ФУНКЦ (Copy to Clipboard)
// ==========================================================================
window.copyLotSize = function() {
    const lotSizeEl = document.getElementById('calcLotSize');
    const lotSize = lotSizeEl ? lotSizeEl.textContent : '0.01';

    if (navigator.clipboard) {
        navigator.clipboard.writeText(lotSize).then(function() {
            showToast('Хуулагдлаа');
        }).catch(function() {
            fallbackCopy(lotSize);
        });
    } else {
        fallbackCopy(lotSize);
    }
};

function fallbackCopy(text) {
    const temp = document.createElement('textarea');
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand('copy');
    document.body.removeChild(temp);
    showToast('Хуулагдлаа');
}

// Энгийн мэдэгдэл харуулах туслах функц
function showToast(msg) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.style.opacity = '1';

    setTimeout(function() {
        toast.style.opacity = '0';
        setTimeout(function() {
            toast.classList.add('hidden');
        }, 300);
    }, 2000);
}

// ==========================================================================
// 6. ТЭМДЭГЛЭЛД ХАДГАЛАХ БА УДИРДАХ (Trade Journal)
// ==========================================================================
function logTradeToJournal() {
    const lotSize = document.getElementById('calcLotSize')?.textContent || '0.01';
    const instrument = document.getElementById('instrument')?.value || 'XAUUSD';
    const entryPrice = document.getElementById('entryPrice')?.value || '--';
    const riskTxt = document.getElementById('calcRiskAmount')?.textContent || '-$100.00';
    const profitTxt = document.getElementById('calcTargetProfit')?.textContent || '+$200.00';

    const riskUSD = parseFloat(riskTxt.replace(/[^0-9.]/g, '')) || 100;
    const targetProfitUSD = parseFloat(profitTxt.replace(/[^0-9.]/g, '')) || 200;

    const dirRadio = document.querySelector('input[name="direction"]:checked');
    const direction = dirRadio ? dirRadio.value : 'BUY';

    // Шинэ арилжааны өгөгдлийг үүсгэх
    const newTrade = {
        id: Date.now(),                               // Цагаар тодорхойлох давтагдашгүй дугаар
        date: new Date().toLocaleDateString(