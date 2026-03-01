console.log("%cDESIGNED BY SAMET ACAR", "color: #ff4757; font-size: 20px; font-weight: bold; border: 1px solid #ff4757; padding: 5px;");

const API_KEY = "a561c1baca23a6be5680b3eaf4930018";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKEND_URL = "https://dizisec-proje.onrender.com";

const results = document.getElementById("results");
const searchInput = document.getElementById("searchInput");

let activeCategory = "ALL";
let favorites = [];
let currentUser = localStorage.getItem('userId') || null;

// BAŞLANGIÇTA VE GİRİŞ YAPILDIĞINDA FAVORİLERİ ÇEK
async function loadFavorites() {
  if (!currentUser) {
    favorites = [];
    return;
  }
  try {
    const res = await fetch(`${BACKEND_URL}/api/favoriler?userId=${currentUser}`);
    favorites = await res.json();
  } catch (err) {
    console.error("Backend'e bağlanılamadı.");
  }
}
loadFavorites();

const GENRES = { ALL: null, Drama: 18, Thriller: 53, Mystery: 9648, Crime: 80, "Sci-Fi": 878 };

async function searchTMDB() {
  const query = searchInput.value.trim();
  if (!query) return;

  results.innerHTML = "<p style='width:100%; text-align:center;'>Yükleniyor...</p>";

  try {
    const searchRes = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=tr-TR&query=${query}`);
    const searchData = await searchRes.json();

    if (searchData.results.length === 0) {
      results.innerHTML = "<p style='width:100%; text-align:center;'>Maalesef sonuç bulunamadı.</p>";
      return;
    }

    const mainItem = searchData.results[0];
    const mediaType = mainItem.media_type || (mainItem.name ? 'tv' : 'movie'); 

    const similarRes = await fetch(`${BASE_URL}/${mediaType}/${mainItem.id}/similar?api_key=${API_KEY}&language=tr-TR`);
    const similarData = await similarRes.json();

    showResults([mainItem, ...similarData.results], mediaType);
  } catch (error) {
    results.innerHTML = "<p style='width:100%; text-align:center;'>Bir hata oluştu.</p>";
  }
}

function showResults(items, baseMediaType = "movie") {
  results.innerHTML = "";

  items.forEach(item => {
    if (!item.poster_path) return;
    if (activeCategory !== "ALL" && activeCategory !== "FAVORITES" && !item.genre_ids?.includes(GENRES[activeCategory])) return;

    const card = document.createElement("div");
    card.className = "card fade-in";
    const currentMediaType = item.media_type || baseMediaType;
    
    const isFav = favorites.some(fav => fav.id === item.id);
    const favClass = isFav ? "fav-btn active" : "fav-btn";
    const heartIcon = isFav ? "♥" : "♡";

    card.innerHTML = `
      <img src="${IMG_URL + item.poster_path}" alt="">
      <h3>${item.title || item.name}</h3>
      <span>⭐ ${item.vote_average?.toFixed(1) || "?"}</span>
    `;

    const favBtn = document.createElement("button");
    favBtn.className = favClass;
    favBtn.innerText = heartIcon;
    favBtn.onclick = (e) => toggleFavorite(e, item, currentMediaType); 
    
    card.prepend(favBtn); 

    card.onclick = (e) => {
      if(e.target.tagName === 'BUTTON') return; 
      openPopup(item.id, currentMediaType, item.title || item.name, item.overview || "Açıklama bulunamadı.");
    };

    results.appendChild(card);
  });
}

function filterByCategory(category, button) {
  activeCategory = category;
  document.querySelectorAll(".categories button").forEach(btn => btn.classList.remove("active"));
  button.classList.add("active");
  searchTMDB();
}

async function openPopup(id, mediaType, title, info) {
  const popup = document.getElementById("popup");
  document.getElementById("popupTitle").innerText = title;
  document.getElementById("popupInfo").innerText = info;
  const popupVideo = document.getElementById("popupVideo");
  
  if(popupVideo) popupVideo.innerHTML = "<p style='color:#ff4757;'>Fragman aranıyor...</p>";
  popup.style.display = "flex";

  try {
    const res = await fetch(`${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}`);
    const data = await res.json();
    const trailer = data.results.find(vid => vid.site === "YouTube" && vid.type === "Trailer");

    if (trailer && popupVideo) {
      popupVideo.innerHTML = `<iframe width="100%" height="280" src="https://www.youtube.com/embed/${trailer.key}?autoplay=0" frameborder="0" allowfullscreen style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);"></iframe>`;
    } else if (popupVideo) {
      popupVideo.innerHTML = "<p style='font-size: 13px; opacity: 0.6;'>Bu içerik için fragman bulunamadı.</p>";
    }
  } catch (error) {
    if(popupVideo) popupVideo.innerHTML = "";
  }
}

