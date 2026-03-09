const API_URL = "http://localhost:5500/api";
let selectedMood = null;

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
        location.reload(); // Aggiorna tutto
    } else {
        alert(data.error);
    }
}

// Carica Dati (Media e Tabella)
async function caricaDati() {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Carica Media
    const resRep = await fetch(`${API_URL}/report`, { headers: { 'Authorization': `Bearer ${token}` } });
    const dataRep = await resRep.json();
    document.getElementById('scoreDisplay').innerText = dataRep.average + " / 5";

    // Carica Tabella
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
}

function logout() {
    localStorage.removeItem('token');
    window.location.href = "login.html";
}

// --- NUOVA FUNZIONE: Cancella l'umore di oggi ---
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
        location.reload(); // Ricarica la pagina per aggiornare tutto
    } else {
        alert(data.error);
    }
}

// Avvia al caricamento
if (document.getElementById('historyBody')) caricaDati();