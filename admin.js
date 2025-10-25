const ADMIN_PASSWORD = '16022010';
const addForm = document.getElementById('add-product-form');
const removeForm = document.getElementById('remove-product-form');
const productItemsEl = document.getElementById('product-items');
const searchInput = document.getElementById('search-product');

// Додати товар
addForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(addForm).entries());

  if (data.adminPass !== ADMIN_PASSWORD) {
    alert('Неправильний пароль!');
    return;
  }

  const newProd = {
    id: Date.now(),
    brand: data.brand,
    name: data.name,
    price: Number(data.price),
    sku: data.sku,
    img: data.img || 'img/default.svg'
  };

  fetch('/api/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProd)
  })
  .then(res => res.json())
  .then(res => {
    if(res.success){
      alert('Товар додано: ' + newProd.name);
      addForm.reset();
      loadProducts();
    }
  });
});

// Видалити товар за SKU (через форму)
removeForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(removeForm).entries());

  if (data.adminPass !== ADMIN_PASSWORD) {
    alert('Неправильний пароль!');
    return;
  }

  fetch('/api/products', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku: data.sku })
  })
  .then(res => res.json())
  .then(res => {
    if(res.success){
      alert('Товар видалено: ' + data.sku);
      removeForm.reset();
      loadProducts();
    } else {
      alert('Товар не знайдено: ' + data.sku);
    }
  });
});

// Завантаження та відображення всіх товарів
function loadProducts() {
  fetch('/api/products')
    .then(res => res.json())
    .then(products => {
      const q = searchInput.value.trim().toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
      );

      productItemsEl.innerHTML = '';
      filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = 'product-item';
        div.innerHTML = `
          <input value="${p.brand}" data-field="brand">
          <input value="${p.name}" data-field="name">
          <input type="number" value="${p.price}" data-field="price">
          <input value="${p.sku}" data-field="sku" readonly>
          <input value="${p.img}" data-field="img">
          <button class="update-btn">Змінити</button>
          <button class="delete-btn">Видалити</button>
        `;

        // Змінити товар
        div.querySelector('.update-btn').addEventListener('click', () => {
          const pass = prompt('Введіть пароль адміністратора:');
          if(pass !== ADMIN_PASSWORD){
            alert('Неправильний пароль!');
            return;
          }

          const updated = {
            id: p.id,
            brand: div.querySelector('[data-field="brand"]').value,
            name: div.querySelector('[data-field="name"]').value,
            price: Number(div.querySelector('[data-field="price"]').value),
            sku: p.sku,
            img: div.querySelector('[data-field="img"]').value
          };

          fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
          })
          .then(res => res.json())
          .then(res => {
            if(res.success){
              alert('Товар змінено: ' + updated.name);
              loadProducts();
            }
          });
        });

        // Видалити товар
        div.querySelector('.delete-btn').addEventListener('click', () => {
          const pass = prompt('Введіть пароль адміністратора:');
          if(pass !== ADMIN_PASSWORD){
            alert('Неправильний пароль!');
            return;
          }

          if(!confirm('Видалити цей товар?')) return;
          fetch('/api/products', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sku: p.sku })
          })
          .then(res => res.json())
          .then(res => {
            if(res.success){
              alert('Товар видалено: ' + p.sku);
              loadProducts();
            }
          });
        });

        productItemsEl.appendChild(div);
      });
    });
}

// Пошук
searchInput.addEventListener('input', loadProducts);

// Початкове завантаження
loadProducts();
