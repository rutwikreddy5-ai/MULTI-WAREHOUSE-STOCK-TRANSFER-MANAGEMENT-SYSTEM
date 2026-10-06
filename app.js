const API = '/api';
const state = { warehouses: [], products: [] };

// ---------- helpers ----------
const $ = (sel, root = document) => root.querySelector(sel);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '₹' + Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (d) => new Date(d).toLocaleString();

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

let toastTimer;
function toast(msg, isError = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

async function guard(fn) {
  try { await fn(); } catch (e) { toast(e.message, true); }
}

function fillSelect(select, items, valueKey, labelFn, placeholder) {
  select.innerHTML =
    (placeholder ? `<option value="">${esc(placeholder)}</option>` : '') +
    items.map((i) => `<option value="${i[valueKey]}">${esc(labelFn(i))}</option>`).join('');
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

// ---------- tabs ----------
$('#tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-tab]');
  if (!btn) return;
  showTab(btn.dataset.tab);
});

function showTab(name) {
  document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((s) => s.classList.toggle('hidden', s.id !== name));
  guard(loaders[name]);
}

document.addEventListener('click', (e) => {
  const reset = e.target.closest('[data-reset]');
  if (reset) $('#' + reset.dataset.reset).reset();
});

// ---------- reference data ----------
async function loadRefs() {
  [state.warehouses, state.products] = await Promise.all([api('/warehouses'), api('/products')]);
}

// ---------- dashboard ----------
async function loadDashboard() {
  const d = await api('/dashboard');
  const cards = [
    ['Warehouses', d.warehouses], ['Products', d.products], ['Total units', Number(d.total_units).toLocaleString()],
    ['Inventory value', money(d.inventory_value)], ['Transfers', d.transfers],
  ];
  $('#statCards').innerHTML = cards.map(([l, v]) => `<div class="card"><div class="label">${l}</div><div class="value">${esc(v)}</div></div>`).join('');
  $('#lowStockTable tbody').innerHTML = d.lowStock.length
    ? d.lowStock.map((r) => `<tr><td>${esc(r.warehouse_name)}</td><td>${esc(r.product_name)}</td><td>${r.quantity}</td></tr>`).join('')
    : '<tr><td colspan="3" class="empty">Nothing is running low.</td></tr>';
}

// ---------- warehouses ----------
async function loadWarehouses() {
  await loadRefs();
  $('#warehouseTable tbody').innerHTML = state.warehouses.length
    ? state.warehouses.map((w) => `<tr>
        <td>${w.warehouse_id}</td><td>${esc(w.name)}</td><td>${esc(w.location)}</td>
        <td>${w.capacity}</td><td>${w.total_items}</td>
        <td class="actions"><button class="small secondary" data-edit-wh="${w.warehouse_id}">Edit</button>
        <button class="small danger" data-del-wh="${w.warehouse_id}">Delete</button></td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">No warehouses yet.</td></tr>';
}

$('#warehouseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  guard(async () => {
    const f = formData(e.target);
    const body = { name: f.name, location: f.location, capacity: f.capacity };
    if (f.warehouse_id) await api(`/warehouses/${f.warehouse_id}`, { method: 'PUT', body });
    else await api('/warehouses', { method: 'POST', body });
    e.target.reset();
    toast('Warehouse saved');
    await loadWarehouses();
  });
});

$('#warehouseTable').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit-wh]');
  const del = e.target.closest('[data-del-wh]');
  if (edit) {
    const w = state.warehouses.find((x) => x.warehouse_id == edit.dataset.editWh);
    const f = $('#warehouseForm');
    f.warehouse_id.value = w.warehouse_id; f.name.value = w.name; f.location.value = w.location; f.capacity.value = w.capacity;
  }
  if (del && confirm('Delete this warehouse and its stock records?')) {
    guard(async () => { await api(`/warehouses/${del.dataset.delWh}`, { method: 'DELETE' }); toast('Warehouse deleted'); await loadWarehouses(); });
  }
});

// ---------- products ----------
async function loadProducts() {
  await loadRefs();
  $('#productTable tbody').innerHTML = state.products.length
    ? state.products.map((p) => `<tr>
        <td>${p.product_id}</td><td>${esc(p.sku)}</td><td>${esc(p.name)}</td><td>${esc(p.category)}</td>
        <td>${money(p.unit_price)}</td><td>${p.total_stock}</td>
        <td class="actions"><button class="small secondary" data-edit-pr="${p.product_id}">Edit</button>
        <button class="small danger" data-del-pr="${p.product_id}">Delete</button></td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">No products yet.</td></tr>';
}

$('#productForm').addEventListener('submit', (e) => {
  e.preventDefault();
  guard(async () => {
    const f = formData(e.target);
    const body = { sku: f.sku, name: f.name, category: f.category, unit_price: f.unit_price };
    if (f.product_id) await api(`/products/${f.product_id}`, { method: 'PUT', body });
    else await api('/products', { method: 'POST', body });
    e.target.reset();
    toast('Product saved');
    await loadProducts();
  });
});

$('#productTable').addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit-pr]');
  const del = e.target.closest('[data-del-pr]');
  if (edit) {
    const p = state.products.find((x) => x.product_id == edit.dataset.editPr);
    const f = $('#productForm');
    f.product_id.value = p.product_id; f.sku.value = p.sku; f.name.value = p.name; f.category.value = p.category || ''; f.unit_price.value = p.unit_price;
  }
  if (del && confirm('Delete this product and its stock records?')) {
    guard(async () => { await api(`/products/${del.dataset.delPr}`, { method: 'DELETE' }); toast('Product deleted'); await loadProducts(); });
  }
});

