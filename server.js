import express from "express";
import axios from "axios";

const app = express();
const PORT = 3000;

app.use(express.static("."));

app.get("/api/vin-search", async (req, res) => {
  const { vin } = req.query;
  if (!vin || vin.length !== 17) {
    return res.json({ groups: [] });
  }

  try {
    // 1️⃣ VIN → catalog
    const vinRes = await axios.get(
      `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/vin?vinCode=${vin}`
    );

    const catalog = vinRes.data.catalog;
    if (!catalog) return res.json({ groups: [] });

    // 2️⃣ ПЕРШИЙ groups-запит — щоб отримати SSD
    const firstGroups = await axios.get(
      `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups`,
      {
        params: {
          catalog,
          vehicleId: 0,
          categoryId: -1,
          groupId: 2,
          search: 0,
          restore: 0
        }
      }
    );

    const ssd =
      firstGroups.data?.data?.details?.categories?.[0]?.ssd;

    if (!ssd) return res.json({ groups: [] });

    // 3️⃣ ГРУПИ
    const tree = await axios.get(
      `https://catalogue-api.autonovad.ua/api/category-projections/tree`
    );

    const result = [];

    for (const group of tree.data) {
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

      const cats =
        partsRes.data?.data?.details?.categories || [];

      for (const c of cats) {
        for (const u of c.units || []) {
          for (const p of u.parts || []) {
            if (!p.oem) continue;

            const priceRes = await axios.get(
              `https://catalogue-api.autonovad.ua/api/products/${p.oem}_291/external-offers`
            );

            const offer = priceRes.data?.[0];
            if (!offer) continue;

            products.push({
              oem: p.oem,
              name: p.name,
              price: offer.price?.amount || "—"
            });
          }
        }
      }

      if (products.length) {
        result.push({
          groupName: group.name,
          products
        });
      }
    }

    res.json({ groups: result });
  } catch (e) {
    console.error(e.message);
    res.json({ groups: [] });
  }
});

app.listen(PORT, () =>
  console.log(`✅ http://localhost:${PORT}`)
);


