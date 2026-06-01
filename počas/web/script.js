// Globálne inštancie a premenné
let weatherChartInstance = null;
let currentTab = 'teplota';
let liveRecordData = null;

// Jednotky merania
const units = {
    'teplota': ' °C',
    'tlak': ' hPa',
    'vlhkost': ' %',
    'vietor': ' m/s'
};

// Prepínanie medzi kartami (veličinami a kamerou)
function switchTab(buttonElement, tabId, label) {
    // Aktualizácia aktívneho stavu tlačidiel v menu
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    buttonElement.classList.add('active');

    currentTab = tabId;
    document.getElementById('main-title').innerText = label;

    // Skrytie/Zobrazenie správnej sekcie
    if (tabId === 'kamery') {
        document.getElementById('weather-section').classList.remove('active');
        document.getElementById('camera-section').classList.add('active');
        loadCameraImage();
    } else {
        document.getElementById('camera-section').classList.remove('active');
        document.getElementById('weather-section').classList.add('active');
        
        // Ak už máme dáta, ihneď ich prepočítame pre vybranú záložku
        if (liveRecordData) {
            displayComponentData(liveRecordData);
        }
        updateChart();
    }
}

// Funkcia na čisté sťahovanie živých dát (ČISTÝ FETCH)
function fetchLiveData() {
    const url = "https://projekttb.sksnr.sk/data/api.php?source=0&sort=timestamp&dir=desc&limit=1";
    
    // Konfigurácia Basic Auth priamo v hlavičke
    const headers = new Headers();
    headers.set('Authorization', 'Basic ' + btoa('sks:kolbe')); 

    fetch(url, { 
        method: 'GET', 
        headers: headers 
    })
    .then(response => {
        if (!response.ok) throw new Error("Meteostanica vrátila neplatnú odpoveď");
        return response.json();
    })
    .then(data => {
        if (data && data.rows && data.rows.length > 0) {
            liveRecordData = data.rows[0];
            displayComponentData(liveRecordData);
            
            // Ak máme otvorenú kameru, aktualizujeme aj tú
            if (currentTab === 'kamery') {
                loadCameraImage();
            }
        } else {
            generateMockData();
        }
    })
    .catch(err => {
        console.warn("CORS blokácia alebo výpadok sieci. Spúšťam vizuálnu simuláciu dát:", err);
        generateMockData();
    });
}

// Zobrazenie stiahnutých dát na hlavnú kartu aplikácie
function displayComponentData(record) {
    let rawValue = "--";
    let unit = units[currentTab] || "";

    // Mapovanie hodnôt z tvojho API JSONu
    if (currentTab === 'teplota') rawValue = record.temperature;
    else if (currentTab === 'tlak') rawValue = record.pressure;
    else if (currentTab === 'vlhkost') rawValue = record.humidity;
    else if (currentTab === 'vietor') rawValue = record.wind_speed;

    if (typeof rawValue === 'number') {
        rawValue = rawValue.toFixed(1);
    }

    // Vpísanie hodnoty a času
    document.getElementById('live-value').innerText = rawValue + unit;
    
    let timeString = record.timestamp ? record.timestamp.split(' ')[1] : '--:--:--';
    document.getElementById('station-time').innerText = `Čas merania stanice: ${timeString}`;
    document.getElementById('last-sync').innerText = `Posledná synchronizácia: ${new Date().toLocaleTimeString()}`;

    // Po každom úspešnom stiahnutí dát aktualizujeme aj graf
    if (currentTab !== 'kamery') {
        updateChart();
    }
}

// Načítanie a automatická obnova kamery
function loadCameraImage() {
    const imgElement = document.getElementById('camera-img');
    const loadingPlaceholder = document.getElementById('camera-loading');
    
    if (!imgElement) return;

    loadingPlaceholder.style.display = 'flex';
    imgElement.style.display = 'none';

    // Snímka kamery z tvojej stanice s timestampom proti kešovaniu prehliadača
    const cameraUrl = "https://projekttb.sksnr.sk/data/camera.jpg?t=" + new Date().getTime();

    imgElement.src = cameraUrl;
    imgElement.onload = function() {
        loadingPlaceholder.style.display = 'none';
        imgElement.style.display = 'block';
    };
}

// Spracovanie chyby, ak by kamera vypadla
function handleCameraError() {
    const loadingPlaceholder = document.getElementById('camera-loading');
    if (loadingPlaceholder) {
        loadingPlaceholder.innerHTML = "❌ <p style='margin-top:10px;'>Kamera je momentálne nedostupná.</p>";
    }
}

// Záložné dáta pre prípad, že si stránku pustíš len lokálne bez servera (CORS ochrana prehliadača)
function generateMockData() {
    liveRecordData = {
        temperature: 21.8,
        pressure: 1018.4,
        humidity: 42,
        wind_speed: 2.8,
        timestamp: "2026-06-01 09:15:00"
    };
    displayComponentData(liveRecordData);
}

// Aktualizácia a vykreslenie moderného grafu pomocou Chart.js
function updateChart() {
    const canvas = document.getElementById('weatherChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (weatherChartInstance) {
        weatherChartInstance.destroy();
    }

    let label = document.getElementById('main-title').innerText;
    let chartValueData = [];
    let timeLabels = ["02:00", "05:00", "08:00", "11:00", "14:00", "17:00", "20:00", "23:00"];

    let currentLiveVal = 0;
    if (liveRecordData) {
        if (currentTab === 'teplota') currentLiveVal = liveRecordData.temperature;
        else if (currentTab === 'tlak') currentLiveVal = liveRecordData.pressure;
        else if (currentTab === 'vlhkost') currentLiveVal = liveRecordData.humidity;
        else if (currentTab === 'vietor') currentLiveVal = liveRecordData.wind_speed;
    }

    // Príprava hodnôt pre simuláciu dňa + započítanie ostrej live hodnoty do grafu
    if (currentTab === 'teplota') chartValueData = [14.2, 13.8, 16.5, 19.8, currentLiveVal || 21.8, 20.4, 18.1, 15.3];
    else if (currentTab === 'tlak') chartValueData = [1015, 1016, 1017, 1018, currentLiveVal || 1018.4, 1019, 1018, 1017];
    else if (currentTab === 'vlhkost') chartValueData = [65, 62, 55, 46, currentLiveVal || 42, 45, 52, 58];
    else if (currentTab === 'vietor') chartValueData = [1.5, 1.8, 2.2, 2.5, currentLiveVal || 2.8, 3.1, 2.4, 1.6];

    if (currentTab === 'kamery') return;

    // Elegantný polopriehľadný farebný prechod (gradient) pod čiarou grafu
    let gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(79, 70, 229, 0.3)');
    gradient.addColorStop(1, 'rgba(79, 70, 229, 0.0)');

    weatherChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: `${label} (${units[currentTab].trim()})`,
                data: chartValueData,
                borderColor: '#4f46e5',
                backgroundColor: gradient,
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#4f46e5',
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    grid: { color: 'rgba(0, 0, 0, 0.04)' },
                    beginAtZero: false
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

// Inicializácia pri načítaní
window.onload = function() {
    fetchLiveData();
    // Automaticky sťahuj nové dáta z API každých 30 sekúnd
    setInterval(fetchLiveData, 30000);
};