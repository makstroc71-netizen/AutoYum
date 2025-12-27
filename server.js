import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функція для запитів з імітацією браузера (щоб не було 500 або 403 помилок)
async function fetchJSON(url) {
    try {
        const res = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json",
                "Referer": "https://autonovad.ua/"
            }
        });
        if (!res.ok) return { error: true, status: res.status };
        return await res.json();
    } catch (e) {
        return { error: true, message: e.message };
    }
}

async function getVinData(vin) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vin?vinCode=${vin}&restore=1`;
    const response = await fetchJSON(url);
    
    // Перевірка структури, яку ти скинув раніше
    if (response && response.data && response.data[0] && response.data[0].vehicle) {
        return response.data[0].vehicle;
    }
    return null;
}

async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    
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
            const vehicle = await getVinData(vin);
            
            if (!vehicle) {
                res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
                return res.end(JSON.stringify({ "Результат": [{ oem: "VIN_NOT_FOUND", name: "Сервер API відхилив запит або VIN невірний" }] }));
            }

            // Отримуємо категорії (groupId=1)
            const categories = await getGroupData(vehicle.catalog, vehicle.ssd, "1");
            
            const result = {};
            const resultKey = `Деталі для ${vehicle.brand} ${vehicle.name || ""}`;
            result[resultKey] = [];

            if (!categories) {
                result[resultKey].push({ oem: "API_BLOCK", name: "Авто знайдено, але каталог заблоковано сервером" });
            } else {
                categories.forEach(cat => {
                    cat.units?.forEach(u => {
                        u.parts?.forEach(p => {
                            if (p.oem) result[resultKey].push({ oem: p.oem, name: p.name });
                        });
                    });
                });
            }

            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify(result));

        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Статика (без змін)
    let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end("Not Found"); }
        else { res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" }); res.end(content); }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Сервер працює`));
