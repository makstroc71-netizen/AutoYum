import http from "http";

// ==================== HELPERS ====================
async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

async function getGroupData(catalog, ssd, groupId) {
  const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(
    ssd
  )}&groupId=${groupId}&search=0&restore=0`;
  const data = await fetchJSON(url);
  return data?.data?.details?.categories || [];
}

async function getOffers(oem) {
  try {
    const url = `https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`;
    const data = await fetchJSON(url);
    if (!data?.offers) return [];
    return data.offers.map((offer) => ({
      seller: offer.seller || "Unknown",
      price: offer.price || 0,
      name: offer.name || "",
      link: offer.link || "",
    }));
  } catch {
    return [];
  }
}

// ==================== SERVER ====================
const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url.startsWith("/catalog")) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const catalog = url.searchParams.get("catalog");
    const ssd = url.searchParams.get("ssd");
    const groupIdsParam = url.searchParams.get("groupIds");

    if (!catalog || !ssd || !groupIdsParam) {
      res.writeHead(400);
      return res.end("catalog, ssd and groupIds parameters required");
    }

    const groupIds = groupIdsParam.split(",");
    const result = {};

    try {
      for (const groupId of groupIds) {
        const categories = await getGroupData(catalog, ssd, groupId);
        const groupName = `Group ${groupId}`;
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
                offers,
              });
            }
          }
        }
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result, null, 2));
    } catch (err) {
      res.writeHead(500);
      res.end("Error fetching data: " + err.message);
    }
  } else {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.listen(3000, () => {
  console.log("AutoYuM API is running on http://localhost:3000");
});


