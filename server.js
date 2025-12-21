import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

// ============ HELPERS ============
async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch error");
  return res.json();
}

async function getGroupData(catalog, ssd, groupId) {
  const url =
    `https://partsfitment-ext.prod.cp.autonovad.ua/pub/v1/groups` +
    `?catalog=${catalog}` +
    `&vehicleId=0` +
    `&categoryId=-1` +
    `&ssd=${encodeURIComponent(ssd)}` +
    `&groupId=${groupId}` +
    `&search=0&restore=0`;

  const data = await fetchJSON(url);
  return data?.data?.details?.categories || [];
}

async function getOffers(oem) {
  try {
    const url = `https://catalogue-api.autonovad.ua/api/products/${oem}_291/external-offers`;
    const data = await fetchJSON(url);

    if (!Array.isArray(data?.offers)) return [];

    return data.offers.map(o => ({
      name: o.name || "",
      price: o.price || 0,
      seller: o.seller || ""
    }));
  } catch {
    return [];
  }
}

// ============ ROUTES ============

app.get("/", (req, res) => {
  res.send("AutoYuM API is running");
});

app.get("/catalog", async (req, res) => {
  const { catalog, ssd, groupIds } = req.query;

  if (!catalog || !ssd || !groupIds) {
    return res.status(400).json({
      error: "catalog, ssd and groupIds required"
    });
  }

  const result = {};
  const groups = groupIds.split(",");

  try {
    for (const groupId of groups) {
      const categories = await getGroupData(catalog, ssd, groupId);
      const groupName = `Група ${groupId}`;
      result[groupName] = [];

      for (const category of categories) {
        for (const unit of category.units || []) {
          for (const part of unit.parts || []) {
            if (!part.oem) continue;

            const offers = await getOffers(part.oem);

            if (offers.length === 0) continue;

            result[groupName].push({
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
    res.status(500).json({ error: err.message });
  }
});

// ============ START ============
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});


