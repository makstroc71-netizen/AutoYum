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
            searchResults.innerHTML = '<div class="loading">Шукаємо деталі та актуальні ціни... зачекайте...</div>';
            console.log("Початок пошуку для:", query);

            try {
                // Викликаємо наш API на Render
                const res = await fetch(`/catalog?catalog=MB202303&ssd=$*&groupIds=1`);
                
                if (!res.ok) {
                    throw new Error(`Сервер повернув помилку: ${res.status}`);
                }

                const data = await res.json();
                console.log("Дані отримано:", data);
                
                let flatList = [];
                // Проходимо по групах (Group_1, і т.д.)
                for (const groupKey in data) {
                    data[groupKey].forEach(item => {
                        // Перевіряємо, чи є оффери
                        const hasOffers = item.offers && item.offers.length > 0;
                        const price = hasOffers ? `${item.offers[0].price} грн` : "Під замовлення";
                        const seller = hasOffers ? item.offers[0].seller : "AutoYuM";

                        flatList.push({ 
                            title: item.name || "Запчастина", 
                            article: item.oem, 
                            price: price, 
                            brand: seller 
                        });
                    });
                }

                if (flatList.length === 0) {
                    searchResults.innerHTML = '<div>Запчастин не знайдено, спробуйте пізніше</div>';
                } else {
                    renderCards(flatList, searchResults);
                }

            } catch (err) {
                console.error("Детальна помилка:", err);
                searchResults.innerHTML = `<div style="color:red">Помилка: ${err.message}. Перевірте консоль (F12).</div>`;
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
