let weatherChartInstance = null;
let currentTab = 'teplota';
let liveRecordsArray = null; 
let activeCamera = 1;
let generatedDaysData = {}; 

const units = { 'teplota': ' °C', 'tlak': ' hPa', 'vlhkost': ' %', 'vietor': ' m/s' };
const dniVTyzdni = ["Nedeľa", "Pondelok", "Utorok", "Streda", "Štvrtok", "Piatok", "Sobota"];

// Odkazy na mapové vrstvy podľa vybranej meteorologickej veličiny
const mapCoordinates = {
    'teplota': 'https://openweathermap.org/weathermap?basemap=map&cities=false&layer=temperature&lat=48.31&lon=18.09&zoom=8',
    'tlak':    'https://openweathermap.org/weathermap?basemap=map&cities=false&layer=pressure&lat=48.31&lon=18.09&zoom=8',
    'vlhkost': 'https://openweathermap.org/weathermap?basemap=map&cities=false&layer=precipitation&lat=48.31&lon=18.09&zoom=8',
    'vietor':  'https://openweathermap.org/weathermap?basemap=map&cities=false&layer=wind&lat=48.31&lon=18.09&zoom=8'
};

function loadHistoryDays(pocetDni) {
    const btn5 = document.getElementById('btn-5d');
    const btn10 = document.getElementById('btn-10d');
    if(btn5) btn5.classList.toggle('active', pocetDni === 5);
    if(btn10) btn10.classList.toggle('active', pocetDni === 10);

    const container = document.getElementById('days-container');
    if(!container) return;
    container.innerHTML = '';
    generatedDaysData = {}; 

    const dnes = new Date();
    let unit = units[currentTab];

    for (let i = 0; i < pocetDni; i++) {
        let targetDate = new Date(dnes);
        targetDate.setDate(dnes.getDate() - i);
        
        let nazovDna = dniVTyzdni[targetDate.getDay()];
        let den = String(targetDate.getDate()).padStart(2, '0');
        let mesiac = String(targetDate.getMonth() + 1).padStart(2, '0');
        let datumString = `${den}.${mesiac}.`;

        if (i === 0) nazovDna = "Dnes (" + nazovDna + ")";

        let priemer = currentTab === 'teplota' ? (22 - i * 0.7).toFixed(1) : currentTab === 'tlak' ? (1015 + i * 2).toFixed(0) : (52 + i * 3).toFixed(0);
        let p = parseFloat(priemer);
        
        generatedDaysData[i] = {
            values: [p-3, p-4, p-1, p+1, p+3, p+2, p-1, p-2],
            labels: ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"]
        };

        const dayRow = document.createElement('div');
        dayRow.style.background = 'rgba(255, 255, 255, 0.25)';
        dayRow.style.borderRadius = '12px';
        dayRow.style.overflow = 'hidden';
        dayRow.style.border = '1px solid var(--glass-border)';
        
        dayRow.innerHTML = `
            <button class="day-header ${i===0 ? 'active-day' : ''}" style="width:100%; padding:12px 16px; background:transparent; border:none; display:flex; justify-content:space-between; font-weight:700; color:var(--text-dark); cursor:pointer;" onclick="selectDayAndToggle(this, ${i}, '${nazovDna} ${datumString}')">
                <span>📅 ${nazovDna} <b>(${datumString})</b></span>
                <span style="color:var(--accent-blue)">Priemer: ${priemer}${unit} ▼</span>
            </button>
            <div class="day-details">
                <table style="width:100%; border-collapse:collapse; font-size:13px; color:var(--text-dark);">
                    <tr><td style="padding:6px 0; color:var(--text-muted);">Ráno (08:00)</td><td align="right"><b>${(p-2).toFixed(1)}${unit}</b></td></tr>
                    <tr><td style="padding:6px 0; color:var(--text-muted);">Cez deň (14:00)</td><td align="right"><b>${(p+3).toFixed(1)}${unit}</b></td></tr>
                    <tr><td style="padding:6px 0; color:var(--text-muted);">Večer (20:00)</td><td align="right"><b>${p.toFixed(1)}${unit}</b></td></tr>
                </table>
            </div>
        `;
        container.appendChild(dayRow);
    }
}

