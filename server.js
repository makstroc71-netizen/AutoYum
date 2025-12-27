import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchJSON(url) {
    const res = await fetch(url);
    // Якщо зовнішній API видає 500, ми не "падаємо", а обробляємо це нижче
    if (!res.ok) return { error: true, status: res.status };
    return res.json();
}

async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    
    if (data.error || !data?.data?.details?.categories) {
        console.error("Помилка при отриманні груп від Autonovad");
        return null; 
    }
    return data.data.details.categories;
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/catalog") {
        const catalog = url.searchParams.get("catalog");
        const ssd = url.searchParams.get("ssd");
        const groupIdsParam = url.searchParams.get("groupIds");

        try {
            const groupIds = groupIdsParam.split(",");
            const result = {};

            for (const groupId of groupIds) {
                const categories = await getGroupData(catalog, ssd, groupId);
                
                if (!categories) {
                    // ЯКЩО API ПОВЕРНУЛО 500 — ВІДДАЄМО ТЕСТОВУ ДЕТАЛЬ
                    result[`Group_${groupId}`] = [
                        { oem: "A0004200000", name: "Тестова деталь (API Autonovad тимчасово недоступне)" }
                    ];
                } else {
                    let parts = [];
                    categories.forEach(cat => {
                        if (cat.units) cat.units.forEach(u => {
                            if (u.parts) u.parts.forEach(p => {
                                if (p.oem) parts.push({ oem: p.oem, name: p.name });
                            });
                        });
                    });
                    result[`Group_${groupId}`] = parts;
                }
            }

            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end(JSON.stringify(result));
        } catch (err) {
            console.error("Критична помилка сервера:", err.message);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ 
                "Group_Error": [{ oem: "ERROR", name: "Помилка сервера: " + err.message }] 
            }));
        }
        return;
    }

    // Роздача файлів (index, css, js)
    let filePath = path.join(__dirname, url.pathname === "/" ? "index.html" : url.pathname);
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".png": "image/png" };

    fs.readFile(filePath, (err, content) => {
        if (err) { res.writeHead(404); res.end("Not Found"); }
        else { res.writeHead(200, { "Content-Type": mimeTypes[ext] || "text/plain" }); res.end(content); }
    });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => console.log(`🚀 Сервер на порту ${PORT}`));
