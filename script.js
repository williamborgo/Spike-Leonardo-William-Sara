const API_URL = "http://localhost:5500/api";
let selectedMood = null;
let mioGrafico = null; 

// Controllo sessione
if (!localStorage.getItem('token') && !window.location.href.includes('login.html') && !window.location.href.includes('signup.html')) {
    window.location.href = "login.html";
}

// Seleziona Emoji
function selectMood(val, el) {
    selectedMood = val;
    document.querySelectorAll('.emoji-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
}

// Salva Umore
async function inviaUmore() {
    const note = document.getElementById('moodNote').value;
    if (!selectedMood) return alert("Scegli un'emoji!");

    const res = await fetch(`${API_URL}/mood`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ mood: selectedMood, note: note })
    });

    const data = await res.json();
    if (res.ok) {
        alert("Salvato!");
        caricaDati(); 
    } else {
        alert(data.error);
    }
}

// Carica Dati (Media, Tabella e Grafico)
async function caricaDati() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Carica Media
    const resRep = await fetch(`${API_URL}/report`, { headers: { 'Authorization': `Bearer ${token}` } });
    const dataRep = await resRep.json();
    document.getElementById('scoreDisplay').innerText = dataRep.average + " / 5";

    // Carica Tabella e Grafico
    const resHis = await fetch(`${API_URL}/history`, { headers: { 'Authorization': `Bearer ${token}` } });
    const dataHis = await resHis.json();
    const table = document.getElementById('historyBody');
    const emojis = { 1: "😫", 2: "😔", 3: "😐", 4: "🙂", 5: "😁" };

    table.innerHTML = dataHis.map(row => `
        <tr>
            <td>${row.date}</td>
            <td>${emojis[row.mood]}</td>
            <td>${row.note || '-'}</td>
        </tr>
    `).join('');

    disegnaGrafico(dataHis);
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = "login.html";
}

// Cancella l'umore di oggi
async function eliminaUmoreOggi() {
    if (!confirm("Sei sicuro di voler cancellare l'umore di oggi? Potrai inserirne uno nuovo.")) return;

    const res = await fetch(`${API_URL}/mood/today`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
    });

    const data = await res.json();
    if (res.ok) {
        alert("Umore di oggi cancellato con successo!");
        caricaDati(); 
    } else {
        alert(data.error);
    }
}

// --- FUNZIONE DEL GRAFICO ---
function disegnaGrafico(storicoDati) {
    if (storicoDati.length === 0) return;

    const datiOrdinati = [...storicoDati].reverse();
    const etichetteDate = datiOrdinati.map(row => row.date.substring(5)); 
    const valoriUmore = datiOrdinati.map(row => row.mood);

    const ctx = document.getElementById('moodChart').getContext('2d');

    // Sfumatura Viola
    let gradiente = ctx.createLinearGradient(0, 0, 0, 300);
    gradiente.addColorStop(0, 'rgba(157, 80, 187, 0.6)'); 
    gradiente.addColorStop(1, 'rgba(157, 80, 187, 0.0)'); 

    if (mioGrafico) {
        mioGrafico.destroy();
    }

    Chart.defaults.font.family = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

    mioGrafico = new Chart(ctx, {
        type: 'line', 
        data: {
            labels: etichetteDate,
            datasets: [{
                label: 'Il tuo andamento',
                data: valoriUmore,
                borderColor: '#9D50BB', // Linea Viola
                backgroundColor: gradiente, 
                borderWidth: 3, 
                tension: 0.4, 
                fill: true, 
                pointRadius: 6, 
                pointBackgroundColor: '#ffffff', 
                pointBorderColor: '#9D50BB', // Bordo dei pallini Viola
                pointBorderWidth: 2,
                pointHoverRadius: 8 
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#111111', // Titolo legenda scurito
                        font: { size: 14, weight: 'bold' }
                    }
                }
            },
            scales: {
                y: {
                    min: 1,
                    max: 5,
                    grid: { color: 'rgba(0, 0, 0, 0.05)' },
                    ticks: {
                        stepSize: 1,
                        color: '#000000', // Faccine nere/ben visibili
                        font: { size: 18 }, 
                        callback: function(value) {
                            const faccine = {1: '😫', 2: '😔', 3: '😐', 4: '🙂', 5: '😁'};
                            return faccine[value] || '';
                        }
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#333333', // Date scure sotto il grafico
                        font: { weight: 'bold' }
                    }
                }
            }
        }
    });
}

// Avvia al caricamento
if (document.getElementById('historyBody')) caricaDati();