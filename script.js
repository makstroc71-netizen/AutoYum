// ================= ТЕМА ТА ЛОГО =================
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');

function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    if (logo) logo.style.filter = dark ? 'invert(1)' : 'invert(0)';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}

themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
if (localStorage.getItem('theme') === 'dark') setTheme(true);

// ================= ПОШУК ТА ІНТЕРФЕЙС =================
const searchBtn = document.getElementById('search-btn');
const searchBox = document.getElementById('search-box');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchBtn.addEventListener('click', () => {
    searchBox.classList.toggle('hidden');
    if (!searchBox.classList.contains('hidden')) searchInput.focus();
});

// Обробка натискання Enter у пошуку
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) performVinSearch(query);
    }
});

// Функція запиту до твого нового сервера
async function performVinSearch(vin) {
    searchResults.innerHTML = '<div class="loading">Шукаємо деталі...</div>';
    
    try {
        // Тут ми використовуємо параметри, які очікує твій сервер
        // Для повноцінного пошуку по VIN тут має бути виклик декодера, 
        // але зараз ми підключаємось до твого працюючого логічного ланцюжка.
        const response = await fetch(`http://localhost:3000/catalog?catalog=MB202303&ssd=$*&groupIds=1`);
        const data = await response.json();
        
        let allParts = [];
        Object.keys(data).forEach(group => {
            data[group].forEach(item => {
                const bestPrice = item.offers.length > 0 ? item.offers[0].price : "За запитом";
                const seller = item.offers.length > 0 ? item.offers[0].seller : "AutoYuM";
                
                allParts.push({
                    title: item.name,
                    article: item.oem,
                    price: bestPrice === "За запитом" ? bestPrice : `${bestPrice} грн`,
                    brand: seller
                });
            });
        });

        if (allParts.length === 0) {
            searchResults.innerHTML = '<div>Нічого не знайдено</div>';
        } else {
            renderCards(allParts, searchResults);
        }
    } catch (err) {
        searchResults.innerHTML = '<div style="color:red">Помилка сервера. Перевірте, чи запущено server.js</div>';
    }
}

// ================= КНОПКИ ТА ЗБЕРЕЖЕНЕ =================
const orderBtn = document.getElementById('order-btn');
const orderLinks = document.getElementById('order-links');
orderBtn.addEventListener('click', () => orderLinks.classList.toggle('hidden'));

const savedBtn = document.getElementById('saved-btn');
const savedList = document.getElementById('saved-list');
let savedItems = JSON.parse(localStorage.getItem('saved_items') || '[]');

savedBtn.addEventListener('click', () => {
    renderSaved();
    savedList.classList.toggle('hidden');
});

// ================= РЕНДЕР КАРТОК =================
function renderCards(items, container) {
    container.innerHTML = '';
    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="prod-meta">
                <h4>${p.title}</h4>
                <small>${p.brand}</small>
                <small>OEM: ${p.article}</small>
                <div class="price">${p.price}</div>
                <button class="save-btn">💖 Зберегти</button>
            </div>
        `;

        card.querySelector('.save-btn').addEventListener('click', () => {
            if (!savedItems.find(x => x.article === p.article)) {
                savedItems.push(p);
                localStorage.setItem('saved_items', JSON.stringify(savedItems));
                alert('Збережено!');
            }
        });
        container.appendChild(card);
    });
}

function renderSaved() {
    savedList.innerHTML = '';
    if (savedItems.length === 0) {
        savedList.innerHTML = '<p>Порожньо ❤️</p>';
    } else {
        renderCards(savedItems, savedList);
        savedList.querySelectorAll('.save-btn').forEach((btn, i) => {
            btn.textContent = '💔 Видалити';
            btn.onclick = () => {
                savedItems.splice(i, 1);
                localStorage.setItem('saved_items', JSON.stringify(savedItems));
                renderSaved();
            };
        });
    }
}
