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

// SAYFALAMA İÇİN YENİ DEĞİŞKENLER
let currentPage = 1;
let currentMode = 'trending'; 

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

let aramaZamanlayici = null;

function canliArama() {
  clearTimeout(aramaZamanlayici);
  const kelime = document.getElementById("searchInput").value.trim();

  if (kelime.length === 0) {
    loadTrending(1);
    return;
  }

  if (kelime.length < 3) return;

  aramaZamanlayici = setTimeout(() => {
    searchTMDB(1);
  }, 500);
}

// ARAMA SİSTEMİ (Sayfalamaya Uygun Hale Getirildi)
async function searchTMDB(page = 1) {
  const query = searchInput.value.trim();
  if (!query) return;

  currentMode = 'search';
  currentPage = page;

  if (page === 1) results.innerHTML = "<p style='width:100%; text-align:center;'>Yükleniyor...</p>";

  try {
    const searchRes = await fetch(`${BASE_URL}/search/multi?api_key=${API_KEY}&language=tr-TR&query=${query}&page=${page}`);
    const searchData = await searchRes.json();

    if (searchData.results.length === 0 && page === 1) {
      results.innerHTML = "<p style='width:100%; text-align:center;'>Maalesef sonuç bulunamadı.</p>";
      butonGizleGoster(false);
      return;
    }

    if (page === 1) {
      document.querySelector(".subtitle").innerHTML = "<b>Arama Sonuçları 🔍</b>";
      results.innerHTML = ""; 
    }

    showResults(searchData.results, "movie", page === 1);
    butonGizleGoster(searchData.page < searchData.total_pages);

  } catch (error) {
    if (page === 1) results.innerHTML = "<p style='width:100%; text-align:center;'>Bir hata oluştu.</p>";
  }
}

// SONUÇLARI GÖSTER (Eskilerini silmeden yenilerini ekler)
function showResults(items, baseMediaType = "movie", temizle = true) {
  if (temizle) results.innerHTML = "";

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

  const aramaKutusu = document.getElementById("searchInput").value.trim();
  
  if (aramaKutusu === "") {
    loadTrending(1); 
  } else {
    searchTMDB(1); 
  }
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

// FAVORİ EKLE/ÇIKAR
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
  butonGizleGoster(false); // Favorilerde daha fazla yükle butonu gizlenir

  if (!currentUser) {
    results.innerHTML = "<p style='width:100%; text-align:center;'>Favorilerini görmek için giriş yapmalısın!</p>";
    return;
  }

  if (favorites.length === 0) {
    results.innerHTML = "<p style='width:100%; text-align:center;'>Henüz favorilere eklediğin bir içerik yok.</p>";
    return;
  }
  showResults(favorites, "movie", true);
}

// DAHA FAZLA YÜKLE SİSTEMİ
function dahaFazlaYukle() {
  if (currentMode === 'trending') {
    loadTrending(currentPage + 1);
  } else if (currentMode === 'search') {
    searchTMDB(currentPage + 1);
  }
}

function butonGizleGoster(goster) {
  const btn = document.getElementById("loadMoreBtn");
  if (btn) btn.style.display = goster ? "block" : "none";
}

// TRENDLER (Sayfalamaya Uygun Hale Getirildi)
async function loadTrending(page = 1) {
  currentMode = 'trending';
  currentPage = page;

  if(page === 1) results.innerHTML = "<p style='width:100%; text-align:center;'>Trendler yükleniyor...</p>";
  
  try {
    const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=tr-TR&page=${page}`);
    const data = await res.json();
    
    if (page === 1) {
      document.querySelector(".subtitle").innerHTML = "<b>Haftanın En Popüler İçerikleri 🔥</b>";
      results.innerHTML = ""; 
    }
    
    showResults(data.results, "movie", page === 1);
    butonGizleGoster(data.page < data.total_pages);
  } catch (error) {
    if (page === 1) results.innerHTML = "";
  }
}

// SOL MENÜ İŞLEMLERİ (Kullanmıyorsan silebilirsin)
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
    localStorage.setItem('userId', data.userId);
    currentUser = data.userId;
    
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    
    loadFavorites(); 
    loadTrending(1);
  } else {
    alert(data.hata);
  }
}

function cikisYap() {
  localStorage.removeItem('userId');
  currentUser = null;
  favorites = [];
  
  document.getElementById("mainApp").style.display = "none";
  document.getElementById("loginScreen").style.display = "flex";
  
  document.getElementById("usernameInput").value = "";
  document.getElementById("passwordInput").value = "";
}

// SAYFA İLK AÇILDIĞINDA OTURUM KONTROLÜ
if (currentUser) {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("mainApp").style.display = "block";
  loadTrending(1);
} else {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("mainApp").style.display = "none";
}