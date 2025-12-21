import express from "express";
import axios from "axios";

const app = express();
const PORT = 3000;

app.use(express.static(".")); // віддає HTML/CSS/JS

// ================= VIN SEARCH API =================
app.get("/api/vin-search", async (req, res) => {
  const { vin } = req.query;

  if (!vin || vin.length !== 17) {
    return res.json({ groups: [] });
  }

  try {
    // 1️⃣ VIN → авто
    const vinRes = await axios.get(
      `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vin?vinCode=${vin}`
    );

    const { catalog, vehicleId, ssd } = vinRes.data;

    // 2️⃣ ГРУПИ
    const groupsRes = await axios.get(
      `https://catalogue-api.autonovad.ua/api/category-projections/tree`
    );

    const resultGroups = [];

    for (const group of groupsRes.data) {
      if (!group.id || !group.name) continue;

      // 3️⃣ ТОВАРИ В ГРУПІ
      const partsRes = await axios.get(
        `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups`,
        {
          params: {
            catalog,
            vehicleId: 0,
            categoryId: -1,
            groupId: group.id,
            search: 0,
            restore: 0,
            ssd
          }
        }
      );

      const products = [];

      const categories =
        partsRes.data?.data?.details?.categories || [];

      for (const cat of categories) {
        for (const unit of cat.units || []) {
          for (const part of unit.parts || []) {
            if (!part.oem) continue;

            // 4️⃣ ЦІНИ
            const priceRes = await axios.get(
              `https://catalogue-api.autonovad.ua/api/products/${part.oem}_291/external-offers`
            );

            const offer = priceRes.data?.[0];

            if (!offer) continue;

            products.push({
              oem: part.oem,
              name: part.name,
              price: offer.price?.amount || "—"
            });
          }
        }
      }

      if (products.length) {
        resultGroups.push({
          groupName: group.name,
          products
        });
      }
    }

    res.json({ groups: resultGroups });
  } catch (e) {
    console.error(e.message);
    res.json({ groups: [] });
  }
});

app.listen(PORT, () =>
  console.log(`✅ Server running: http://localhost:${PORT}`)
);

