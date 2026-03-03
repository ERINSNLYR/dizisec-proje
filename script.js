console.log("%cSENİ SEVİYORUM AŞKIM", "color: #ff4757; font-size: 20px; font-weight: bold; border: 1px solid #ff4757; padding: 5px;");

const API_KEY = "a561c1baca23a6be5680b3eaf4930018";
const BASE_URL = "https://api.themoviedb.org/3";
const IMG_URL = "https://image.tmdb.org/t/p/w500";
const BACKEND_URL = "https://dizisec-proje.onrender.com";

const results = document.getElementById("results");
const searchInput = document.getElementById("searchInput");

let activeCategory = "ALL";
let favorites = [];
let currentUser = localStorage.getItem('userId') || null;

let currentPage = 1;
let currentMode = 'trending'; 

const GENRES = { ALL: null, Drama: 18, Thriller: 53, Mystery: 9648, Crime: 80, "Sci-Fi": 878 };
let aramaZamanlayici = null;

// BAŞLANGIÇTA FAVORİLERİ ÇEK
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

// CANLI ARAMA
function canliArama() {
    clearTimeout(aramaZamanlayici);
    const kelime = searchInput.value.trim();

    if (kelime.length === 0) {
        loadTrending(1);
        return;
    }
    if (kelime.length < 3) return;

    aramaZamanlayici = setTimeout(() => {
        searchTMDB(1);
    }, 500);
}

// ARAMA SİSTEMİ
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

