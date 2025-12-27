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

// ================= ФУНКЦІЯ ОТРИМАННЯ ЦІНИ =================
async function getPriceForOem(oem) {
    try {
        // Пробуємо отримати ціну через API
        const res = await fetch(`https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        if (data?.offers && data.offers.length > 0) {
            return `${data.offers[0].price} грн`;
        }
        return "За запитом";
    } catch (err) {
        // Якщо помилка (таймаут або 500) — повертаємо нейтральний напис
        return "За запитом 📞";
    }
}

// ================= ГОЛОВНИЙ ПОШУК =================
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;

        // Показуємо початковий статус
        searchResults.innerHTML = '<div class="status-msg">Завантажуємо структуру каталогу...</div>';

        try {
            // Запит до твого сервера на Render (тільки структура)
            const res = await fetch(`/catalog?catalog=MB202303&ssd=$*&groupIds=1`);
            if (!res.ok) throw new Error("Сервер не відповідає");
            
            const data = await res.json();
            
            // Очищуємо статус і готуємо місце для карток
            searchResults.innerHTML = ''; 

            // Проходимо по отриманих групах
            for (const group in data) {
                const parts = data[group];
                
                if (parts.length === 0) continue;

                parts.forEach(item => {
                    // Створюємо унікальний ID для поля ціни
                    const priceId = `price-${item.oem.replace(/[^a-zA-Z0-9]/g, '')}`;

                    // Створюємо картку деталі
                    const card = document.createElement('div');
                    card.className = 'card';
                    card.innerHTML = `
                        <div class="prod-meta">
                            <small class="group-label">${group.replace('_', ' ')}</small>
                            <h4>${item.name}</h4>
                            <small>OEM: <strong>${item.oem}</strong></small>
                            <div class="price" id="${priceId}">Оновлюємо ціну...</div>
                            <button class="save-btn">💖 Зберегти</button>
                        </div>
                    `;
                    
                    // Додаємо картку в результати миттєво!
                    searchResults.appendChild(card);

                    // ЗАПУСКАЄМО ПОШУК ЦІНИ ОКРЕМО (не чекаємо його для виводу інших карток)
                    getPriceForOem(item.oem).then(price => {
                        const priceElement = document.getElementById(priceId);
                        if (priceElement) {
                            priceElement.innerText = price;
                            priceElement.classList.add('loaded'); // можна додати анімацію появи
                        }
                    });
                });
            }

            if (searchResults.innerHTML === '') {
                searchResults.innerHTML = '<div>Запчастин не знайдено</div>';
            }

        } catch (err) {
            console.error(err);
            searchResults.innerHTML = `<div style="color:orange">Помилка з'єднання з сервером. Виведено лише локальні дані або спробуйте ще раз.</div>`;
        }
    }
});