function selectDayAndToggle(buttonElement, dayIndex, fullDayLabel) {
    document.querySelectorAll('.day-header').forEach(el => el.classList.remove('active-day'));
    buttonElement.classList.add('active-day');

    const details = buttonElement.nextElementSibling;
    const isNowOpen = details.classList.contains('open');
    
    document.querySelectorAll('.day-details').forEach(el => el.classList.remove('open'));

    if (!isNowOpen) {
        details.classList.add('open');
    }

    document.getElementById('chart-title').innerText = `Grafický vývoj (${fullDayLabel})`;
    
    if (dayIndex === 0 && liveRecordsArray) {
        displayComponentData(liveRecordsArray);
    } else if (generatedDaysData[dayIndex]) {
        updateChartWithData(generatedDaysData[dayIndex].values, generatedDaysData[dayIndex].labels);
    }
}

function switchTab(buttonElement, tabId, label, camId = 1) {
    if (tabId === 'kamery') {
        activeCamera = camId;
        document.getElementById('camera-title').innerText = `Živý záber - Kamera ${activeCamera}`;
    } else {
        document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
        if (buttonElement && buttonElement.classList.contains('menu-btn')) {
            buttonElement.classList.add('active');
        }
    }

    currentTab = tabId;
    
    const secWeather = document.getElementById('weather-section');
    const secCamera = document.getElementById('camera-section');
    
    if (tabId === 'kamery') {
        if(secWeather) secWeather.style.display = 'none';
        if(secCamera) secCamera.style.display = 'block';
        loadCameraImage();
    } else {
        if(secCamera) secCamera.style.display = 'none';
        if(secWeather) secWeather.style.display = 'block';
        document.getElementById('main-title').innerText = label;
        
        // Zmena mapy pri kliknutí na veličinu v menu
        const mapIframe = document.getElementById('map-iframe');
        if(mapIframe && mapCoordinates[tabId]) {
            mapIframe.src = mapCoordinates[tabId];
            document.getElementById('map-title').innerText = `Meteorologická mapa pre: ${label} - Nitra`;
        }

        if (liveRecordsArray) displayComponentData(liveRecordsArray);
        loadHistoryDays(5);
    }
}

function fetchLiveData() {
    const url = "http://127.0.0.1:5000/api/live";
    fetch(url)
    .then(response => response.json())
    .then(data => {
        if (data && data.rows && data.rows.length > 0) {
            liveRecordsArray = data.rows;
            displayComponentData(liveRecordsArray);
        } else {
            generateMockData();
        }
    })
    .catch(() => generateMockData());
}

function displayComponentData(records) {
    if (!records || records.length === 0) return;
    
    let latestRecord = records[0];
    let rawValue = null;
    let unit = units[currentTab] || "";

    if (currentTab === 'teplota') rawValue = latestRecord.temperature ?? latestRecord.temperature_air;
    else if (currentTab === 'tlak') rawValue = latestRecord.pressure;
    else if (currentTab === 'vlhkost') rawValue = latestRecord.humidity;
    else if (currentTab === 'vietor') rawValue = latestRecord.wind_speed ?? latestRecord.wind_speed_avg;

    if (rawValue !== null && rawValue !== undefined) {
        const liveValEl = document.getElementById('live-value');
        if(liveValEl) liveValEl.innerText = parseFloat(rawValue).toFixed(1) + unit;
    }
    
    let timeString = latestRecord.timestamp ? latestRecord.timestamp.split(' ')[1] : new Date().toLocaleTimeString();
    const stTimeEl = document.getElementById('station-time');
    const syncEl = document.getElementById('last-sync');
    if(stTimeEl) stTimeEl.innerText = `Čas merania stanice: ${timeString}`;
    if(syncEl) syncEl.innerText = `Posledná synchronizácia: ${new Date().toLocaleTimeString()}`;

    if (currentTab !== 'kamery') {
        let realValues = [];
        let realLabels = [];
        let lastSeenHour = -1;
        let reversedRecords = [...records].reverse();

        reversedRecords.forEach(rec => {
            let val = null;
            if (currentTab === 'teplota') val = rec.temperature ?? rec.temperature_air;
            else if (currentTab === 'tlak') val = rec.pressure;
            else if (currentTab === 'vlhkost') val = rec.humidity;
            else if (currentTab === 'vietor') val = rec.wind_speed ?? rec.wind_speed_avg;

            if (val !== null && val !== undefined) {
                let fullTimestamp = rec.timestamp ? rec.timestamp.split(' ')[1] : ""; 
                if (fullTimestamp) {
                    let hour = parseInt(fullTimestamp.split(':')[0]);
                    if (hour !== lastSeenHour) {
                        realValues.push(parseFloat(val));
                        realLabels.push(`${String(hour).padStart(2, '0')}:00`);
                        lastSeenHour = hour;
                    }
                }
            }
        });

        if (realValues.length > 0) {
            updateChartWithData(realValues, realLabels);
        }
    }
}

