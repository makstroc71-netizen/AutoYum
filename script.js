// ================= THEME =================
const themeToggle = document.getElementById("theme-toggle");
const logo = document.getElementById("logo");

function setTheme(dark) {
  document.body.classList.toggle("dark", dark);
  logo.style.filter = dark ? "invert(1)" : "invert(0)";
  localStorage.setItem("theme", dark ? "dark" : "light");
}

themeToggle.onclick = () =>
  setTheme(!document.body.classList.contains("dark"));
if (localStorage.getItem("theme") === "dark") setTheme(true);

// ================= UI =================
const searchBtn = document.getElementById("search-btn");
const searchBox = document.getElementById("search-box");
const searchInput = document.getElementById("search-input");
const searchResults = document.getElementById("search-results");
const catalogCount = document.getElementById("catalog-count");

searchBtn.onclick = () => {
  searchBox.classList.toggle("hidden");
  catalogCount.classList.remove("hidden");
  searchInput.focus();
};

// ================= VIN SEARCH =================
async function searchByVin(vin) {
  searchResults.innerHTML = "<div>Пошук по VIN...</div>";

  try {
    const res = await fetch(`/api/vin-search?vin=${vin}`);
    const data = await res.json();

    if (!data.groups.length) {
      searchResults.innerHTML = "<div>Нічого не знайдено</div>";
      return;
    }

    renderVin(data.groups);
  } catch {
    searchResults.innerHTML =
      "<div style='color:red'>Помилка VIN</div>";
  }
}

function renderVin(groups) {
  searchResults.innerHTML = "";

  groups.forEach(g => {
    const h = document.createElement("h3");
    h.textContent = g.groupName;
    h.style.margin = "20px 0 10px";
    searchResults.appendChild(h);

    g.products.forEach(p => {
      const card = document.createElement("div");
      card.className = "card";

      card.innerHTML = `
        <h4>${p.name}</h4>
        <small>OEM: ${p.oem}</small>
        <div class="price">${p.price} грн</div>
      `;

      searchResults.appendChild(card);
    });
  });
}

// ================= SEARCH INPUT =================
searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim();

  if (q.length === 17) {
    searchByVin(q.toUpperCase());
  }
});

