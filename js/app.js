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
    const stopLossPips = !i