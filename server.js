const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database('./movies.db');

db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE, password TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS favorites (id INTEGER, user_id INTEGER, title TEXT, poster_path TEXT, mediaType TEXT)");
});

// KAYIT OL
app.post('/api/kayit', (req, res) => {
  const { username, password } = req.body;
  db.run("INSERT INTO users (username, password) VALUES (?, ?)", [username, password], function(err) {
    if (err) return res.status(400).json({ hata: "Bu kullanıcı adı zaten alınmış!" });
    res.json({ mesaj: "Kayıt başarılı!", userId: this.lastID });
  });
});

// GİRİŞ YAP
app.post('/api/giris', (req, res) => {
  const { username, password } = req.body;
  db.get("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, row) => {
    if (row) res.json({ mesaj: "Giriş başarılı!", userId: row.id, username: row.username });
    else res.status(401).json({ hata: "Hatalı kullanıcı adı veya şifre!" });
  });
});

// 1. KİŞİYE ÖZEL FAVORİLERİ GETİR
app.get('/api/favoriler', (req, res) => {
  const userId = req.query.userId;
  db.all("SELECT * FROM favorites WHERE user_id = ?", [userId], (err, rows) => {
    res.json(rows || []);
  });
});

// 2. KİŞİYE ÖZEL FAVORİ EKLE/ÇIKAR
app.post('/api/favoriler', (req, res) => {
  const { item, userId } = req.body;
  const title = item.title || item.name;

  db.get("SELECT id FROM favorites WHERE id = ? AND user_id = ?", [item.id, userId], (err, row) => {
    if (row) {
      db.run("DELETE FROM favorites WHERE id = ? AND user_id = ?", [item.id, userId], () => res.json({ status: "removed" }));
    } else {
      db.run("INSERT INTO favorites (id, user_id, title, poster_path, mediaType) VALUES (?, ?, ?, ?, ?)", 
      [item.id, userId, title, item.poster_path, item.mediaType], () => res.json({ status: "added" }));
    }
  });
});

app.listen(PORT, () => console.log(`Sunucu http://localhost:${PORT} adresinde ayaklandı!`));