// ---------- stock ----------
async function loadStock() {
  await loadRefs();
  const form = $('#stockForm');
  fillSelect(form.warehouse_id, state.warehouses, 'warehouse_id', (w) => w.name, 'Warehouse…');
  fillSelect(form.product_id, state.products, 'product_id', (p) => `${p.sku} – ${p.name}`, 'Product…');
  const filter = $('#stockFilter');
  const current = filter.value;
  fillSelect(filter, state.warehouses, 'warehouse_id', (w) => w.name, 'All warehouses');
  filter.value = current;
  await renderStock();
}

async function renderStock() {
  const wh = $('#stockFilter').value;
  const rows = await api('/stock' + (wh ? `?warehouse_id=${wh}` : ''));
  $('#stockTable tbody').innerHTML = rows.length
    ? rows.map((s) => `<tr>
        <td>${esc(s.warehouse_name)}</td><td>${esc(s.sku)}</td><td>${esc(s.product_name)}</td>
        <td>${s.quantity}</td><td>${when(s.updated_at)}</td>
        <td class="actions"><button class="small secondary" data-set-stock="${s.stock_id}" data-qty="${s.quantity}">Set qty</button>
        <button class="small danger" data-del-stock="${s.stock_id}">Remove</button></td></tr>`).join('')
    : '<tr><td colspan="6" class="empty">No stock records.</td></tr>';
}

$('#stockFilter').addEventListener('change', () => guard(renderStock));

$('#stockForm').addEventListener('submit', (e) => {
  e.preventDefault();
  guard(async () => {
    await api('/stock', { method: 'POST', body: formData(e.target) });
    e.target.quantity.value = '';
    toast('Stock added');
    await renderStock();
  });
});

$('#stockTable').addEventListener('click', (e) => {
  const set = e.target.closest('[data-set-stock]');
  const del = e.target.closest('[data-del-stock]');
  if (set) {
    const input = prompt('Set exact quantity:', set.dataset.qty);
    if (input === null) return;
    guard(async () => { await api(`/stock/${set.dataset.setStock}`, { method: 'PUT', body: { quantity: input } }); toast('Quantity updated'); await renderStock(); });
  }
  if (del && confirm('Remove this stock record?')) {
    guard(async () => { await api(`/stock/${del.dataset.delStock}`, { method: 'DELETE' }); toast('Stock record removed'); await renderStock(); });
  }
});

// ---------- transfers ----------
function addItemRow() {
  const row = document.createElement('div');
  row.className = 'item-row';
  row.innerHTML = `<select class="item-product" required></select>
    <input class="item-qty" type="number" min="1" placeholder="Quantity" required>
    <button type="button" class="small danger">✕</button>`;
  fillSelect($('.item-product', row), state.products, 'product_id', (p) => `${p.sku} – ${p.name}`, 'Product…');
  $('button', row).addEventListener('click', () => row.remove());
  $('#transferItems').appendChild(row);
}

$('#addItemBtn').addEventListener('click', addItemRow);

async function loadTransfers() {
  await loadRefs();
  const form = $('#transferForm');
  fillSelect(form.from_warehouse_id, state.warehouses, 'warehouse_id', (w) => w.name, 'Select…');
  fillSelect(form.to_warehouse_id, state.warehouses, 'warehouse_id', (w) => w.name, 'Select…');
  $('#transferItems').innerHTML = '';
  addItemRow();
  const rows = await api('/transfers');
  $('#transferTable tbody').innerHTML = rows.length
    ? rows.map((t) => `<tr>
        <td>${t.transfer_id}</td><td>${when(t.transfer_date)}</td><td>${esc(t.from_warehouse)}</td><td>${esc(t.to_warehouse)}</td>
        <td>${t.items.map((i) => `${esc(i.product_name)} × ${i.quantity}`).join('<br>')}</td>
        <td><span class="pill">${esc(t.status)}</span></td><td>${esc(t.remarks)}</td></tr>`).join('')
    : '<tr><td colspan="7" class="empty">No transfers yet.</td></tr>';
}

$('#transferForm').addEventListener('submit', (e) => {
  e.preventDefault();
  guard(async () => {
    const f = e.target;
    const items = [...document.querySelectorAll('.item-row')].map((r) => ({
      product_id: $('.item-product', r).value,
      quantity: $('.item-qty', r).value,
    }));
    await api('/transfers', {
      method: 'POST',
      body: { from_warehouse_id: f.from_warehouse_id.value, to_warehouse_id: f.to_warehouse_id.value, remarks: f.remarks.value, items },
    });
    f.reset();
    toast('Transfer completed');
    await loadTransfers();
  });
});

// ---------- boot ----------
const loaders = { dashboard: loadDashboard, warehouses: loadWarehouses, products: loadProducts, stock: loadStock, transfers: loadTransfers };

(async function init() {
  const badge = $('#dbBadge');
  try {
    const h = await api('/health');
    badge.textContent = `MySQL: ${h.database}`;
    badge.classList.add('ok');
  } catch (e) {
    badge.textContent = 'Database unreachable';
    badge.classList.add('err');
  }
  guard(loadDashboard);
})();
