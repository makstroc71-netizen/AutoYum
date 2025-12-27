// Тема та інтерфейс (твій оригінальний код)
const themeToggle = document.getElementById('theme-toggle');
const logo = document.getElementById('logo');
function setTheme(dark) {
    document.body.classList.toggle('dark', dark);
    if (logo) logo.style.filter = dark ? 'invert(1)' : 'invert(0)';
    localStorage.setItem('theme', dark ? 'dark' : 'light');
}
themeToggle.addEventListener('click', () => setTheme(!document.body.classList.contains('dark')));
if (localStorage.getItem('theme') === 'dark') setTheme(true);

const searchBtn = document.getElementById('search-btn');
const searchBox = document.getElementById('search-box');
const searchInput = document.getElementById('search-input');
const searchResults = document.getElementById('search-results');

searchBtn.addEventListener('click', () => {
    searchBox.classList.toggle('hidden');
    if (!searchBox.classList.contains('hidden')) searchInput.focus();
});

// Пошук по VIN (твій новий функціонал)
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchResults.innerHTML = '<div>Пошук у каталозі...</div>';
            try {
                // ВАЖЛИВО: Використовуємо відносний шлях /catalog
                const res = await fetch(`/catalog?catalog=MB202303&ssd=$*&groupIds=1`);
                const data = await res.json();
                
                let flatList = [];
                Object.keys(data).forEach(g => {
                    data[g].forEach(item => {
                        const price = item.offers.length > 0 ? `${item.offers[0].price} грн` : "Під замовлення";
                        flatList.push({ title: item.name, article: item.oem, price, brand: "Оригінал" });
                    });
                });
                renderCards(flatList, searchResults);
            } catch (err) {
                searchResults.innerHTML = '<div>Помилка завантаження даних</div>';
            }
        }
    }
});

function renderCards(items, container) {
    container.innerHTML = '';
    items.forEach(p => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="prod-meta">
                <h4>${p.title}</h4>
                <small>OEM: ${p.article}</small>
                <div class="price">${p.price}</div>
                <button class="save-btn">💖 Зберегти</button>
            </div>
        `;
        container.appendChild(card);
    });
}
