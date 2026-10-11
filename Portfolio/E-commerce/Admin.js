const SUPABASE_URL = 'https://sklpligxxqxtzspsckkd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_3mRZpbIXAzxvFVuA3U3AQw_va68UOMh';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let allOrders = [];
let allProducts = [];
let allCustomers = [];

function checkAuth() {
    const admin = sessionStorage.getItem('neonForgeAdmin');
    if (!admin) {
        location.href = 'index.html';
        return null;
    }
    try { return JSON.parse(admin); }
    catch (e) { location.href = 'index.html'; return null; }
}

document.getElementById('logout-btn').addEventListener('click', function() {
    if (confirm('Logout from admin console?')) {
        sessionStorage.removeItem('neonForgeAdmin');
        location.href = 'index.html';
    }
});

document.querySelectorAll('.admin-nav-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
        this.classList.add('active');
        document.getElementById(`view-${this.dataset.view}`).classList.add('active');
    });
});

async function loadDashboard() {
    await Promise.all([fetchOrders(), fetchProducts()]);
    computeCustomers();
    renderOverview();
    renderOrders();
    renderProductsSold();
    renderCustomers();
    renderInventory();
}

async function fetchOrders() {
    try {
        const { data, error } = await supabaseClient
            .from('orders')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        allOrders = data || [];
    } catch (err) {
        console.error('Error fetching orders:', err);
        allOrders = [];
    }
}

async function fetchProducts() {
    try {
        const { data, error } = await supabaseClient
            .from('ecom')
            .select('*')
            .order('productid', { ascending: true });
        if (error) throw error;
        allProducts = data || [];
    } catch (err) {
        console.error('Error fetching products:', err);
        allProducts = [];
    }
}

function computeCustomers() {
    const map = new Map();
    allOrders.forEach(order => {
        const key = order.customer_email || order.customer_phone || order.customer_name;
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, {
                name: order.customer_name,
                email: order.customer_email,
                phone: order.customer_phone,
                orders: 0,
                totalSpent: 0,
                lastOrder: order.created_at
            });
        }
        const c = map.get(key);
        c.orders += 1;
        c.totalSpent += Number(order.total) || 0;
        if (new Date(order.created_at) > new Date(c.lastOrder)) c.lastOrder = order.created_at;
        if (order.customer_name) c.name = order.customer_name;
        if (order.customer_phone) c.phone = order.customer_phone;
    });
    allCustomers = Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
}

function renderOverview() {
    const totalRevenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const totalItems = allOrders.reduce((sum, o) => {
        if (Array.isArray(o.items)) return sum + o.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
        return sum;
    }, 0);
    document.getElementById('stat-revenue').textContent = `₱${totalRevenue.toLocaleString()}`;
    document.getElementById('stat-orders').textContent = allOrders.length;
    document.getElementById('stat-customers').textContent = allCustomers.length;
    document.getElementById('stat-items').textContent = totalItems;

    const recentEl = document.getElementById('recent-orders');
    const recent = allOrders.slice(0, 5);
    if (recent.length === 0) {
        recentEl.innerHTML = '<div class="mini-empty"><i class="fas fa-inbox"></i> No orders yet</div>';
    } else {
        recentEl.innerHTML = recent.map(o => `
            <div class="mini-item">
                <div class="mini-left">
                    <strong>${o.customer_name || 'Guest'}</strong>
                    <small>${o.receipt_no}</small>
                </div>
                <div class="mini-right">₱${Number(o.total).toLocaleString()}</div>
            </div>
        `).join('');
    }

    const productStats = computeProductStats();
    const topEl = document.getElementById('top-products');
    const top = productStats.slice(0, 5);
    if (top.length === 0) {
        topEl.innerHTML = '<div class="mini-empty"><i class="fas fa-box-open"></i> No sales yet</div>';
    } else {
        topEl.innerHTML = top.map(p => `
            <div class="mini-item pink-border">
                <div class="mini-left">
                    <strong>${p.name}</strong>
                    <small>${p.units} units sold</small>
                </div>
                <div class="mini-right">₱${p.revenue.toLocaleString()}</div>
            </div>
        `).join('');
    }
}

function computeProductStats() {
    const map = new Map();
    allOrders.forEach(order => {
        if (!Array.isArray(order.items)) return;
        order.items.forEach(item => {
            const key = item.productname;
            if (!map.has(key)) map.set(key, { name: key, units: 0, revenue: 0 });
            const p = map.get(key);
            p.units += Number(item.quantity) || 0;
            p.revenue += (Number(item.productprice) || 0) * (Number(item.quantity) || 0);
        });
    });
    return Array.from(map.values()).sort((a, b) => b.units - a.units);
}

