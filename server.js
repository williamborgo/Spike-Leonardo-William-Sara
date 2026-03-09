const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5500;
const SECRET_KEY = "chiave_segreta_per_lo_spike";

app.use(cors());
app.use(bodyParser.json());

let db;

(async () => {
    db = await open({ filename: './database.sqlite', driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE, password TEXT);
        CREATE TABLE IF NOT EXISTS mood_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            user_id INTEGER, 
            mood INTEGER, 
            note TEXT, 
            date TEXT, 
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );
    `);
    
    // Server in ascolto SOLO DOPO che il database è pronto
    app.listen(PORT, () => {
        console.log("✅ Server pronto su porta 5500 e Database collegato.");
    });
})();

// Middleware per proteggere le rotte
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: "Token mancante" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Sessione scaduta, rientra" });
        req.user = user;
        next();
    });
};

// --- ROTTE ---
app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [req.body.email, hashedPassword]);
        res.json({ success: true });
    } catch (e) { res.status(400).json({ error: "Email già esistente" }); }
});

app.post('/api/login', async (req, res) => {
    const user = await db.get('SELECT * FROM users WHERE email = ?', [req.body.email]);
    if (user && await bcrypt.compare(req.body.password, user.password)) {
        const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY);
        res.json({ token });
    } else { res.status(400).json({ error: "Email o password sbagliati" }); }
});

app.post('/api/mood', authenticateToken, async (req, res) => {
    const { mood, note } = req.body;
    const today = new Date().toISOString().split('T')[0];
    try {
        const check = await db.get('SELECT id FROM mood_logs WHERE user_id = ? AND date = ?', [req.user.id, today]);
        if (check) return res.status(400).json({ error: "Hai già risposto oggi!" });
        
        await db.run('INSERT INTO mood_logs (user_id, mood, note, date) VALUES (?, ?, ?, ?)', [req.user.id, mood, note, today]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: "Errore database" }); }
});

app.get('/api/report', authenticateToken, async (req, res) => {
    const rows = await db.all('SELECT mood FROM mood_logs WHERE user_id = ?', [req.user.id]);
    const avg = rows.length ? (rows.reduce((a, b) => a + b.mood, 0) / rows.length).toFixed(1) : 0;
    res.json({ average: avg });
});

app.get('/api/history', authenticateToken, async (req, res) => {
    const rows = await db.all('SELECT mood, note, date FROM mood_logs WHERE user_id = ? ORDER BY id DESC LIMIT 7', [req.user.id]);
    res.json(rows);
});

// --- NUOVA ROTTA: Cancella l'umore di oggi (Versione Sicura) ---
app.delete('/api/mood/today', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        // Forza la cancellazione dell'umore di oggi per questo utente
        await db.run('DELETE FROM mood_logs WHERE user_id = ? AND date = ?', [req.user.id, today]);
        
        // Risponde sempre con successo
        res.json({ success: true, message: "Umore di oggi cancellato!" });
    } catch (err) { 
        res.status(500).json({ error: "Errore durante l'eliminazione." }); 
    }
});