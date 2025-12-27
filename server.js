import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) return { error: true, status: res.status };
    return res.json();
}

// 1. Отримуємо дані про авто (catalog та ssd) по VIN
async function getVinData(vin) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vehicles/${vin}?search=0&ssd=`;
    const data = await fetchJSON(url);
    if (data.error || !data?.data?.vehicles?.[0]) return null;
    return data.data.vehicles[0]; // Повертає об'єкт з catalog та ssd
}

// 2. Отримуємо групи запчастин
async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    if (data.error || !data?.data?.details?.categories) return null;
    return data.data.details.categories;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/catalog") {
        const vin = url.searchParams.get("vin"); // Тепер приймаємо VIN

        try {
            // КРОК 1: Розшифровуємо VIN
            const vehicle = await getVinData(vin || "W1N00000000000000"); // тестовий або реальний
            
            if (!vehicle) {
                res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
                return res.end(JSON.stringify({ "Помилка": [{ oem: "VIN_ERR", name: "Некоректний VIN-код або авто не знайдено" }] }));
            }

            // КРОК 2: Шукаємо запчастини по отриманих catalog та ssd
            const categories = await getGroupData(vehicle.catalog, vehicle.ssd, "1"); // Шукаємо групу 1
            
            const result = {};
            if (!categories) {
                result["Статус"] = [{ oem: "API_LIMIT", name: "Каталог знайдено, але доступ до деталей обмежено (500)" }];
            } else {
                let parts = [];
                categories.forEach(cat => {
                    cat.units?.forEach(u => {
                        u.parts?.forEach(p => {
                            if (p.oem) parts.push({ oem: p.oem, name: p.name });
                        });
                    });
                });
                result[`Запчастини_${vehicle.brand}`] = parts;
            }

            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify(result));

        } catch (err) {
            res.writeHead(500);
            res.end(err.message);
        }
        return;
    }

    // Роздача файлів (без змін)
    let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end("Not Found"); }
        else { res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" }); res.end(content); }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Сервер готовий на порту ${PORT}`));