function renderOrders(filter = '') {
    const tbody = document.getElementById('orders-tbody');
    const statusFilter = document.getElementById('order-status-filter').value;
    const search = filter.toLowerCase();
    let filtered = allOrders;
    if (statusFilter !== 'all') filtered = filtered.filter(o => o.status === statusFilter);
    if (search) {
        filtered = filtered.filter(o =>
            (o.receipt_no || '').toLowerCase().includes(search) ||
            (o.customer_name || '').toLowerCase().includes(search) ||
            (o.customer_email || '').toLowerCase().includes(search)
        );
    }
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="table-empty"><i class="fas fa-inbox"></i>No orders found</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(order => {
        const date = new Date(order.created_at).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const itemCount = Array.isArray(order.items)
            ? order.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : 0;
        const badgeClass = order.status === 'paid' ? 'badge-paid' : 'badge-pending';
        return `
            <tr>
                <td class="receipt-cell">${order.receipt_no}</td>
                <td>${date}</td>
                <td>${order.customer_name || '—'}<br><small style="color:#7ec8e0;font-size:0.7rem;">${order.customer_email || ''}</small></td>
                <td>${order.payment_method || '—'}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td class="price-cell">₱${Number(order.total).toLocaleString()}</td>
                <td><span class="badge ${badgeClass}">${order.status}</span></td>
                <td><button class="action-btn" onclick="viewOrderDetail('${order.receipt_no}')"><i class="fas fa-eye"></i> View</button></td>
            </tr>
        `;
    }).join('');
}

function renderProductsSold() {
    const tbody = document.getElementById('products-tbody');
    const stats = computeProductStats();
    if (stats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" class="table-empty"><i class="fas fa-box-open"></i>No products sold yet</td></tr>`;
        return;
    }
    tbody.innerHTML = stats.map(p => {
        const avg = p.units > 0 ? Math.round(p.revenue / p.units) : 0;
        return `
            <tr>
                <td><strong>${p.name}</strong></td>
                <td class="price-cell">${p.units}</td>
                <td class="price-cell">₱${p.revenue.toLocaleString()}</td>
                <td class="price-cell">₱${avg.toLocaleString()}</td>
            </tr>
        `;
    }).join('');
}

function renderCustomers(filter = '') {
    const tbody = document.getElementById('customers-tbody');
    const search = filter.toLowerCase();
    let filtered = allCustomers;
    if (search) {
        filtered = filtered.filter(c =>
            (c.name || '').toLowerCase().includes(search) ||
            (c.email || '').toLowerCase().includes(search) ||
            (c.phone || '').toLowerCase().includes(search)
        );
    }
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty"><i class="fas fa-users"></i>No customers found</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(c => {
        const lastDate = new Date(c.lastOrder).toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        return `
            <tr>
                <td><strong>${c.name || '—'}</strong></td>
                <td>${c.email || '—'}</td>
                <td>${c.phone || '—'}</td>
                <td class="price-cell">${c.orders}</td>
                <td class="price-cell">₱${c.totalSpent.toLocaleString()}</td>
                <td>${lastDate}</td>
            </tr>
        `;
    }).join('');
}

