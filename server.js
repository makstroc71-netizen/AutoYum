import http from "http";

// Допоміжна функція для запитів
async function fetchJSON(url) {
    const res = await fetch(url);
    return res.json();
}

// Отримання категорій
async function getGroupData(catalog, ssd, groupId) {
    const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
    const data = await fetchJSON(url);
    return data?.data?.details?.categories || [];
}

// Отримання цін для OEM
async function getOffers(oem) {
    try {
        const url = `https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`;
        const data = await fetchJSON(url);
        if (!data?.offers) return [];
        return data.offers.map(offer => ({
            seller: offer.seller || "Unknown",
            price: offer.price || 0,
            name: offer.name || "",
            link: offer.link || ""
        }));
    } catch {
        return [];
    }
}

// Створення сервера
const server = http.createServer(async (req, res) => {
    // Додаємо CORS заголовки, щоб браузер не блокував запити
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    if (req.method === "GET" && req.url.startsWith("/catalog")) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const catalog = url.searchParams.get("catalog");
        const ssd = url.searchParams.get("ssd");
        const groupIdsParam = url.searchParams.get("groupIds");

        if (!catalog || !ssd || !groupIdsParam) {
            res.writeHead(400);
            return res.end("Missing parameters");
        }

        const groupIds = groupIdsParam.split(",");
        const result = {};

        try {
            for (const groupId of groupIds) {
                const categories = await getGroupData(catalog, ssd, groupId);
                const groupName = `Group_${groupId}`;
                result[groupName] = [];

                for (const category of categories) {
                    if (!Array.isArray(category.units)) continue;
                    for (const unit of category.units) {
                        if (!Array.isArray(unit.parts)) continue;
                        for (const part of unit.parts) {
                            if (!part.oem) continue;
                            const offers = await getOffers(part.oem);
                            result[groupName].push({
                                oem: part.oem,
                                name: part.name,
                                offers: offers
                            });
                        }
                    }
                }
            }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
    } else {
        res.writeHead(404);
        res.end("Not found");
    }
});

server.listen(3000, () => {
    console.log("✅ Сервер запущено на http://localhost:3000");
});
