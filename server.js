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

// 1. Отримуємо дані про авто по VIN за твоїм новим посиланням
async function getVinData(vin) {
    // Використовуємо саме те посилання, яке ти перевірив
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vin?vinCode=${vin}&restore=1`;
    const response = await fetchJSON(url);
    
    // Перевіряємо структуру data[0].vehicle (як у твоєму прикладі)
    if (response.data && response.data[0] && response.data[0].vehicle) {
        return response.data[0].vehicle;
    }
    return null;
}

// 2. Отримуємо групи запчастин
async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    
    // Перевіряємо шлях до категорій у відповіді
    if (data && data.data && data.data.details && data.data.details.categories) {
        return data.data.details.categories;
    }
    return null;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/catalog") {
        const vin = url.searchParams.get("vin");

        try {
            // КРОК 1: Розшифровка VIN
            const vehicle = await getVinData(vin);
            
            if (!vehicle) {
                res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
                return res.end(JSON.stringify({ "Error": [{ oem: "VIN_NOT_FOUND", name: "Авто не знайдено за цим VIN" }] }));
            }

            // КРОК 2: Отримання деталей (використовуємо реальні catalog та ssd)
            // groupId = 1 зазвичай це основні компоненти
            const categories = await getGroupData(vehicle.catalog, vehicle.ssd, "1");
            
            const result = {};
            if (!categories) {
                // Якщо групи не повернулися, виводимо інфо про авто, щоб користувач бачив, що VIN розпізнано
                result[`Результат_для_${vehicle.name}`] = [
                    { oem: "INFO", name: `Авто знайдено: ${vehicle.name}. Але список деталей недоступний.` }
                ];
            } else {
                let parts = [];
                categories.forEach(cat => {
                    if (cat.units) {
                        cat.units.forEach(u => {
                            if (u.parts) {
                                u.parts.forEach(p => {
                                    if (p.oem) parts.push({ oem: p.oem, name: p.name });
                                });
                            }
                        });
                    }
                });
                result[`Запчастини_для_${vehicle.name}`] = parts;
            }

            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify(result));

        } catch (err) {
            console.error(err);
            res.writeHead(500);
            res.end(JSON.stringify({ error: "Критична помилка сервера" }));
        }
        return;
    }

    // Роздача файлів (статику не чіпаємо)
    let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    
    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end("Not Found"); }
        else { res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" }); res.end(content); }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
