import express from "express";
import fetch from "node-fetch"; // якщо Node >=18, можна без цього
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Функція для fetch JSON
async function fetchJSON(url, options = {}) {
  const res = await fetch(url, options);
  return res.json();
}

// Отримуємо дані по VIN
async function getVinData(vin) {
  const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vin?vinCode=${vin}`;
  const data = await fetchJSON(url);
  return data; // містить catalog, ssd, vehicleId тощо
}

// Отримуємо групи по catalog і ssd
async function getGroups(catalog, ssd) {
  const url = `https://catalogue-api.autonovad.ua/api/category-projections/tree`;
  const categories = await fetchJSON(url);
  
  // Беремо усі groupId з категорій (можна адаптувати)
  return categories.map(cat => cat.id).filter(Boolean);
}

// Отримуємо товари для групи
async function getGroupData(catalog, ssd, groupId) {
  const url = `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups?catalog=${catalog}&vehicleId=0&categoryId=-1&ssd=${encodeURIComponent(ssd)}&groupId=${groupId}&search=0&restore=0`;
  const data = await fetchJSON(url);
  return data?.data?.details?.categories || [];
}

// Отримуємо пропозиції для OEM
async function getOffers(oem) {
  try {
    const url = `https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`;
    const data = await fetchJSON(url);
    if (!data?.offers) return [];
    return data.offers.map(o => ({
      seller: o.seller || "Unknown",
      price: o.price || 0,
      name: o.name || "",
      link: o.link || ""
    }));
  } catch {
    return [];
  }
}

// ================= ROUTE =================
app.get("/catalog", async (req, res) => {
  const vin = req.query.vin;
  if (!vin) return res.status(400).send("VIN is required");

  try {
    const vinData = await getVinData(vin);
    const catalog = vinData.catalog;
    const ssd = vinData.ssd;
    
    const groupIds = await getGroups(catalog, ssd);

    const result = {};

    for (const groupId of groupIds) {
      const categories = await getGroupData(catalog, ssd, groupId);
      result[`Group ${groupId}`] = [];

      for (const category of categories) {
        if (!Array.isArray(category.units)) continue;
        for (const unit of category.units) {
          if (!Array.isArray(unit.parts)) continue;
          for (const part of unit.parts) {
            if (!part.oem) continue;
            const offers = await getOffers(part.oem);
            result[`Group ${groupId}`].push({
              oem: part.oem,
              name: part.name,
              offers
            });
          }
        }
      }
    }

    res.json(result);

  } catch (err) {
    res.status(500).send("Error fetching data: " + err.message);
  }
});

app.listen(PORT, () => {
  console.log(`AutoYuM API running on port ${PORT}`);
});