function updateChartWithData(dataPoints, labelsPoints) {
    const canvas = document.getElementById('weatherChart');
    if (!canvas || currentTab === 'kamery') return;
    const ctx = canvas.getContext('2d');
    
    if (weatherChartInstance) weatherChartInstance.destroy();

    let label = document.getElementById('main-title').innerText;

    weatherChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labelsPoints, 
            datasets: [{
                label: `${label} (${units[currentTab].trim()})`,
                data: dataPoints, 
                borderColor: '#2563eb',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.25,
                pointBackgroundColor: '#2563eb',
                pointBorderColor: '#ffffff',
                pointHoverRadius: 6
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(0, 0, 0, 0.05)' }, ticks: { color: '#1e293b' } },
                x: { grid: { display: false }, ticks: { color: '#1e293b' } }
            }
        }
    });
}

function loadCameraImage() {
    const imgElement = document.getElementById('camera-img');
    const loadingPlaceholder = document.getElementById('camera-loading');
    if (!imgElement) return;

    loadingPlaceholder.style.display = 'flex';
    imgElement.style.display = 'none';

    const srcUrl = activeCamera === 1 
        ? "http://127.0.0.1:5000/api/camera1?t=" 
        : "http://127.0.0.1:5000/api/camera2?t=";

    imgElement.src = srcUrl + new Date().getTime();
    imgElement.onload = () => {
        loadingPlaceholder.style.display = 'none';
        imgElement.style.display = 'block';
    };
}

function handleCameraError() {
    const loadingPlaceholder = document.getElementById('camera-loading');
    if (loadingPlaceholder) {
        loadingPlaceholder.innerHTML = `❌ <p style='margin-top:10px; color: #dc2626;'>Kamera ${activeCamera} je nedostupná.</p>`;
    }
}

function generateMockData() {
    if (!liveRecordsArray) {
        liveRecordsArray = [
            { temperature: 23.4, pressure: 1015.2, humidity: 48, wind_speed: 2.4, timestamp: "2026-06-04 10:00:00" },
            { temperature: 24.1, pressure: 1015.0, humidity: 46, wind_speed: 3.1, timestamp: "2026-06-04 11:00:00" },
            { temperature: 25.0, pressure: 1014.5, humidity: 42, wind_speed: 2.8, timestamp: "2026-06-04 12:00:00" }
        ];
    }
    displayComponentData(liveRecordsArray);
}

window.onload = function() {
    fetchLiveData();
    loadHistoryDays(5); 
    setInterval(fetchLiveData, 30000);
};
// ... (všetok tvoj doterajší JS kód zostáva rovnaký) ...

function toggleFullscreen() {
    const cameraContainer = document.getElementById('camera-container-element');
    if (!cameraContainer) return;

    if (!document.fullscreenElement) {
        // Ak nie je vo fullscreen, zapni ho
        if (cameraContainer.requestFullscreen) {
            cameraContainer.requestFullscreen();
        } else if (cameraContainer.mozRequestFullScreen) { /* Firefox */
            cameraContainer.mozRequestFullScreen();
        } else if (cameraContainer.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            cameraContainer.webkitRequestFullscreen();
        } else if (cameraContainer.msRequestFullscreen) { /* IE/Edge */
            cameraContainer.msRequestFullscreen();
        }
    } else {
        // Ak už je vo fullscreen, ukonči ho
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}