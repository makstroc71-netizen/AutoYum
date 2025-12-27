import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Функція для створення затримки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return res.json();
}

async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    return data?.data?.details?.categories || [];
}

async function getOffers(oem) {
    try {
        const url = `https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`;
        const data = await fetchJSON(url);
        if (!data?.offers) return [];
        return data.offers.map(offer => ({
            seller: offer.seller || "Unknown",
            price: offer.price || 0,
            name: offer.name || ""
        }));
    } catch (e) {
        return [];
    }
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/catalog") {
        const catalog = url.searchParams.get("catalog");
        const ssd = url.searchParams.get("ssd");
        const groupIdsParam = url.searchParams.get("groupIds");

        if (!catalog || !ssd || !groupIdsParam) {
            res.writeHead(400);
            return res.end("Missing parameters");
        }

        try {
            const groupIds = groupIdsParam.split(",");
            const result = {};

            for (const groupId of groupIds) {
                const categories = await getGroupData(catalog, ssd, groupId);
                const allParts = [];
                
                categories.forEach(cat => {
                    if (cat.units) cat.units.forEach(u => {
                        if (u.parts) u.parts.forEach(p => {
                            if (p.oem) allParts.push(p);
                        });
                    });
                });

                const partsWithOffers = [];
                
                // --- ЛОГІКА З ПАУЗАМИ ---
                // Обробляємо запчастини пачками по 3 штуки
                const chunkSize = 3; 
                for (let i = 0; i < allParts.length; i += chunkSize) {
                    const chunk = allParts.slice(i, i + chunkSize);
                    
                    const chunkResults = await Promise.all(
                        chunk.map(async (part) => {
                            const offers = await getOffers(part.oem);
                            return { oem: part.oem, name: part.name, offers };
                        })
                    );
                    
                    partsWithOffers.push(...chunkResults);
                    
                    // Робимо паузу 1.5 секунди між пачками, щоб API не "лаялось"
                    if (i + chunkSize < allParts.length) {
                        await delay(1500);
                    }
                }

                result[`Group_${groupId}`] = partsWithOffers;
            }

            res.writeHead(200, { 
                "Content-Type": "application/json", 
                "Access-Control-Allow-Origin": "*" 
            });
            res.end(JSON.stringify(result));

        } catch (err) {
            console.error("Помилка на сервері:", err.message);
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    // Роздача файлів сайту (без змін)
    let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };

    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end("Not Found"); }
        else { res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" }); res.end(content); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Сервер запущено на порту ${PORT}`));
