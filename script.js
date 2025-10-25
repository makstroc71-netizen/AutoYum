// ================= THEME TOGGLE =================
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

function setTheme(dark) {
  document.body.classList.toggle('dark', dark);
  logo.style.filter = dark ? 'invert(1)' : 'invert(0)';
  localStorage.setItem('theme', dark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
if (localStorage.getItem('theme') === 'dark') setTheme(true);

// ================= SEARCH =================
const searchBtn = document.getElementById('search-btn');
const searchBox = document.getElementById('search-box');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchBtn.addEventListener('click', () => {
  searchBox.classList.toggle('hidden');
  if (!searchBox.classList.contains('hidden')) searchInput.focus();
});

// ================= ORDER =================
const orderBtn = document.getElementById('order-btn');
const orderLinks = document.getElementById('order-links');
orderBtn.addEventListener('click', () => orderLinks.classList.toggle('hidden'));

// ================= SAVED =================
const savedBtn = document.getElementById('saved-btn');
const savedList = document.getElementById('saved-list');
let savedItems = JSON.parse(localStorage.getItem('saved_items') || '[]');

savedBtn.addEventListener('click', () => {
  renderSaved();
  savedList.classList.toggle('hidden');
});

// ================= LOAD CATALOG =================
let products = [];
let catalogLoaded = false;

searchResults.innerHTML = '<div>Каталог завантажується...</div>';

fetch('catalog.json')
  .then(res => res.json())
  .then(data => {
    products = data.map(p => ({
      title: p.title,
      article: p.article,
      price: p.yourPriceUAH?.amount ? `${p.yourPriceUAH.amount.toFixed(2)} грн` : "—",
      brand: p.displayBrand || p.brand?.name || "",
      category: p.category?.name || ""
    }));
    catalogLoaded = true;
    searchResults.innerHTML = '';
  })
  .catch(err => {
    console.error("Помилка завантаження каталогу:", err);
    searchResults.innerHTML = '<div style="color:red">Помилка завантаження каталогу</div>';
  });

// ================= SEARCH FUNCTION =================
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  searchResults.innerHTML = '';

  if (!catalogLoaded) {
    searchResults.innerHTML = '<div>Зачекайте, каталог ще завантажується...</div>';
    return;
  }

  if (q) {
    const results = products.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.article.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q)
    );

    if (results.length === 0) {
      searchResults.innerHTML = '<div>Нічого не знайдено</div>';
    } else {
      results.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card'; // використовується новий стиль

        card.innerHTML = `
          <div class="product-title">${p.title}</div>
          <div class="product-brand">${p.brand}</div>
          <div class="product-article">SKU: ${p.article}</div>
          <div class="product-price">${p.price}</div>
          <button class="save-btn">💖 Зберегти</button>
        `;

        card.querySelector('.save-btn').addEventListener('click', () => {
          if (!savedItems.find(x => x.article === p.article)) {
            savedItems.push(p);
            localStorage.setItem('saved_items', JSON.stringify(savedItems));
            alert(`${p.title} додано до збережених`);
          } else alert(`${p.title} вже в збережених`);
        });

        searchResults.appendChild(card);
      });
    }
  }
});

// ================= RENDER SAVED =================
function renderSaved() {
  savedList.innerHTML = '';

  if (savedItems.length === 0) {
    savedList.innerHTML = '<p>Поки що немає збережених товарів ❤️</p>';
  } else {
    savedItems.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card'; // теж матриця

      card.innerHTML = `
        <div class="product-title">${p.title}</div>
        <div class="product-brand">${p.brand}</div>
        <div class="product-article">SKU: ${p.article}</div>
        <div class="product-price">${p.price}</div>
        <button class="save-btn">💔 Видалити</button>
      `;

      card.querySelector('.save-btn').addEventListener('click', () => {
        savedItems = savedItems.filter(x => x.article !== p.article);
        localStorage.setItem('saved_items', JSON.stringify(savedItems));
        renderSaved();
      });

      savedList.appendChild(card);
    });
  }
}

// ================= LOGO SIZE =================
logo.style.height = '90px';
logo.style.width = 'auto';
