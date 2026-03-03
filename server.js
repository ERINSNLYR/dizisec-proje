const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// SİTENİN TASARIMINI YAYINLAMA KODU (Bu tek başına yeterli)
app.use(express.static(__dirname));

const MONGO_URI = "mongodb+srv://erinslyr:711Acar2641.@cluster0.1ulgvt3.mongodb.net/dizisec?retryWrites=true&w=majority";

mongoose.connect(MONGO_URI)
  .then(() => console.log("MongoDB'ye başarıyla bağlandı! 🚀"))
  .catch(err => console.log("MongoDB Bağlantı hatası:", err));

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  favorites: { type: Array, default: [] }
});
const User = mongoose.model('User', UserSchema);

app.post('/api/kayit', async (req, res) => {
  const { username, password } = req.body;
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) return res.json({ hata: "Bu kullanıcı adı zaten alınmış." });
    
    const newUser = new User({ username, password });
    await newUser.save();
    res.json({ mesaj: "Kayıt başarılı! Giriş yapabilirsiniz." });
  } catch (err) {
    res.json({ hata: "Kayıt sırasında hata oluştu." });
  }
});

app.post('/api/giris', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ userId: user._id });
  } else {
    res.json({ hata: "Hatalı kullanıcı adı veya şifre!" });
  }
});

app.get('/api/favoriler', async (req, res) => {
  const { userId } = req.query;
  const user = await User.findById(userId);
  res.json(user ? user.favorites : []);
});

app.post('/api/favoriler', async (req, res) => {
  const { userId, item } = req.body;
  const user = await User.findById(userId);
  
  if (!user) return res.json({ hata: "Kullanıcı bulunamadı" });

  const isFav = user.favorites.find(fav => fav.id === item.id);
  if (isFav) {
    user.favorites = user.favorites.filter(fav => fav.id !== item.id);
    await user.save();
    res.json({ status: "removed" });
  } else {
    user.favorites.push(item);
    await user.save();
    res.json({ status: "added" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Sunucu ${PORT} portunda çalışıyor.`));
