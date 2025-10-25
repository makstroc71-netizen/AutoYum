import express from 'express';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('.'));

// === Дані ===
const EMAIL = 'uramatsola1994@gmail.com';
const PASSWORD = '809504';
const BROWSER_FINGERPRINT = crypto.randomBytes(16).toString('hex');

const API_BASE = 'https://order24-api.utr.ua/api';
const CATALOG_FILE = 'catalog.json';

let TOKEN = null;

// Авторизація
async function login() {
  try {
    const res = await axios.post(`${API_BASE}/login_check`, {
      email: EMAIL,
      password: PASSWORD,
      browser_fingerprint: BROWSER_FINGERPRINT
    }, {
      headers: { 'Content-Type': 'application/json' }
    });

    TOKEN = res.data.token;
    console.log('✅ Авторизація успішна');
  } catch (err) {
    throw new Error('Помилка авторизації: ' + (err.response?.data || err.message));
  }
}

// Отримати деталь по ID
async function getDetailById(detailId) {
  try {
    const res = await axios.get(`${API_BASE}/detail/${detailId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    return res.data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    if (err.response?.status === 401) {
      await login();
      return await getDetailById(detailId);
    }
    throw err;
  }
}

// ==================== Поступове оновлення каталогу ====================
async function updateCatalogIncrementally(startId = 0, endId = 100) {
  if (!TOKEN) await login();

  // Завантажуємо вже існуючий каталог
  let catalog = [];
  if (fs.existsSync(CATALOG_FILE)) {
    catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf-8'));
  }

  for (let id = startId; id <= endId; id++) {
    // Пропускаємо, якщо деталь вже є
    if (catalog.find(d => d.id === id)) continue;

    try {
      const detail = await getDetailById(id);
      if (detail && Object.keys(detail).length > 0) {
        catalog.push(detail);
        fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf-8');
        console.log(`✅ Додано деталь ID=${id}`);
      }
    } catch (err) {
      console.error(`❌ Помилка деталі ID=${id}:`, err.message);
    }
  }
}

// ================== API ==================
// Повертаємо каталог
app.get('/api/products', (req, res) => {
  if (!fs.existsSync(CATALOG_FILE)) {
    return res.status(404).json({ error: 'Каталог ще не збережений' });
  }
  const data = fs.readFileSync(CATALOG_FILE, 'utf-8');
  res.send(data);
});

// ================== SERVER START ==================
(async () => {
  try {
    // Перший запуск — підвантажуємо перші 10 деталей
    await updateCatalogIncrementally(0, 10);
  } catch (err) {
    console.error('❌ Помилка при стартовому оновленні каталогу:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Сервер запущено на http://localhost:${PORT}`);
  });

  // ======= Автооновлення вимкнено =======
  
  setInterval(async () => {
    console.log('🔄 Автоматичне оновлення каталогу...');
    try {
      await updateCatalogIncrementally(0, 10);
    } catch (err) {
      console.error('❌ Помилка автооновлення:', err.message);
    }
  }, 1000 * 1); // 6 годин
  
})();
