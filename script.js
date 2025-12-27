// ================= ТЕМА ТА ІНТЕРФЕЙС =================
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

// ================= ФУНКЦІЯ ОТРИМАННЯ ЦІНИ (БРАУЗЕРОМ) =================
async function getPriceForOem(oem) {
    try {
        // Запит йде безпосередньо з браузера клієнта до API цін
        const res = await fetch(`https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`);
        const data = await res.json();
        if (data?.offers && data.offers.length > 0) {
            return `${data.offers[0].price} грн`;
        }
        return "Під замовлення";
    } catch (err) {
        return "Під замовлення";
    }
}

// ================= ПОШУК ЗА ENTER =================
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        searchResults.innerHTML = '<div class="loading">Завантаження каталогу...</div>';

        try {
            // Отримуємо список запчастин від твого сервера на Render
            const res = await fetch(`/catalog?catalog=MB202303&ssd=$*&groupIds=1`);
            if (!res.ok) throw new Error("Помилка сервера");
            
            const data = await res.json();
            searchResults.innerHTML = ''; // Очищуємо для результатів

            for (const group in data) {
                data[group].forEach(item => {
                    // 1. Створюємо картку
                    const card = document.createElement('div');
                    card.className = 'card';
                    
                    // Створюємо унікальний ID для поля ціни, щоб знайти його потім
                    const priceId = `price-${item.oem.replace(/[^a-zA-Z0-9]/g, '')}`;

                    card.innerHTML = `
                        <div class="prod-meta">
                            <h4>${item.name}</h4>
                            <small>OEM: ${item.oem}</small>
                            <div class="price" id="${priceId}">Шукаємо ціну...</div>
                            <button class="save-btn">💖 Зберегти</button>
                        </div>
                    `;
                    searchResults.appendChild(card);

                    // 2. Окремо запускаємо пошук ціни для цієї картки
                    getPriceForOem(item.oem).then(price => {
                        const priceElement = document.getElementById(priceId);
                        if (priceElement) priceElement.innerText = price;
                    });

                    // 3. Додаємо функцію збереження
                    card.querySelector('.save-btn').onclick = () => {
                        saveProduct({ title: item.name, article: item.oem });
                    };
                });
            }
        } catch (err) {
            console.error(err);
            searchResults.innerHTML = '<div style="color:red">Помилка завантаження. Спробуйте ще раз через хвилину.</div>';
        }
    }
});

// ================= ДОДАТКОВІ ФУНКЦІЇ (ЗБЕРЕЖЕННЯ) =================
const orderBtn = document.getElementById('order-btn');
const orderLinks = document.getElementById('order-links');
orderBtn.onclick = () => orderLinks.classList.toggle('hidden');

let savedItems = JSON.parse(localStorage.getItem('saved_items') || '[]');

function saveProduct(p) {
    if (!savedItems.find(x => x.article === p.article)) {
        savedItems.push(p);
        localStorage.setItem('saved_items', JSON.stringify(savedItems));
        alert('Збережено!');
    }
}
