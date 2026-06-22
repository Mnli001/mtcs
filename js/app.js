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
            if (item.dataset.tar