function renderInventory() {
    const tbody = document.getElementById('inventory-tbody');
    if (allProducts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="table-empty"><i class="fas fa-warehouse"></i>No products in inventory</td></tr>`;
        return;
    }
    tbody.innerHTML = allProducts.map(p => {
        const stock = Number(p.productquantity) || 0;
        let stockBadge = 'badge-ok';
        let stockLabel = 'In Stock';
        if (stock === 0) { stockBadge = 'badge-low'; stockLabel = 'Out of Stock'; }
        else if (stock < 10) { stockBadge = 'badge-pending'; stockLabel = 'Low Stock'; }
        return `
            <tr>
                <td><strong>${p.productname}</strong></td>
                <td>${p.category || '—'}</td>
                <td class="price-cell">₱${Number(p.productprice).toLocaleString()}</td>
                <td>${stock}</td>
                <td><span class="badge ${stockBadge}">${stockLabel}</span></td>
                <td><button class="action-btn" onclick="openEditProduct(${p.productid})"><i class="fas fa-pen"></i> Edit</button></td>
            </tr>
        `;
    }).join('');
}

function openEditProduct(productId) {
    const product = allProducts.find(p => String(p.productid) === String(productId));
    if (!product) return;

    document.getElementById('edit-product-id').value = product.productid;
    document.getElementById('edit-product-name').value = product.productname || '';
    document.getElementById('edit-product-category').value = product.category || '';
    document.getElementById('edit-product-price').value = Number(product.productprice) || 0;
    document.getElementById('edit-product-stock').value = Number(product.productquantity) || 0;
    document.getElementById('edit-product-error').textContent = '';

    const datalist = document.getElementById('category-options');
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];
    datalist.innerHTML = categories.map(c => `<option value="${c}"></option>`).join('');

    document.getElementById('edit-product-modal').classList.add('active');
}

function closeEditProduct() {
    document.getElementById('edit-product-modal').classList.remove('active');
}

async function saveEditProduct(e) {
    e.preventDefault();
    const id = document.getElementById('edit-product-id').value;
    const name = document.getElementById('edit-product-name').value.trim();
    const category = document.getElementById('edit-product-category').value.trim();
    const price = Number(document.getElementById('edit-product-price').value);
    const stock = Number(document.getElementById('edit-product-stock').value);
    const errorEl = document.getElementById('edit-product-error');
    const saveBtn = document.getElementById('edit-product-save');

    errorEl.textContent = '';

    if (!name) { errorEl.textContent = 'Product name is required.'; return; }
    if (!Number.isFinite(price) || price < 0) { errorEl.textContent = 'Enter a valid price.'; return; }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) { errorEl.textContent = 'Enter a valid whole-number stock.'; return; }

    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const { error } = await supabaseClient
            .from('ecom')
            .update({
                productname: name,
                category: category || null,
                productprice: price,
                productquantity: stock
            })
            .eq('productid', id);
        if (error) throw error;

        const product = allProducts.find(p => String(p.productid) === String(id));
        if (product) {
            product.productname = name;
            product.category = category || null;
            product.productprice = price;
            product.productquantity = stock;
        }
        closeEditProduct();
        renderInventory();
    } catch (err) {
        console.error('Error updating product:', err);
        errorEl.textContent = 'Failed to save changes. Please try again.';
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="fas fa-floppy-disk"></i> Save Changes';
    }
}

function viewOrderDetail(receiptNo) {
    const order = allOrders.find(o => o.receipt_no === receiptNo);
    if (!order) return;
    const date = new Date(order.created_at).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
    const itemsHtml = Array.isArray(order.items) ? order.items.map(item => `
        <div class="detail-item-row">
            <span>${item.productname} × ${item.quantity}</span>
            <span>₱${(Number(item.productprice) * Number(item.quantity)).toLocaleString()}</span>
        </div>
    `).join('') : '';
    let addressHtml = '';
    if (order.payment_method === 'Cash on Delivery' && order.payment_details?.delivery_address) {
        const a = order.payment_details.delivery_address;
        addressHtml = `
            <div class="detail-address">
                <h4><i class="fas fa-map-marker-alt"></i> DELIVERY ADDRESS (COD)</h4>
                <p><strong>${order.customer_name}</strong> · ${order.customer_phone}</p>
                <p>${a.street}, ${a.city}, ${a.province} ${a.zip}</p>
                ${a.landmark ? `<p><em>Landmark: ${a.landmark}</em></p>` : ''}
                ${a.notes ? `<p><em>Notes: ${a.notes}</em></p>` : ''}
            </div>
        `;
    }
    document.getElementById('order-detail-content').innerHTML = `
        <div class="detail-header"><i class="fas fa-receipt"></i> ${order.receipt_no}</div>
        <div class="detail-grid">
            <div class="detail-item"><span>Customer</span><strong>${order.customer_name || '—'}</strong></div>
            <div class="detail-item"><span>Date</span><strong>${date}</strong></div>
            <div class="detail-item"><span>Email</span><strong>${order.customer_email || '—'}</strong></div>
            <div class="detail-item"><span>Phone</span><strong>${order.customer_phone || '—'}</strong></div>
            <div class="detail-item"><span>Payment</span><strong>${order.payment_method || '—'}</strong></div>
            <div class="detail-item"><span>Status</span><strong>${(order.status || '').toUpperCase()}</strong></div>
        </div>
        ${addressHtml}
        <div class="detail-items-list">
            <h4><i class="fas fa-box"></i> ITEMS PURCHASED</h4>
            ${itemsHtml}
        </div>
        <div class="detail-total">
            <span>TOTAL</span>
            <span>₱${Number(order.total).toLocaleString()}</span>
        </div>
    `;
    document.getElementById('order-detail-modal').classList.add('active');
}

function closeOrderDetail() {
    document.getElementById('order-detail-modal').classList.remove('active');
}

document.getElementById('order-search')?.addEventListener('input', function() {
    renderOrders(this.value);
});
document.getElementById('order-status-filter')?.addEventListener('change', function() {
    renderOrders(document.getElementById('order-search').value);
});
document.getElementById('customer-search')?.addEventListener('input', function() {
    renderCustomers(this.value);
});
document.getElementById('order-detail-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeOrderDetail();
});
document.getElementById('edit-product-form')?.addEventListener('submit', saveEditProduct);
document.getElementById('edit-product-modal')?.addEventListener('click', function(e) {
    if (e.target === this) closeEditProduct();
});

function updateClock() {
    const el = document.getElementById('live-clock');
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleString('en-PH', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}
setInterval(updateClock, 1000);
updateClock();

window.onload = function() {
    const admin = checkAuth();
    if (!admin) return;
    document.getElementById('admin-name').textContent = admin.full_name || admin.email;
    loadDashboard();
};