// SONUÇLARI GÖSTER (İzledim Tıkı Eklendi)
function showResults(items, baseMediaType = "movie", temizle = true) {
    if (temizle) results.innerHTML = "";

    items.forEach(item => {
        if (!item.poster_path) return;
        if (activeCategory !== "ALL" && activeCategory !== "FAVORITES" && !item.genre_ids?.includes(GENRES[activeCategory])) return;

        const card = document.createElement("div");
        card.className = "card fade-in";
        const currentMediaType = item.media_type || baseMediaType;
        
        const isFav = favorites.some(fav => fav.id === item.id);
        const heartIcon = isFav ? "♥" : "♡";

        // İzledim Kontrolü (Local Storage)
        const isWatched = localStorage.getItem(`watched_${item.id}`) === 'true';
        const watchedClass = isWatched ? "watched-btn done" : "watched-btn";
        const checkIcon = isWatched ? "✅" : "✔";

        card.innerHTML = `
            <button class="${watchedClass}" onclick="izlendiIsaretle(event, '${item.id}')">${checkIcon}</button>
            <img src="${IMG_URL + item.poster_path}" alt="">
            <h3>${item.title || item.name}</h3>
            <span>⭐ ${item.vote_average?.toFixed(1) || "?"}</span>
        `;

        const favBtn = document.createElement("button");
        favBtn.className = isFav ? "fav-btn active" : "fav-btn";
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

// İZLEDİM TIKI FONKSİYONU
function izlendiIsaretle(event, filmId) {
    event.stopPropagation();
    const btn = event.currentTarget;
    const isNowWatched = !btn.classList.contains('done');
    
    btn.classList.toggle('done');
    btn.innerHTML = isNowWatched ? '✅' : '✔';
    localStorage.setItem(`watched_${filmId}`, isNowWatched);
}

// KATEGORİ FİLTRELEME
function filterByCategory(category, button) {
    activeCategory = category;
    document.querySelectorAll(".categories button").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".sidebar button").forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    const aramaKutusu = searchInput.value.trim();
    aramaKutusu === "" ? loadTrending(1) : searchTMDB(1);
}

// POPUP (Fragman Butonu Eklendi)
async function openPopup(id, mediaType, title, info) {
    const popup = document.getElementById("popup");
    document.getElementById("popupTitle").innerText = title;
    
    const fragmanBtnHTML = `
        <button onclick="window.open('https://www.youtube.com/results?search_query=${encodeURIComponent(title)}+fragman', '_blank')" 
        style="background: #ff0000; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; margin-top: 15px; font-weight: bold; width: 100%;">
            📺 YouTube Fragman İzle
        </button>`;

    document.getElementById("popupInfo").innerHTML = info + fragmanBtnHTML;
    const popupVideo = document.getElementById("popupVideo");
    if(popupVideo) popupVideo.innerHTML = "<p style='color:#ff4757;'>Fragman aranıyor...</p>";
    popup.style.display = "flex";

    try {
        const res = await fetch(`${BASE_URL}/${mediaType}/${id}/videos?api_key=${API_KEY}`);
        const data = await res.json();
        const trailer = data.results.find(vid => vid.site === "YouTube" && vid.type === "Trailer");

        if (trailer && popupVideo) {
            popupVideo.innerHTML = `<iframe width="100%" height="280" src="https://www.youtube.com/embed/${trailer.key}?autoplay=0" frameborder="0" allowfullscreen style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1); margin-top:15px;"></iframe>`;
        } else if (popupVideo) {
            popupVideo.innerHTML = "<p style='font-size: 13px; opacity: 0.6; margin-top:10px;'>Otomatik video bulunamadı, yukarıdaki butonu kullanın.</p>";
        }
    } catch (error) { if(popupVideo) popupVideo.innerHTML = ""; }
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
    const popupVideo = document.getElementById("popupVideo");
    if(popupVideo) popupVideo.innerHTML = ""; 
}

// FAVORİ EKLE/ÇIKAR
async function toggleFavorite(event, item, mediaType) {
    event.stopPropagation(); 
    if (!currentUser) { alert("Önce giriş yapmalısın!"); return; }

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
    } catch (err) { console.error("Favori kaydedilemedi", err); }
}

function showFavorites(button) {
    activeCategory = "FAVORITES";
    document.querySelectorAll(".categories button").forEach(btn => btn.classList.remove("active"));
    if(button) button.classList.add("active");
    butonGizleGoster(false);

    if (favorites.length === 0) {
        results.innerHTML = "<p style='width:100%; text-align:center;'>Henüz favori yok.</p>";
        return;
    }
    showResults(favorites, "movie", true);
}

// TRENDLERİ YÜKLE
async function loadTrending(page = 1) {
    currentMode = 'trending';
    currentPage = page;
    if(page === 1) results.innerHTML = "<p style='width:100%; text-align:center;'>Yükleniyor...</p>";
    
    try {
        const res = await fetch(`${BASE_URL}/trending/all/week?api_key=${API_KEY}&language=tr-TR&page=${page}`);
        const data = await res.json();
        if (page === 1) {
            document.querySelector(".subtitle").innerHTML = "<b>Haftanın En Popülerleri 🔥</b>";
            results.innerHTML = ""; 
        }
        showResults(data.results, "movie", page === 1);
        butonGizleGoster(data.page < data.total_pages);
    } catch (error) { console.error(error); }
}

// AUTH İŞLEMLERİ
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
        appBaslat();
    } else { alert(data.hata); }
}

function appBaslat() {
    document.getElementById("loginScreen").style.display = "none";
    document.getElementById("mainApp").style.display = "block";
    document.getElementById("openMenuBtn").style.display = "block";
    loadFavorites(); 
    loadTrending(1);
}

function cikisYap() {
    localStorage.removeItem('userId');
    currentUser = null;
    favorites = [];
    location.reload(); // En temiz çıkış yolu
}

function toggleNav() {
    const sidebar = document.getElementById("mySidebar");
    sidebar.style.width = sidebar.style.width === "250px" ? "0" : "250px";
}

function butonGizleGoster(goster) {
    const btn = document.getElementById("loadMoreBtn");
    if (btn) btn.style.display = goster ? "block" : "none";
}

function dahaFazlaYukle() {
    currentMode === 'trending' ? loadTrending(currentPage + 1) : searchTMDB(currentPage + 1);
}

// SAYFA AÇILIŞ KONTROLÜ
if (currentUser) { appBaslat(); }