function closePopup() {
  document.getElementById("popup").style.display = "none";
  const popupVideo = document.getElementById("popupVideo");
  if(popupVideo) popupVideo.innerHTML = ""; 
}

// BACKEND İLE HABERLEŞEN KİŞİYE ÖZEL FAVORİ EKLEME
async function toggleFavorite(event, item, mediaType) {
  event.stopPropagation(); 
  
  if (!currentUser) {
    alert("Favorilere eklemek için önce giriş yapmalısın!");
    return;
  }

  const btn = event.target;
  const itemToSave = { ...item, mediaType: mediaType };

  try {
    const res = await fetch(`${BACKEND_URL}/api/favoriler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: itemToSave, userId: currentUser })
    });
    const data = await res.json();

    if (data.status === "added") {
      favorites.push(itemToSave);
      btn.classList.add("active");
      btn.innerText = "♥";
    } else {
      favorites = favorites.filter(fav => fav.id !== item.id);
      btn.classList.remove("active");
      btn.innerText = "♡";
    }

    if (activeCategory === "FAVORITES") showFavorites();
  } catch (err) {
    console.error("Favori backend'e kaydedilemedi", err);
  }
}

function showFavorites(button) {
  activeCategory = "FAVORITES";
  document.querySelectorAll(".categories button").forEach(btn => btn.classList.remove("active"));
  if(button) button.classList.add("active");

  if (!currentUser) {
    results.innerHTML = "<p style='width:100%; text-align:center;'>Favorilerini görmek için giriş yapmalısın!</p>";
    return;
  }

  if (favorites.length === 0) {
    results.innerHTML = "<p style='width:100%; text-align:center;'>Henüz favorilere eklediğin bir içerik yok.</p>";
    return;
  }
  showResults(favorites);
}

// SOL MENÜ İŞLEMLERİ
function openSidebar() {
  document.getElementById("sidebar").classList.add("active");
  if (document.getElementById("trendingList").innerHTML.trim() === "") getTrendingWeek();
}

function closeSidebar() {
  document.getElementById("sidebar").classList.remove("active");
}

async function getTrendingWeek() {
  const trendingList = document.getElementById("trendingList");
  trendingList.innerHTML = "<p style='text-align:center; margin-top:20px;'>Yükleniyor...</p>";
  try {
    const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=tr-TR`);
    const data = await res.json();
    trendingList.innerHTML = "";
    data.results.slice(0, 10).forEach(item => {
      if (!item.poster_path) return;
      const mediaType = item.media_type || (item.name ? 'tv' : 'movie');
      const title = item.title || item.name;
      const div = document.createElement("div");
      div.className = "trending-item fade-in";
      div.innerHTML = `<img src="${IMG_URL + item.poster_path}" alt=""><div class="trending-item-info"><h4>${title}</h4><span>⭐ ${item.vote_average?.toFixed(1) || "?"}</span></div>`;
      div.onclick = () => openPopup(item.id, mediaType, title, item.overview || "Açıklama bulunamadı.");
      trendingList.appendChild(div);
    });
  } catch (error) {
    trendingList.innerHTML = "<p style='text-align:center;'>Veriler yüklenemedi.</p>";
  }
}

async function kayitOl() {
  const username = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;

  const res = await fetch(`${BACKEND_URL}/api/kayit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  alert(data.mesaj || data.hata);
}

async function girisYap() {
  const username = document.getElementById("usernameInput").value;
  const password = document.getElementById("passwordInput").value;

  const res = await fetch(`${BACKEND_URL}/api/giris`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();

  if (data.userId) {
    alert("Hoş geldin " + data.username + "!");
    localStorage.setItem('userId', data.userId);
    currentUser = data.userId;
    document.getElementById('authModal').style.display = 'none';
    loadFavorites(); 
  } else {
    alert(data.hata);
  }
}

function cikisYap() {
  localStorage.removeItem('userId');
  currentUser = null;
  favorites = [];
  alert("Başarıyla çıkış yapıldı!");
  location.reload(); 
}
